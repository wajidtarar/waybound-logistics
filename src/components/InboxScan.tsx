import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ScanResult {
  emailId: string
  filename: string
  extracted: {
    documentType: string
    shipper: string | null
    consignee: string | null
    referenceNumber: string | null
    confidence: number
  }
}

export function InboxScan() {
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<ScanResult[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleScan() {
    setScanning(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke("scan-inbox")
      if (fnError) throw fnError
      setResults(data.results ?? [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleScan} disabled={scanning}>
        {scanning ? "Scanning inbox..." : "Scan Inbox"}
      </Button>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {results.map((result) => (
        <Card key={result.emailId + result.filename}>
          <CardHeader>
            <CardTitle className="text-base">{result.filename}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p>Type: {result.extracted.documentType}</p>
            <p>Shipper: {result.extracted.shipper ?? "—"}</p>
            <p>Consignee: {result.extracted.consignee ?? "—"}</p>
            <p>Reference #: {result.extracted.referenceNumber ?? "—"}</p>
            <p>Confidence: {Math.round(result.extracted.confidence * 100)}%</p>
            {/* Linking this to a real shipment record is a good next
                small feature once this base flow is confirmed working */}
          </CardContent>
        </Card>
      ))}

      {results.length === 0 && !scanning && (
        <p className="text-muted-foreground">No results yet — click "Scan Inbox" to check for shipment-related emails.</p>
      )}
    </div>
  )
}