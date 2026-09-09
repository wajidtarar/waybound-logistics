import { supabase } from "./supabase"
import { extractionSchema, type ExtractedData } from "./extractionSchema"

export async function extractDocument(documentId: string): Promise<ExtractedData> {
  const { data, error } = await supabase.functions.invoke("extract-document", {
    body: { documentId },
  })

  if (error) throw error

  // Defense in depth: validate on the client too, even though the
  // Edge Function requested a strict schema from Gemini.
  return extractionSchema.parse(data.extracted)
}