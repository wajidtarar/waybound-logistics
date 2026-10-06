import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { syncShipmentTracking } from "../_shared/syncTracking.ts"
import { sendShipmentAlert } from "../_shared/sendAlert.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Only sync shipments that have a tracking number and aren't already finished
    const { data: shipments, error } = await supabase
      .from("shipments")
      .select("id, user_id, tracking_number, status")
      .not("tracking_number", "is", null)
      .neq("status", "Delivered")

    if (error) throw error

    const summary = []

    for (const shipment of shipments ?? []) {
      try {
        const result = await syncShipmentTracking(supabase, shipment.id)

        if (result.changed) {
          // Look up the user's email to send the alert to
          const { data: userData } = await supabase.auth.admin.getUserById(shipment.user_id)
          const userEmail = userData?.user?.email

          if (userEmail) {
            await sendShipmentAlert(supabase, {
              shipmentId: shipment.id,
              userId: shipment.user_id,
              userEmail,
              trackingNumber: shipment.tracking_number,
              oldStatus: result.oldStatus,
              newStatus: result.newStatus,
              oldEta: result.oldEta,
              newEta: result.newEta,
            })
          }
        }

        summary.push({ shipmentId: shipment.id, changed: result.changed })
      } catch (err) {
        // One shipment failing (e.g. a stale/invalid tracking number)
        // shouldn't stop the rest of the batch from processing.
        summary.push({ shipmentId: shipment.id, error: (err as Error).message })
      }
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }
})