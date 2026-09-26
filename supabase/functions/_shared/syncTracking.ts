import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

const TRACK17_API_KEY = Deno.env.get("TRACK17_API_KEY")!

export interface SyncResult {
  insertedCount: number
  oldStatus: string | null
  newStatus: string | null
  oldEta: string | null
  newEta: string | null
  changed: boolean
}

export async function syncShipmentTracking(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<SyncResult> {
  const { data: shipment, error: shipmentError } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", shipmentId)
    .single()

  if (shipmentError || !shipment) throw new Error("Shipment not found")
  if (!shipment.tracking_number) throw new Error("Shipment has no tracking number set")

  const oldStatus = shipment.status
  const oldEta = shipment.eta

  const infoResponse = await fetch("https://api.17track.net/track/v2.4/gettrackinfo", {
    method: "POST",
    headers: { "Content-Type": "application/json", "17token": TRACK17_API_KEY },
    body: JSON.stringify([{ number: shipment.tracking_number }]),
  })

  const infoResult = await infoResponse.json()
  const trackInfo = infoResult?.data?.accepted?.[0]?.track_info
  if (!trackInfo) throw new Error("No tracking info returned")

  const providerEvents = trackInfo?.tracking?.providers?.[0]?.events ?? []

  let insertedCount = 0
  for (const event of providerEvents) {
    const { data: existing } = await supabase
      .from("events")
      .select("id")
      .eq("shipment_id", shipmentId)
      .eq("status", event.description ?? event.stage ?? "Update")
      .eq("occurred_at", event.time_iso ?? event.time_utc ?? null)
      .maybeSingle()

    if (existing) continue

    await supabase.from("events").insert({
      shipment_id: shipmentId,
      status: event.description ?? event.stage ?? "Update",
      location: event.location ?? null,
      occurred_at: event.time_iso ?? event.time_utc ?? null,
    })
    insertedCount++
  }

  const newStatus = trackInfo?.latest_status?.status ?? shipment.status
  const newEta = trackInfo?.time_metrics?.estimated_delivery_date?.from ?? null

  await supabase.from("shipments").update({ status: newStatus, eta: newEta }).eq("id", shipmentId)

  const changed = oldStatus !== newStatus || oldEta !== newEta

  return { insertedCount, oldStatus, newStatus, oldEta, newEta, changed }
}