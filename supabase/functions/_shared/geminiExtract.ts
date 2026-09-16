const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!
const GEMINI_MODEL = "gemini-3.6-flash"

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    documentType: { type: "string", enum: ["invoice", "bill_of_lading", "packing_list", "other"] },
    shipper: { type: "string", nullable: true },
    consignee: { type: "string", nullable: true },
    referenceNumber: { type: "string", nullable: true },
    invoiceNumber: { type: "string", nullable: true },
    totalAmount: { type: "number", nullable: true },
    currency: { type: "string", nullable: true },
    weight: { type: "number", nullable: true },
    weightUnit: { type: "string", nullable: true },
    shipDate: { type: "string", nullable: true },
    eta: { type: "string", nullable: true },
    confidence: { type: "number" },
  },
  required: ["documentType", "confidence"],
}

export async function extractWithGemini(base64File: string, mimeType: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "You are extracting structured data from a logistics document (invoice, bill of lading, or packing list). Return only the fields you can find; use null for anything missing. Set 'confidence' to your honest certainty (0 to 1) about the overall extraction quality.",
              },
              { inlineData: { mimeType, data: base64File } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    },
  )

  const result = await response.json()
  const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text

  if (!rawJson) throw new Error("Gemini returned no extractable content")

  return JSON.parse(rawJson)
}