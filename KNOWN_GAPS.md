# Known Gaps / Deferred Hardening

- **extract-document Edge Function** uses the Supabase service role key,
  bypassing RLS. It does not currently verify that the calling user owns
  the document before processing it. Deferred to Phase 9 (production
  readiness) — fix: switch to the anon key + forwarded user auth token,
  as RLS policies already support this (see Phase 4 guide, "ownership
  enforcement" section).
  
  
  - **Extraction confidence score is not a reliable low-quality signal in testing so far.**
  A phone photo of a printed document only dropped confidence from 0.98 to 0.92 —
  still above the 0.7 review threshold — even though a field (`eta`) that was
  correctly extracted from the clean scan came back `null` on the photo. Confidence
  alone may not catch missing/incorrect fields; consider adding field-level
  completeness checks (e.g., flag null `eta`/`shipDate` on bill_of_lading documents)
  as a cheaper, more direct signal than the model's self-reported confidence.



  with an "Extract" button next to each one individually — rather than only ever tracking "the latest." Worth a line in KNOWN_GAPS.md alongside the RLS one if you want to keep that file as your running list of deliberate simplifications.