// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
// import { withSupabase } from "@supabase/server";

console.log("Hello from Functions!");


import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    documentType: { type: "string", enum: ["invoice", "bill_of_lading", "packing_list", "other"] },
    shipper: { type: "string", nullable: true },
    consignee: { type: "string", nullable: true },
    referenceNumber: { type: "string", nullable: true },
    invoiceNumber: { type: "string", nullable: true },
    totalAmount: { type: "number", nullable: true },
    currency: { type: "string", nullable: true },
    weight: { type: "number", nullable: true },
    weightUnit: { type: "string", nullable: true },
    shipDate: { type: "string", nullable: true },
    eta: { type: "string", nullable: true },
    confidence: { type: "number" },
  },
  required: ["documentType", "confidence"],
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const body = await req.json()
    console.log("Full request body:", body)
    const { documentId } = body
    console.log("documentId received:", documentId, typeof documentId)

    // TODO(security): using service role key bypasses RLS — this function does
// not yet verify the calling user owns the document. Deferred to Phase 9.
// Fix: swap to SUPABASE_ANON_KEY + forwarded Authorization header (see
// Phase 4 guide for the ready-to-use version).

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single()

    console.log("Query result — document:", document, "error:", docError)

    if (docError || !document) {
      throw new Error("Document not found")
    }

    // 2. Download the file from Storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("documents")
      .download(document.file_path)

    if (downloadError || !fileBlob) throw new Error("Could not download file")

    const arrayBuffer = await fileBlob.arrayBuffer()
    const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    const mimeType = fileBlob.type || "application/pdf"

    // 3. Call Gemini with the file + extraction instructions

    


    const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: "You are extracting structured data..." },
                { inlineData: { mimeType, data: base64File } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    )

    console.log("Gemini HTTP status:", geminiResponse.status)

    const geminiResult = await geminiResponse.json()
    console.log("Gemini full response:", JSON.stringify(geminiResult))

    const rawJson = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawJson) throw new Error("Gemini returned no extractable content")



    const extracted = JSON.parse(rawJson)

    // 4. Save the extracted data back to the documents table
    const { error: updateError } = await supabase
      .from("documents")
      .update({ extracted_data: extracted })
      .eq("id", documentId)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})