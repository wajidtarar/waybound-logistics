import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!

export async function sendShipmentAlert(
  supabase: SupabaseClient,
  params: {
    shipmentId: string
    userId: string
    userEmail: string
    trackingNumber: string
    oldStatus: string | null
    newStatus: string | null
    oldEta: string | null
    newEta: string | null
  },
) {
  const { shipmentId, userId, userEmail, trackingNumber, oldStatus, newStatus, oldEta, newEta } = params

  const statusChanged = oldStatus !== newStatus
  const etaChanged = oldEta !== newEta

  let message = `Shipment ${trackingNumber}: `
  if (statusChanged) message += `status changed from "${oldStatus}" to "${newStatus}". `
  if (etaChanged) message += `ETA changed from ${oldEta ?? "unknown"} to ${newEta ?? "unknown"}. `

  // Save the in-app alert
  await supabase.from("alerts").insert({
    shipment_id: shipmentId,
    user_id: userId,
    type: statusChanged ? "status_change" : "eta_change",
    message,
  })

  // Send the email
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Waybound <onboarding@resend.dev>",
      to: userEmail,
      subject: `Shipment update: ${trackingNumber}`,
      html: `<p>${message}</p>`,
    }),
  })
}