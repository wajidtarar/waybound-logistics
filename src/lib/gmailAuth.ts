export function connectGmail(userId: string) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI
  const scope = "https://www.googleapis.com/auth/gmail.readonly"

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    state: userId,
    access_type: "offline", // required to receive a refresh token
    prompt: "consent",       // forces Google to re-issue a refresh token every time (useful while testing)
  })

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}