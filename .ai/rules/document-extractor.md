---
id: document-extractor
intent: Enforce field-neutral parser design and layout conventions for the document extractor framework
scope:
  - "libs/shared/document-extractor/**/*.ts"
  - "libs/shared/text-extractor/**/*.ts"
requirements:
  - Design parsers (DocumentParser<T>) to be field-neutral; all extracted fields must be optional
  - Return `undefined` for fields the parser cannot extract rather than throwing or returning empty strings
  - Delegate required-field decisions to rule processors, never to parsers
  - Set `reviewRequired` only when field confidence is low or layout match score is below 0.5
  - Use the `NonEmptyString` type for `layoutId` and `layouts` values, casting string literals with `as NonEmptyString`
  - Add default layouts in `defaults.ts` only for document types with stable, well-known layouts
anti_patterns:
  - Making extracted fields required in a parser; parsers must never enforce field presence
  - Returning empty string `""` instead of `undefined` for missing fields
  - Setting `reviewRequired` based on business rules rather than extraction confidence
  - Adding layouts to `defaults.ts` for experimental or frequently changing document formats
  - Using plain `string` type where `NonEmptyString` is expected for layout identifiers
---

# Document Extractor Rule

## Rule body

The document extractor framework separates concerns between parsing (extracting fields from documents) and evaluation (deciding which fields matter). Parsers are deliberately field-neutral.

### Parser design

Parsers implement `DocumentParser<T>` and extract as many fields as possible without enforcing which ones are required:

```ts
import type { DocumentParser, NonEmptyString } from '@carrot-fndn/shared/document-extractor';

export class InvoiceParser implements DocumentParser<InvoiceFields> {
  parse(rawText: string, layoutId: NonEmptyString): Partial<InvoiceFields> {
    return {
      invoiceNumber: this.extractInvoiceNumber(rawText),  // string | undefined
      issueDate: this.extractDate(rawText),               // string | undefined
      totalAmount: this.extractAmount(rawText),            // number | undefined
    };
  }
}
```

Every field in the return type is optional. If extraction fails for a field, return `undefined`.

### Review required

The `reviewRequired` flag signals that a human should verify the extraction. It is triggered exclusively by extraction quality signals:

- A field was extracted with low confidence
- The layout match score is below 0.5

```ts
// Correct - confidence-based review trigger
const reviewRequired = matchScore < 0.5 || fields.some(f => f.confidence < THRESHOLD);

// Wrong - business rule in parser
const reviewRequired = !fields.totalAmount || fields.totalAmount < 100;
```

### Layout identifiers

Layout IDs and layout names use the `NonEmptyString` type. Cast string literals explicitly:

```ts
import type { NonEmptyString } from '@carrot-fndn/shared/document-extractor';

const LAYOUT_ID = 'invoice-standard-v2' as NonEmptyString;
```

### Default layouts

Only register default layouts in `defaults.ts` for document types that are stable and well-established. Experimental or rapidly evolving formats should be configured at the processor level instead.
