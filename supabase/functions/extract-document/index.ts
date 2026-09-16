import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { extractWithGemini } from "../_shared/geminiExtract.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { documentId } = await req.json()

    // TODO(security): using service role key bypasses RLS — this function does
    // not yet verify the calling user owns the document. Deferred to Phase 9.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Look up the document row to find its storage path
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single()

    if (docError || !document) throw new Error("Document not found")

    // 2. Download the file from Storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("documents")
      .download(document.file_path)

    if (downloadError || !fileBlob) throw new Error("Could not download file")

    const arrayBuffer = await fileBlob.arrayBuffer()
    const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    const mimeType = fileBlob.type || "application/pdf"

    // 3. Extract structured data via the shared Gemini helper
    const extracted = await extractWithGemini(base64File, mimeType)

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