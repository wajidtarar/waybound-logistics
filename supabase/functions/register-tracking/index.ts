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

    // TODO(security): service role key bypasses RLS — same deferred
    // hardening as extract-document, tracked in KNOWN_GAPS.md.
    const supabase =  createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", shipmentId)
      .single()

    if (shipmentError || !shipment) throw new Error("Shipment not found")
    if (!shipment.tracking_number) throw new Error("Shipment has no tracking number set")

    const registerResponse = await fetch("https://api.17track.net/track/v2.4/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "17token": TRACK17_API_KEY,
      },
      body: JSON.stringify([
        {
          number: shipment.tracking_number,
          auto_detection: true, // let 17Track guess the carrier rather than requiring a carrier code up front
        },
      ]),
    })

    const registerResult = await registerResponse.json()
    console.log("17Track register response:", JSON.stringify(registerResult))

    return new Response(JSON.stringify({ result: registerResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})