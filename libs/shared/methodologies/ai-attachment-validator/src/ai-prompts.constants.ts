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
**CRITICAL - ALL THREE ENTITIES MUST BE PRESENT AND CLEARLY IDENTIFIED:**
- **Waste Generator**: Company generating the waste (razão social, CNPJ/tax ID, address, responsible person)
- **Transporter/Hauler**: Transportation company (razão social, CNPJ/tax ID, address, vehicle details, driver information)
- **Receiver/Processor**: Destination company (razão social, CNPJ/tax ID, address, receiving responsible person)

**MANDATORY TRANSPORT ENTITY VALIDATION:**
- Transportation company identification with complete credentials (name, tax ID, address)
- Vehicle details (license plates, truck numbers, vehicle type)
- Driver information and identification (name, credentials, contact)
- Logistics chain documentation showing clear handoff points (pickup, transport, delivery)

TRANSPORT LOGISTICS DATA:
- Vehicle identification (license plates, truck numbers)
- Transport dates and scheduling information
- Driver names and identification numbers
- Route or transportation method details
- Packaging and transport safety certifications
- Transport authorization signatures and timestamps

WASTE MOVEMENT TRACKING:
- Waste quantities being transported (not processed) with specific weights/volumes
- Waste classification codes for transport purposes (IBAMA codes, hazard classifications)
- Packaging and containment specifications for transit (containers, drums, bulk transport)
- Loading and transport safety compliance statements
- Chain of custody documentation with signatures at each handoff

REGULATORY FRAMEWORK:
- Transport permits and environmental agency oversight (FEPAM, IBAMA authorization)
- Movement authorization numbers (MTR numbers, permit IDs)
- Transit safety regulations compliance certificates
- Chain of custody for transportation phase with regulatory compliance statements
- Environmental agency logos and official formatting

DISTINCTIVE LANGUAGE:
- References to "transport," "movement," "shipment," "transit," or "manifesto de transporte"
- Focus on logistics rather than treatment or disposal operations
- Transportation safety and packaging requirements rather than processing methods
- Pickup/delivery terminology rather than treatment/disposal completion

**CRITICAL VALIDATION REQUIREMENTS:**
- **EXACT COMPANY MATCHING**: Company names and tax IDs must match precisely between document sections
- **COMPLETE TRANSPORT CHAIN**: All three entities (Generator → Transporter → Receiver) must be fully documented
- **VEHICLE-DRIVER CONSISTENCY**: Vehicle license plates and driver information must be consistent throughout document
- **QUANTITY CONSISTENCY**: Waste quantities must match across all document sections
- **DATE ALIGNMENT**: Transport, pickup, and delivery dates must be logically sequential
- **REGULATORY COMPLIANCE**: All required signatures, stamps, and authorization numbers must be present

**RED FLAGS FOR INVALID TRANSPORT MANIFESTS:**
- Missing transporter entity or incomplete transporter identification
- Company name discrepancies between sections
- Tax ID mismatches for any transport chain participant
- Vehicle or driver information inconsistencies
- Missing or misaligned transport dates
- Incomplete chain of custody signatures`;

export const AI_CONTEXT_PROMPTS: Record<DocumentManifestType, NonEmptyString> =
  {
    [RECYCLING_MANIFEST]: RECYCLING_MANIFEST_AI_CONTEXT,
    [TRANSPORT_MANIFEST]: TRANSPORT_MANIFEST_AI_CONTEXT,
  } as const;

export const getAiContextForDocumentType = (
  documentType: DocumentManifestType,
): NonEmptyString => AI_CONTEXT_PROMPTS[documentType];
