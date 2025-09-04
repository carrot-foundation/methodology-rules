import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { type NonEmptyString } from '@carrot-fndn/shared/types';

const { RECYCLING_MANIFEST, TRANSPORT_MANIFEST } = DocumentEventName;

export type DocumentManifestType =
  | typeof RECYCLING_MANIFEST
  | typeof TRANSPORT_MANIFEST;

export const RECYCLING_MANIFEST_AI_CONTEXT: NonEmptyString = `You are analyzing a document that should be a waste final destination certificate. Look for these core indicators:

DOCUMENT PURPOSE:
- Certificate/certification language in title or header
- References to waste disposal, treatment, or final destination
- Official document numbering system
- Formal attestation or confirmation statements

ENTITY RELATIONSHIPS:
- Two distinct entities: waste generator and waste receiver/processor
- Complete business identification (addresses, tax IDs, registration numbers)
- Environmental permits, licenses, or regulatory compliance references
- Treatment facility credentials or certifications

WASTE TRACKING DATA:
- Specific waste categories or classification codes
- Quantitative data (weights, volumes, units processed)
- Date ranges or specific collection/processing dates
- Systematic recording of waste flows

REGULATORY FRAMEWORK:
- Environmental authority references or permit numbers
- Compliance statements with local/national regulations
- Legal treatment method descriptions
- Chain of custody documentation elements

AUTHENTICATION:
- Digital signatures, codes, or physical signatures
- Official seals, stamps, or letterheads
- Verification mechanisms or tracking numbers
- Formal document structure with contact information

QUANTITY ANALYSIS CONSIDERATIONS:
- These certificates typically represent entire waste groups identified by MassID references
- Individual MassID values being analyzed may not match the total quantities shown in the certificate
- A single MassID weight often represents only a fraction of the total quantities documented
- The certificate serves as proof of proper disposal for multiple related waste batches
- Cross-reference MassID values as partial components of larger waste treatment operations

QUANTITY VALIDATION FOR CERTIFICATES:
- Certificates often aggregate quantities from multiple MassID batches
- When validating quantities, accept that certificate totals will typically be larger than individual MassID values
- A certificate total that exceeds the JSON MassID currentValue is valid if the certificate represents grouped waste processing
- Only mark quantity fields as invalid if the JSON MassID value exceeds the certificate total, or if units are incompatible
`;

export const TRANSPORT_MANIFEST_AI_CONTEXT: NonEmptyString = `You are analyzing a document that should be a waste transport manifest. Look for these core indicators:

DOCUMENT PURPOSE:
- "Manifest" or "Manifesto" in title with transport/transportation references
- Transport documentation numbering (MTR numbers, manifest IDs)
- Movement or logistics-focused language rather than treatment confirmation
- Transit authorization or shipping documentation format

ENTITY RELATIONSHIPS:
- Three distinct entities: waste generator, transporter, and receiver/destination
- Transportation company identification with vehicle details
- Driver information and transportation credentials
- Logistics chain documentation (pickup, transport, delivery)

TRANSPORT LOGISTICS DATA:
- Vehicle identification (license plates, truck numbers)
- Transport dates and scheduling information
- Driver names and identification
- Route or transportation method details
- Packaging and transport safety certifications

WASTE MOVEMENT TRACKING:
- Waste quantities being transported (not processed)
- Waste classification codes for transport purposes
- Packaging and containment specifications for transit
- Loading and transport safety compliance statements

REGULATORY FRAMEWORK:
- Transport permits and environmental agency oversight
- Movement authorization numbers
- Transit safety regulations compliance
- Chain of custody for transportation phase

DISTINCTIVE LANGUAGE:
- References to "transport," "movement," "shipment," or "transit"
- Focus on logistics rather than treatment or disposal
- Transportation safety and packaging requirements`;

export const AI_CONTEXT_PROMPTS: Record<DocumentManifestType, NonEmptyString> =
  {
    [RECYCLING_MANIFEST]: RECYCLING_MANIFEST_AI_CONTEXT,
    [TRANSPORT_MANIFEST]: TRANSPORT_MANIFEST_AI_CONTEXT,
  } as const;

export const getAiContextForDocumentType = (
  documentType: DocumentManifestType,
): NonEmptyString => AI_CONTEXT_PROMPTS[documentType];
