import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import type { Shipment, ShipmentEvent } from "@/types/shipment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { useAuth } from "@/lib/useAuth"
import { extractDocument } from "@/lib/extractDocument"
import type { ExtractedData } from "@/lib/extractionSchema"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

async function fetchShipmentWithEvents(id: string) {

  
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
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [latestDocumentId, setLatestDocumentId] = useState<string | null>(null)
  console.log("latestDocumentId:", latestDocumentId)

  const [extracting, setExtracting] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [extractError, setExtractError] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ["shipment", id],
    queryFn: () => fetchShipmentWithEvents(id!),
    enabled: !!id,
  })

  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const queryClient = useQueryClient()

  async function handleRegisterTracking() {
    if (!data?.shipment) return
    setSyncing(true)
    setSyncMessage(null)
    try {
      const { data: result, error } = await supabase.functions.invoke("register-tracking", {
        body: { shipmentId: data.shipment.id },
      })
      if (error) throw error
      setSyncMessage("Tracking registered — click Sync in a few minutes to pull the first update.")
    } catch (err) {
      setSyncMessage(`Registration failed: ${(err as Error).message}`)
    } finally {
      setSyncing(false)
    }
  }

  async function handleSyncTracking() {
    if (!data?.shipment) return
    setSyncing(true)
    setSyncMessage(null)
    try {
      const { data: result, error } = await supabase.functions.invoke("sync-tracking", {
        body: { shipmentId: data.shipment.id },
      })
      if (error) throw error
      setSyncMessage(`Synced — ${result.insertedCount} new event(s) found.`)
      queryClient.invalidateQueries({ queryKey: ["shipment", id] }) // refetch so the timeline updates
    } catch (err) {
      setSyncMessage(`Sync failed: ${(err as Error).message}`)
    } finally {
      setSyncing(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user || !data?.shipment) return

    setUploading(true)
    const filePath = `${user.id}/${data.shipment.id}/${file.name}`

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file)

    if (!uploadError) {
      const { data: insertedDoc, error: insertError } = await supabase
        .from("documents")
        .insert({
          shipment_id: data.shipment.id,
          file_path: filePath,
        })
        .select()
        .single()

      if (!insertError && insertedDoc) {
        setLatestDocumentId(insertedDoc.id)
      }
    }

    setUploading(false)
  }

  async function handleExtract(documentId: string) {
    setExtracting(true)
    setExtractError(null)
    try {
      const result = await extractDocument(documentId)
      setExtractedData(result)
    } catch (err) {
      setExtractError((err as Error).message)
    } finally {
      setExtracting(false)
    }
  }

  if (isLoading) return <p>Loading shipment...</p>
  if (error || !data) return <p className="text-red-500">Failed to load shipment.</p>

  const { shipment, events } = data

  return (
    <div className="p-6 space-y-6">



      <div className="flex gap-2">
        <Button onClick={handleRegisterTracking} disabled={syncing} variant="outline">
          Register Tracking
        </Button>
        <Button onClick={handleSyncTracking} disabled={syncing}>
          {syncing ? "Syncing..." : "Sync Tracking"}
        </Button>
      </div>
      {syncMessage && <p className="text-sm text-muted-foreground">{syncMessage}</p>}
      
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
        <input type="file" onChange={handleUpload} disabled={uploading} />
        {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
      </div>

      {latestDocumentId && (
        <Button onClick={() => handleExtract(latestDocumentId)} disabled={extracting}>
          {extracting ? "Extracting..." : "Extract Data"}
        </Button>
      )}

      {extractError && <p className="text-sm text-red-500">{extractError}</p>}

      {extractedData && (
        <div className="border rounded-lg p-4 space-y-2 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Extracted Data</h3>
            <Badge variant={extractedData.confidence < 0.7 ? "destructive" : "outline"}>
              Confidence: {Math.round(extractedData.confidence * 100)}%
            </Badge>
          </div>
          <p>Type: {extractedData.documentType}</p>
          <p>Shipper: {extractedData.shipper ?? "—"}</p>
          <p>Consignee: {extractedData.consignee ?? "—"}</p>
          <p>Reference #: {extractedData.referenceNumber ?? "—"}</p>
          <p>Weight: {extractedData.weight ? `${extractedData.weight} ${extractedData.weightUnit ?? ""}` : "—"}</p>
          <p>Amount: {extractedData.totalAmount ? `${extractedData.totalAmount} ${extractedData.currency ?? ""}` : "—"}</p>
          <p>Ship Date: {extractedData.shipDate ? new Date(extractedData.shipDate).toLocaleDateString() : "—"}</p>
          <p>ETA: {extractedData.eta ? new Date(extractedData.eta).toLocaleDateString() : "—"}</p>
          {extractedData.confidence < 0.7 && (
            <p className="text-sm text-amber-600">Low confidence — please verify these fields manually.</p>
          )}
        </div>
      )}

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
}