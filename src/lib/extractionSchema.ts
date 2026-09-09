import { z } from "zod"

export const extractionSchema = z.object({
  documentType: z.enum(["invoice", "bill_of_lading", "packing_list", "other"]),
  shipper: z.string().nullable(),
  consignee: z.string().nullable(),
  referenceNumber: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  totalAmount: z.number().nullable(),
  currency: z.string().nullable(),
  weight: z.number().nullable(),
  weightUnit: z.string().nullable(),
  shipDate: z.string().nullable(),
  eta: z.string().nullable(),
  confidence: z.number().min(0).max(1),
})

export type ExtractedData = z.infer<typeof extractionSchema>