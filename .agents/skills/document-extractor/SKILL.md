---
name: document-extractor
description: Use when editing document parsers, layout matching, Textract results, blank-field detection or text-layer and OCR merging.
---

# Develop document extraction

- Keep `DocumentParser<T>` field-neutral. Return the fields the source supports and leave an
  unobserved value `undefined`. An explicitly blank printed field has its own representation in
  the extractor. Preserve the distinction between blank, unobserved and low-confidence fields.
- Keep required-field decisions in the rule processor. The extraction service derives
  `reviewRequired` from extraction signals, including low confidence, explicit blank observations
  and layout match strength. Use the shared constants and confidence helpers in
  `libs/shared/document-extractor/src/confidence.helpers.ts`.
- Layout identifiers use `NonEmptyString`. Add defaults only for stable, known layouts. Keep an
  experimental or frequently changing layout in the owning rule's configuration.
- Use the document-type packages under `libs/shared/document-extractor-*` for parser and layout
  implementations. Keep reusable layout, confidence and text-merging logic in the shared framework.
  Use `pnpm extract-document <args>` for local extraction and keep fixture inputs synthetic.
