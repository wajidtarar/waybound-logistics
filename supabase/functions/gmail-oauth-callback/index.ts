import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!
const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const APP_URL = "http://localhost:5173" // change to your deployed URL later

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const userId = url.searchParams.get("state") // we'll pass the user's ID as "state"

  if (!code || !userId) {
    return new Response("Missing code or state", { status: 400 })
  }

  // Exchange the authorization code for tokens
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  })

  const tokens = await tokenResponse.json()

  if (!tokens.refresh_token) {
    return new Response(
      "No refresh token received — try disconnecting the app at https://myaccount.google.com/permissions and reconnecting.",
      { status: 400 },
    )
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { error } = await supabase
    .from("email_connections")
    .upsert({ user_id: userId, refresh_token: tokens.refresh_token }, { onConflict: "user_id" })

  if (error) {
    return new Response(`Failed to save connection: ${error.message}`, { status: 500 })
  }

  return Response.redirect(`${APP_URL}/?gmail=connected`, 302)
})