export interface Shipment {
  id: string
  user_id: string
  carrier_id: string | null
  tracking_number: string | null
  status: string
  origin: string | null
  destination: string | null
  eta: string | null
  created_at: string
}

export interface ShipmentEvent {
  id: string
  shipment_id: string
  status: string
  location: string | null
  occurred_at: string | null
  created_at: string
}