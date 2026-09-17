import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const TRACK17_API_KEY = Deno.env.get("TRACK17_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { shipmentId } = await req.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", shipmentId)
      .single()

    if (shipmentError || !shipment) throw new Error("Shipment not found")
    if (!shipment.tracking_number) throw new Error("Shipment has no tracking number set")

    const infoResponse = await fetch("https://api.17track.net/track/v2.4/gettrackinfo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "17token": TRACK17_API_KEY,
      },
      body: JSON.stringify([{ number: shipment.tracking_number }]),
    })

    const infoResult = await infoResponse.json()
    console.log("17Track gettrackinfo response:", JSON.stringify(infoResult))

    const trackInfo = infoResult?.data?.accepted?.[0]?.track_info
    if (!trackInfo) {
      throw new Error("No tracking info returned — number may still be processing, try again shortly")
    }

    // NOTE: exact field names below are based on 17Track's documented v2.4
    // shape as of when this was written. APIs like this do change field
    // names occasionally — if this doesn't match, the console.log above
    // will show you the real shape to adjust against, the same way the
    // Phase 4 Gemini debugging worked.
    const providerEvents = trackInfo?.tracking?.providers?.[0]?.events ?? []

    let insertedCount = 0
    for (const event of providerEvents) {
      // Avoid inserting duplicate events on repeated syncs
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

    // Update shipment status + ETA if 17Track provides them
    const latestStatus = trackInfo?.latest_status?.status ?? shipment.status
    const estimatedDelivery = trackInfo?.time_metrics?.estimated_delivery_date?.from ?? null

    await supabase
      .from("shipments")
      .update({
        status: latestStatus,
        eta: estimatedDelivery,
      })
      .eq("id", shipmentId)

    return new Response(JSON.stringify({ insertedCount, latestStatus, estimatedDelivery }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})