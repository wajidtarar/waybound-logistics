import { useQuery } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import type { Shipment, ShipmentEvent } from "@/types/shipment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { useState } from "react"
import { useAuth } from "@/lib/useAuth"

import { Button } from "@/components/ui/button"


async function fetchShipmentWithEvents(id: string) {
    const { user } = useAuth()
    const [uploading, setUploading] = useState(false)

  const [{ data: shipment, error: shipmentError }, { data: events, error: eventsError }] =
    await Promise.all([
      supabase.from("shipments").select("*").eq("id", id).single(),
      supabase
        .from("events")
        .select("*")
        .eq("shipment_id", id)
        .order("occurred_at", { ascending: true }),
    ])

  if (shipmentError) throw shipmentError
  if (eventsError) throw eventsError

  return { shipment: shipment as Shipment, events: events as ShipmentEvent[] }
}

export function ShipmentDetail() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ["shipment", id],
    queryFn: () => fetchShipmentWithEvents(id!),
    enabled: !!id,
  })

  if (isLoading) return <p>Loading shipment...</p>
  if (error || !data) return <p className="text-red-500">Failed to load shipment.</p>

  const { shipment, events } = data

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{shipment.tracking_number ?? "Untitled shipment"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Status: {shipment.status}</p>
          <p>{shipment.origin} → {shipment.destination}</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-medium mb-2">Timeline</h2>
        {events.length === 0 ? (
          <p className="text-muted-foreground">No events yet — tracking integration comes in a later phase.</p>
        ) : (
          <ul className="border-l-2 pl-4 space-y-3">
            {events.map((event) => (
              <li key={event.id}>
                <p className="font-medium">{event.status}</p>
                <p className="text-sm text-muted-foreground">
                  {event.location} · {event.occurred_at ? new Date(event.occurred_at).toLocaleString() : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )



    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user || !shipment) return

    setUploading(true)
    const filePath = `${user.id}/${shipment.id}/${file.name}`

    const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file)

    if (!uploadError) {
        await supabase.from("documents").insert({
        shipment_id: shipment.id,
        file_path: filePath,
        })
    }

    setUploading(false)
    }

    // ...in the JSX, add near the Card:
    <div>
    <input type="file" onChange={handleUpload} disabled={uploading} />
    {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
</div>
}

