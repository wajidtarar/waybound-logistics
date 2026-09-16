import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { extractWithGemini } from "../_shared/geminiExtract.ts"

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

async function getAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  const data = await response.json()
  return data.access_token as string
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("Missing Authorization header")

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Identify the calling user from their JWT
    const jwt = authHeader.replace("Bearer ", "")
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !userData.user) throw new Error("Invalid session")

    const userId = userData.user.id

    // Get this user's stored Gmail connection
    const { data: connection, error: connError } = await supabase
      .from("email_connections")
      .select("refresh_token")
      .eq("user_id", userId)
      .single()

    if (connError || !connection) throw new Error("No Gmail connection found — connect Gmail first")

    const accessToken = await getAccessToken(connection.refresh_token)

    // Search for shipment-related emails with attachments, last 30 days
    const query = encodeURIComponent(
      'has:attachment newer_than:30d (invoice OR "bill of lading" OR shipment OR tracking OR packing list)',
    )
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=10`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    const listData = await listResponse.json()
    const messages = listData.messages ?? []

    const results = []

    for (const message of messages) {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      const msgData = await msgResponse.json()

      const attachmentPart = msgData.payload?.parts?.find(
        (p: any) => p.filename && p.body?.attachmentId,
      )
      if (!attachmentPart) continue

      const attachmentResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}/attachments/${attachmentPart.body.attachmentId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      const attachmentData = await attachmentResponse.json()

      // Gmail returns URL-safe base64 — convert to standard base64
      const base64File = attachmentData.data.replace(/-/g, "+").replace(/_/g, "/")
      const mimeType = attachmentPart.mimeType || "application/pdf"

      try {
        const extracted = await extractWithGemini(base64File, mimeType)
        results.push({
          emailId: message.id,
          filename: attachmentPart.filename,
          extracted,
        })
      } catch {
        // Skip attachments Gemini can't process (e.g. not actually a document)
        continue
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})