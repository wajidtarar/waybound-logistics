import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/useAuth"
import type { Shipment } from "@/types/shipment"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

async function fetchShipments(userId: string): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export function ShipmentList() {
  const { user } = useAuth()

  const { data: shipments, isLoading, error } = useQuery({
    queryKey: ["shipments", user?.id],
    queryFn: () => fetchShipments(user!.id),
    enabled: !!user,
  })

  if (isLoading) return <p>Loading shipments...</p>
  if (error) return <p className="text-red-500">Failed to load shipments.</p>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Shipments</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tracking #</TableHead>
            <TableHead>Origin</TableHead>
            <TableHead>Destination</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>ETA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments?.map((shipment) => (
            <TableRow key={shipment.id}>
              <TableCell>
                <Link to={`/shipments/${shipment.id}`} className="underline">
                  {shipment.tracking_number ?? "—"}
                </Link>
              </TableCell>
              <TableCell>{shipment.origin ?? "—"}</TableCell>
              <TableCell>{shipment.destination ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="outline">{shipment.status}</Badge>
              </TableCell>
              <TableCell>
                {shipment.eta ? new Date(shipment.eta).toLocaleDateString() : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}