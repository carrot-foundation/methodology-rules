export const frameworkRules = [
  {
    description:
      "Validates that the 'Recycled' event occurred within the timeframe allowed by the methodology. The event must have occurred no later than January 1st of the previous year.",
    name: 'Audit Eligibility Check',
    slug: 'audit-eligibility-check',
  },
  {
    description:
      'Validates that all participants involved in the supply chain are accredited by the Carrot system. Verifies that accreditation documents exist and that their due dates have not expired.',
    name: 'Check Participants Accreditation',
    slug: 'check-participants-accreditation',
  },
  {
    description:
      'Verifies that the MassID document does not already have a recycling credit event linked to it, ensuring no double counting of recycling credits (TRC).',
    name: 'TRC Absence',
    slug: 'trc-absence',
  },
  {
    description:
      'Verifies that the document has a value greater than zero. The document value represents the weight of the mass registered on the platform.',
    name: 'Document Value',
    slug: 'document-value',
  },
  {
    description:
      "Verifies that the document's measurement unit is kilograms (kg), the standard unit adopted by the Carrot Platform.",
    name: 'Document Measurement Unit',
    slug: 'document-measurement-unit',
  },
  {
    description:
      "Verifies that the document is declared with the 'MassID' category, as required by the BOLD methodologies for mass verification.",
    name: 'Document Category',
    slug: 'document-category',
  },
  {
    description:
      "Verifies that the document type is declared as 'Organic'. The BOLD Carbon and BOLD Recycling methodologies are designed for organic waste types.",
    name: 'Document Type',
    slug: 'document-type',
  },
  {
    description:
      'Verifies that the MassID organic waste subtype belongs to the group of subtypes approved by the BOLD methodologies, as defined by CDM TOOL04 eligible organic waste type classes.',
    name: 'Document Subtype',
    slug: 'document-subtype',
  },
  {
    description:
      "The 'Pick-up' event must contain a 'Local Waste Classification ID' attribute with a code from the official waste classification of the jurisdiction where the waste was collected, and a 'Local Waste Classification Desc' attribute with the corresponding description. When the country code is 'BR', the fields must match the Brazilian solid waste list from IBAMA.",
    name: 'Local Waste Classification',
    slug: 'local-waste-classification',
  },
  {
    description:
      "When the country code of the collection address is 'BR', the 'Local Waste Classification ID' must correspond to an organic waste type from CDM Tool 04, mapped according to the IBAMA-CDM correspondence table.",
    name: 'Local Waste Classification x CDM',
    slug: 'local-waste-classification-x-cdm',
  },
  {
    description:
      "The time difference between the 'Drop-Off' and 'Recycled' events must be between 60 and 180 days, ensuring the composting cycle meets quality standards for fertilizer production.",
    name: 'Time Interval Check',
    slug: 'time-interval-check',
  },
  {
    description:
      "When the waste origin is unknown, the 'Pick-up' event must contain the 'Waste Origin' metadata set to 'Unidentified'. When the origin is known, this metadata must not be present, indicating the waste generator is identified.",
    name: 'Waste Origin Identified',
    slug: 'waste-origin-identified',
  },
  {
    description:
      "When the 'Waste Origin' metadata is not declared as 'Unidentified' in the 'Pick-up' event, there must be exactly one 'Waste Generator' actor event, identifying the source of the waste in the supply chain.",
    name: 'One Waste Source',
    slug: 'one-waste-source',
  },
  {
    description:
      'The First Identified Participant (also known as primary participant) must be the same participant indicated in the event where the waste was first registered (Pick-up). Validation is performed based on participant IDs.',
    name: 'First Identified Participant - FIP',
    slug: 'first-identified-participant-fip',
  },
  {
    description:
      'The address identified in the first registration event (Pick-up) must match the address indicated for the First Identified Participant. Address validation is performed based on registered address IDs.',
    name: 'FIP Address',
    slug: 'fip-address',
  },
  {
    description:
      "The MassID must contain exactly one 'Recycler' actor event, ensuring there is a single identified recycler responsible for transforming the waste and reintroducing it into the economy.",
    name: 'Recycler Actor',
    slug: 'recycler-actor',
  },
  {
    description:
      "When the 'Vehicle Type' metadata is not 'sludge-pipes' or 'cart', the MassID must contain at least one 'Hauler' actor event identifying the transport participant responsible for moving the waste.",
    name: 'Hauler Identification',
    slug: 'hauler-identification',
  },
  {
    description:
      "A 'Drop-off' event must be declared in the MassID, confirming that the waste was delivered to the correct destination and transferred to the composting facility.",
    name: 'Drop-off Event',
    slug: 'drop-off-event',
  },
  {
    description:
      "In the 'Pick-up' event, the geolocation declared in the 'app-gps-latitude' and 'app-gps-longitude' metadata must be compatible with the event address data, within a 2 km radius. If GPS data is unavailable, validation falls back to the address registered in the accreditation.",
    name: 'Pick-up Geolocation Precision',
    slug: 'pick-up-geolocation-precision',
  },
  {
    description:
      "At least one 'Drop-off' event must have its 'Responsible Party' address matching the address declared for the 'Recycler' actor event. Address validation is performed based on registered address IDs.",
    name: 'Check Recycler and Drop-Off Addresses',
    slug: 'check-recycler-and-drop-off-addresses',
  },
  {
    description:
      "When a Drop-Off event has a 'Responsible Party' matching a 'Processor' participant, there must be a subsequent Drop-Off event whose 'Responsible Party' matches the 'Recycler' participant, ensuring the waste is forwarded from the processor to the recycling facility.",
    name: 'Processor and Drop-Off',
    slug: 'processor-and-drop-off',
  },
  {
    description:
      "In the 'Drop-off' event, the geolocation declared in the 'app-gps-latitude' and 'app-gps-longitude' metadata must be compatible with the event address data, within a 2 km radius. If GPS data is unavailable, validation falls back to the address registered in the participant's accreditation.",
    name: 'Drop-off Geolocation Precision',
    slug: 'drop-off-geolocation-precision',
  },
  {
    description:
      "The 'Drop-off' event must contain the 'Receiving Operator Identifier' metadata, ensuring a responsible operator is registered for receiving the waste at the composting facility, enabling traceability and accountability.",
    name: 'Receiving Operator Identifier',
    slug: 'receiving-operator-identifier',
  },
  {
    description:
      "Verifies the distance between the 'Pick-up' and 'Drop-off' event geolocations. Distances exceeding 200 km are flagged for review in the Carrot Operations Dashboard, as the project boundary established under UNFCCC AMS-III.F. is 200 km.",
    name: 'Methodology Distance Limit',
    slug: 'methodology-distance-limit',
  },
  {
    description:
      "In a MassID document, the 'Vehicle Type' metadata is mandatory and must be one of the methodology-approved types: Truck, Car, Mini Van, Bicycle, Motorcycle, Cart, Sludge Pipes, Boat, Cargo Ship, or Others.",
    name: 'Vehicle Type',
    slug: 'vehicle-type',
  },
  {
    description:
      "When the 'Vehicle Type' metadata is 'Others' in the 'Pick-up' event, a 'Vehicle Description' metadata must be declared, ensuring all non-standard transport means are properly identified and documented.",
    name: 'Vehicle Description',
    slug: 'vehicle-description',
  },
  {
    description:
      "In the 'Pick-up' event, when the 'Vehicle Type' is not 'Sludge Pipes', 'Cart', or 'Bicycle', the 'Vehicle License Plate' metadata must be declared to enable transport tracking and prevent fraud.",
    name: 'Vehicle License Plate',
    slug: 'vehicle-license-plate',
  },
  {
    description:
      "When the 'Vehicle Type' is not 'Sludge Pipes', the 'Driver Identifier' metadata must be declared. If identified, the 'Internal DriverID' must be provided. If not identified, a 'Reason Dismissal DriverID' justification is required.",
    name: 'Driver Identifier',
    slug: 'driver-identifier',
  },
  {
    description:
      "Verifies that the 'Transport Manifest' event is declared in the MassID document, ensuring proof of waste transport is properly documented and traceable.",
    name: 'Has Transport Manifest',
    slug: 'has-transport-manifest',
  },
  {
    description:
      "When a 'Transport Manifest' event does not have an 'Exemption Justification' metadata, it must contain an attachment named 'Transport Manifest' as documentary proof of transport.",
    name: 'Transport Manifest Attachment',
    slug: 'transport-manifest-attachment',
  },
  {
    description:
      "When a 'Transport Manifest' event does not contain the metadata required by the 'Transport Manifest Fields' rule, an 'Exemption Justification' metadata must be declared with a non-empty value.",
    name: 'Transport Manifest Exemption Justification',
    slug: 'transport-manifest-exemption-justification',
  },
  {
    description:
      "When a 'Transport Manifest' event has no 'Exemption Justification', the following metadata must be filled: 'Document Type', 'Document Number', 'Document Date Issue', and 'Event Value'. When the Recycler is located in Brazil (country='BR'), the 'Document Type' must be 'MTR'.",
    name: 'Transport Manifest Fields',
    slug: 'transport-manifest-fields',
  },
  {
    description:
      "Verifies that the 'Recycling Manifest' event is declared in the MassID document, confirming that the waste was effectively processed at a recycling facility.",
    name: 'Has Recycling Manifest',
    slug: 'has-recycling-manifest',
  },
  {
    description:
      "When a 'Recycling Manifest' event does not have an 'Exemption Justification' metadata, it must contain an attachment named 'Recycling Manifest'. The required supporting document may vary by country where the recycler is located.",
    name: 'Recycling Manifest Attachment',
    slug: 'recycling-manifest-attachment',
  },
  {
    description:
      "When a 'Recycling Manifest' event does not contain the metadata required by the 'Recycling Manifest Fields' rule, an 'Exemption Justification' metadata must be declared with a non-empty value.",
    name: 'Recycling Manifest Exemption Justification',
    slug: 'recycling-manifest-exemption-justification',
  },
  {
    description:
      "The address declared in the 'Recycling Manifest' event must match the address of the 'Recycler' actor, ensuring the waste was processed at the correct location. Address validation is performed based on registered address IDs.",
    name: 'Recycling Manifest Address',
    slug: 'recycling-manifest-address',
  },
  {
    description:
      "When a 'Recycling Manifest' event has no 'Exemption Justification', the following metadata must be filled: 'Document Type', 'Document Number', and 'Document Date Issue'. When the Recycler is located in Brazil (country='BR'), the 'Document Type' must be 'CDF'.",
    name: 'Recycling Manifest Fields',
    slug: 'recycling-manifest-fields',
  },
  {
    description:
      "When a 'Recycling Manifest' event has no 'Exemption Justification', the 'Event Value' metadata must exactly match the 'value' declared in the document, preventing discrepancies in the recycling record.",
    name: 'Recycling Manifest Value',
    slug: 'recycling-manifest-value',
  },
  {
    description:
      "In the 'WEIGHING' event, the 'Weight Capture Method' metadata must be present with one of the following values: Digital, Photo (Scale+Cargo), Manual, or Transport Manifest.",
    name: 'Weight Capture Method',
    slug: 'weight-capture-method',
  },
  {
    description:
      "In the 'WEIGHING' event, the 'Scale Type' metadata must be declared and identified as one of the approved types: Weighbridge (Truck Scale), Floor Scale, Pallet Scale, Forklift Scale, Conveyor Belt Scale, Hanging/Crane Scale, Bin Scale, Portable Axle Weigher, Onboard Truck Scale, Precision/Bench Scale, or Two-bin Lateral Scale.",
    name: 'Scale Type',
    slug: 'scale-type',
  },
  {
    description:
      "In the 'WEIGHING' event, the 'Container Type' metadata must be present with one of the following values: Bag, Bin, Drum, Pail, Street Bin, Waste Box, or Truck.",
    name: 'Container Type',
    slug: 'container-type',
  },
  {
    description:
      "In the 'WEIGHING' event, the 'Scale Accreditation' metadata must be present with a link to the scale validation event in the accreditation of the participant responsible for weighing.",
    name: 'Scale Accreditation',
    slug: 'scale-accreditation',
  },
  {
    description:
      "The MassID must have at least one 'WEIGHING' event with the following metadata: 'Gross Weight' (decimal > 0, in kg), 'Container Capacity' (decimal > 0, in KILOGRAM, LITER, or CUBIC_METER), 'Tare' (decimal >= 0, in kg), 'Mass Net Weight' (decimal > 0, in kg), and 'Container Quantity' (integer >= 1, required when Container Type is not 'Truck').",
    name: 'Weighing Fields',
    slug: 'weighing-fields',
  },
  {
    description:
      "In the 'WEIGHING' event, when the 'Container Type' is 'Truck', a 'Vehicle License Plate' attribute must be present.",
    name: 'Truck Weighing',
    slug: 'truck-weighing',
  },
  {
    description:
      "When a 'WEIGHING' event lacks 'Mass Net Weight' and 'Tare', it must have 'Gross Weight' and 'Container Capacity'. A second 'WEIGHING' event must then follow with matching 'Gross Weight', 'Container Capacity', 'Scale Type', 'Scale Accreditation', 'Container Type', and 'Vehicle License Plate' values, plus all other fields per the 'Weighing Fields' rule.",
    name: 'Weighing in two steps',
    slug: 'weighing-in-two-steps',
  },
  {
    description:
      "When a 'WEIGHING' event satisfies the 'Weighing Fields' rule, the following calculation is verified: Mass Net Weight = Gross Weight - (Tare * Container Quantity). If 'Container Quantity' is not provided, a value of 1 is assumed.",
    name: 'Net Weight Verification',
    slug: 'net-weight-verification',
  },
  {
    description:
      "A 'Sorting' event must be declared after all 'Weighing' events in the MassID document.",
    name: 'Mass Sorting Event',
    slug: 'mass-sorting-event',
  },
  {
    description:
      "The 'Sorting' event must contain a 'value' metadata, and the 'value' field of the 'Sorting' event must update the MassID document value.",
    name: 'Sorting Value Field',
    slug: 'sorting-value-field',
  },
  {
    description:
      "Verifies that the sorting calculation is correct by executing the equation: document value * (100% - conversion factor) = mass sorting value, and comparing the result with the value declared in the 'Sorting' event.",
    name: 'Sorting Calculation',
    slug: 'sorting-calculation',
  },
  {
    description:
      "Checks the monthly waste generation ceiling in the source's accreditation page. If the sum of masses from the same generator in the same month exceeds the ceiling by more than 20%, the MassID is blocked for credit generation until reviewed by the operations department.",
    name: 'Double-checking Source Emitted Masses',
    slug: 'double-checking-source-emitted-masses',
  },
  {
    description:
      "Checks the operational capacity in the recycler's accreditation page. If the sum of masses processed by the same recycler in the same month exceeds the operational capacity by more than 3%, the MassID is blocked for credit generation until approved by the operations department.",
    name: 'Double-checking Recycler Emitted Masses',
    slug: 'double-checking-recycler-emitted-masses',
  },
  {
    description:
      'Verifies that no other mass documents exist with the same document value, same date and time of receipt at the recycling yard, same generator, and same vehicle. Duplicate documents are rejected to prevent inconsistencies.',
    name: 'Duplicate Check',
    slug: 'duplicate-check',
  },
  {
    description:
      "Verifies that the date, time of the 'Drop-Off' event, and 'vehicle-license-plate' of the audited MassID are unique. If there is a conflict with another MassID, the mass is rejected to prevent duplicate or inconsistent records.",
    name: 'Route Check',
    slug: 'route-check',
  },
  {
    description:
      "Verifies the composting fertilizer coefficient in the recycler's accreditation page and checks whether the declared quantity is compatible with the calculation, ensuring accuracy in recycled-to-input conversion reporting.",
    name: 'Recycled-to-Input Conversion',
    slug: 'recycled-to-input-conversion',
  },
] as const;

export type FrameworkRuleSlug = (typeof frameworkRules)[number]['slug'];
