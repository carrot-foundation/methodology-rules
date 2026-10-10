import {
  BoldAttachmentLabel,
  BoldAttributeName,
  BoldContainerType,
  BoldDocumentCategory,
  BoldDocumentEventName,
  BoldDocumentType,
  BoldReportType,
  BoldScaleType,
  BoldUnidentifiedAttributeValue,
  BoldVehicleType,
  BoldWeighingCaptureMethod,
  MassIDActorType,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { DocumentEventAttributeFormat } from '@carrot-fndn/shared/types';

import type { CatalogAttribute, MassIDCatalog } from './mass-id-catalog.types';

const {
  CAPTURED_GPS_LATITUDE,
  CAPTURED_GPS_LONGITUDE,
  CONTAINER_CAPACITY,
  CONTAINER_QUANTITY,
  CONTAINER_TYPE,
  DEDUCTED_WEIGHT,
  DESCRIPTION,
  DOCUMENT_NUMBER,
  DOCUMENT_TYPE,
  DRIVER_IDENTIFIER,
  DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION,
  EXEMPTION_JUSTIFICATION,
  GROSS_WEIGHT,
  ISSUE_DATE,
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
  RECEIVING_OPERATOR_IDENTIFIER,
  SCALE_TYPE,
  TARE,
  VEHICLE_DESCRIPTION,
  VEHICLE_LICENSE_PLATE,
  VEHICLE_TYPE,
  WASTE_ORIGIN,
  WEIGHING_CAPTURE_METHOD,
} = BoldAttributeName;
const {
  ACTOR,
  DROP_OFF,
  PICK_UP,
  RECYCLED,
  RECYCLING_MANIFEST,
  SORTING,
  TRANSPORT_MANIFEST,
  WEIGHING,
} = BoldDocumentEventName;
const { BICYCLE, CART, OTHERS, SLUDGE_PIPES } = BoldVehicleType;
const { DATE, KILOGRAM } = DocumentEventAttributeFormat;

const CREATED_AT = '2024-12-05T11:02:47Z';
const RECYCLED_AT = '2025-02-22T10:35:12.000Z';
const WEIGHED_MASS = 1201.925;

const WASTE_GENERATOR = {
  addressId: '00000000-0000-4000-9000-00000000000a',
  participantId: '00000000-0000-4000-8000-00000000000a',
} as const;
const HAULER = {
  addressId: '00000000-0000-4000-9000-00000000000b',
  participantId: '00000000-0000-4000-8000-00000000000b',
} as const;
const PROCESSOR = {
  addressId: '00000000-0000-4000-9000-00000000000c',
  participantId: '00000000-0000-4000-8000-00000000000c',
} as const;
const RECYCLER = {
  addressId: '00000000-0000-4000-9000-00000000000d',
  participantId: '00000000-0000-4000-8000-00000000000d',
} as const;
const INTEGRATOR = {
  addressId: '00000000-0000-4000-9000-00000000000e',
  participantId: '00000000-0000-4000-8000-00000000000e',
} as const;

const PLATE_FORMS = 'ABC1D23, ABC1234 or AB1234';
const ACCREDITED_ADDRESS_NOTE =
  "A position more than 2 km from the participant's accredited address can fail the audit.";
const MANIFEST_ATTACHMENT_NOTE = `Required when the manifest file is attached. It is not checked when ${EXEMPTION_JUSTIFICATION} replaces the attachment.`;

const CAPTURED_GPS_ATTRIBUTES: readonly CatalogAttribute[] = [
  {
    name: CAPTURED_GPS_LATITUDE,
    notes: `Decimal degrees from -90 to 90, used only when ${CAPTURED_GPS_LONGITUDE} is also sent. ${ACCREDITED_ADDRESS_NOTE}`,
    required: 'no',
    valueType: 'number',
  },
  {
    name: CAPTURED_GPS_LONGITUDE,
    notes: `Decimal degrees from -180 to 180, used only when ${CAPTURED_GPS_LATITUDE} is also sent. ${ACCREDITED_ADDRESS_NOTE}`,
    required: 'no',
    valueType: 'number',
  },
];

const EXEMPTION_JUSTIFICATION_ATTRIBUTE: CatalogAttribute = {
  name: EXEMPTION_JUSTIFICATION,
  notes:
    'Reason the manifest file is not attached. Send it only without the attachment: sending both is rejected, and so is sending neither.',
  required: 'conditional',
  valueType: 'string',
};

export const MASS_ID_CATALOG: MassIDCatalog = {
  actors: [
    {
      ...WASTE_GENERATOR,
      externalCreatedAt: CREATED_AT,
      label: MassIDActorType.WASTE_GENERATOR,
      slug: 'actor-waste-generator',
    },
    {
      ...RECYCLER,
      externalCreatedAt: CREATED_AT,
      label: MassIDActorType.RECYCLER,
      slug: 'actor-recycler',
    },
    {
      ...PROCESSOR,
      externalCreatedAt: CREATED_AT,
      label: MassIDActorType.PROCESSOR,
      slug: 'actor-processor',
    },
    {
      ...HAULER,
      externalCreatedAt: CREATED_AT,
      label: MassIDActorType.HAULER,
      slug: 'actor-hauler',
    },
    {
      ...INTEGRATOR,
      externalCreatedAt: CREATED_AT,
      label: MassIDActorType.INTEGRATOR,
      slug: 'actor-integrator',
    },
  ],
  document: {
    addressId: WASTE_GENERATOR.addressId,
    category: BoldDocumentCategory.MASS_ID,
    externalCreatedAt: CREATED_AT,
    isPublic: true,
    isPubliclySearchable: true,
    participantId: WASTE_GENERATOR.participantId,
    subtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
    title: 'MassID',
    type: BoldDocumentType.ORGANIC,
  },
  events: [
    {
      ...WASTE_GENERATOR,
      attributes: [
        {
          example: 'Waste picked up at the waste generator site',
          name: DESCRIPTION,
          required: 'no',
          valueType: 'string',
        },
        {
          example: '02 01 03',
          name: LOCAL_WASTE_CLASSIFICATION_ID,
          notes:
            'Ibama waste classification code, such as 02 01 03. It must be a code accepted for the MassID subtype.',
          required: 'yes',
          valueType: 'string',
        },
        {
          example: 'Resíduos de tecidos vegetais',
          name: LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
          notes: `Official Ibama description of the code sent in ${LOCAL_WASTE_CLASSIFICATION_ID}.`,
          required: 'yes',
          valueType: 'string',
        },
        {
          example: 'ABC1D23',
          name: VEHICLE_LICENSE_PLATE,
          notes: `Required for every ${VEHICLE_TYPE}: the duplicate check uses it. Unless ${VEHICLE_TYPE} is ${BICYCLE}, ${CART}, ${SLUDGE_PIPES} or ${OTHERS}, it must be a plate in the form ${PLATE_FORMS}; for those types any non-empty identifier is accepted.`,
          required: 'yes',
          valueType: 'string',
        },
        {
          allowedValues: Object.values(BoldVehicleType),
          example: BoldVehicleType.TRUCK,
          name: VEHICLE_TYPE,
          required: 'yes',
          valueType: 'string',
        },
        {
          example: '00000000-0000-4000-8000-00000000d21f',
          name: DRIVER_IDENTIFIER,
          notes: `Send either this or ${DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION}, never both. Neither is needed when ${VEHICLE_TYPE} is ${SLUDGE_PIPES}.`,
          required: 'conditional',
          valueType: 'string',
        },
        {
          name: DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION,
          notes: `Reason ${DRIVER_IDENTIFIER} is not sent. Send it instead of ${DRIVER_IDENTIFIER}: sending both is rejected.`,
          required: 'conditional',
          valueType: 'string',
        },
        {
          name: VEHICLE_DESCRIPTION,
          notes: `Required when ${VEHICLE_TYPE} is ${OTHERS}: describe the vehicle used.`,
          required: 'conditional',
          valueType: 'string',
        },
        {
          name: WASTE_ORIGIN,
          notes: `Leave it out, or send any value other than ${BoldUnidentifiedAttributeValue.UNIDENTIFIED}. ${BoldUnidentifiedAttributeValue.UNIDENTIFIED} is rejected when the MassID has a ${MassIDActorType.WASTE_GENERATOR} ${ACTOR} event, and the duplicate check fails every MassID that has none.`,
          required: 'no',
          valueType: 'string',
        },
        ...CAPTURED_GPS_ATTRIBUTES,
      ],
      externalCreatedAt: CREATED_AT,
      name: PICK_UP,
      slug: 'pick-up',
    },
    {
      ...WASTE_GENERATOR,
      attachments: [
        {
          fileName: 'transport-manifest.pdf',
          isPublic: false,
          label: BoldAttachmentLabel.TRANSPORT_MANIFEST,
        },
      ],
      attributes: [
        {
          allowedValues: [BoldReportType.MTR],
          example: BoldReportType.MTR,
          name: DOCUMENT_TYPE,
          notes: MANIFEST_ATTACHMENT_NOTE,
          required: 'conditional',
          valueType: 'string',
        },
        {
          example: 'DOC-EXAMPLE-0001',
          name: DOCUMENT_NUMBER,
          notes: MANIFEST_ATTACHMENT_NOTE,
          required: 'conditional',
          valueType: 'string',
        },
        {
          example: '2024-02-10',
          format: DATE,
          name: ISSUE_DATE,
          notes: MANIFEST_ATTACHMENT_NOTE,
          required: 'conditional',
          valueType: 'string',
        },
        EXEMPTION_JUSTIFICATION_ATTRIBUTE,
      ],
      externalCreatedAt: CREATED_AT,
      name: TRANSPORT_MANIFEST,
      slug: 'transport-manifest',
      value: WEIGHED_MASS,
    },
    {
      ...WASTE_GENERATOR,
      attributes: [
        {
          example: 'Weighing captured at waste generator site',
          name: DESCRIPTION,
          required: 'yes',
          valueType: 'string',
        },
        {
          allowedValues: Object.values(BoldWeighingCaptureMethod),
          example: BoldWeighingCaptureMethod.DIGITAL,
          name: WEIGHING_CAPTURE_METHOD,
          required: 'yes',
          valueType: 'string',
        },
        {
          allowedValues: Object.values(BoldScaleType),
          example: BoldScaleType.FLOOR_SCALE,
          name: SCALE_TYPE,
          notes: `Must be the scale type registered in the recycler's accreditation. A weighing sent as two ${WEIGHING} events must use ${BoldScaleType.WEIGHBRIDGE} or ${BoldScaleType.WEIGHBRIDGE_SHORT}.`,
          required: 'yes',
          valueType: 'string',
        },
        {
          example: BoldContainerType.DRUM,
          name: CONTAINER_TYPE,
          notes: `Must be ${BoldContainerType.TRUCK} when the weighing is sent as two ${WEIGHING} events.`,
          required: 'yes',
          valueType: 'string',
        },
        {
          example: 1,
          name: CONTAINER_QUANTITY,
          notes: `Whole number greater than 0, required unless ${CONTAINER_TYPE} is ${BoldContainerType.TRUCK}, in which case it must not be sent. An approved exception in the recycler's accreditation also waives it.`,
          required: 'conditional',
          valueType: 'number',
        },
        {
          example: 100,
          format: KILOGRAM,
          name: CONTAINER_CAPACITY,
          notes:
            "Greater than 0, required unless the recycler's accreditation carries an approved exception for it.",
          required: 'conditional',
          valueType: 'number',
        },
        {
          example: 1211.925,
          format: KILOGRAM,
          name: GROSS_WEIGHT,
          notes: `Greater than 0, required unless the recycler's accreditation carries an approved exception for ${TARE}. When ${TARE} and ${CONTAINER_QUANTITY} are also sent, the event value must equal ${GROSS_WEIGHT} minus (${TARE} multiplied by ${CONTAINER_QUANTITY}).`,
          required: 'conditional',
          valueType: 'number',
        },
        {
          example: 10,
          format: KILOGRAM,
          name: TARE,
          notes:
            "Weight of one empty container, greater than 0, required unless the recycler's accreditation carries an approved exception for it.",
          required: 'conditional',
          valueType: 'number',
        },
        {
          example: 'ABC1D23',
          name: VEHICLE_LICENSE_PLATE,
          notes: `Plate in the form ${PLATE_FORMS}. A weighing sent as two ${WEIGHING} events must carry the same ${VEHICLE_LICENSE_PLATE}, ${GROSS_WEIGHT}, ${CONTAINER_CAPACITY}, ${CONTAINER_TYPE}, ${SCALE_TYPE} and ${WEIGHING_CAPTURE_METHOD} on both.`,
          required: 'yes',
          valueType: 'string',
        },
      ],
      externalCreatedAt: CREATED_AT,
      name: WEIGHING,
      slug: 'weighing',
      value: WEIGHED_MASS,
    },
    {
      ...RECYCLER,
      attributes: [
        {
          example: 'Waste deposited in Windrow number 1',
          name: DESCRIPTION,
          required: 'no',
          valueType: 'string',
        },
        {
          example: PROCESSOR.participantId,
          name: RECEIVING_OPERATOR_IDENTIFIER,
          required: 'yes',
          valueType: 'string',
        },
        ...CAPTURED_GPS_ATTRIBUTES,
      ],
      externalCreatedAt: CREATED_AT,
      name: DROP_OFF,
      slug: 'drop-off',
    },
    {
      ...PROCESSOR,
      attributes: [
        {
          example: 'Sorting factor determined by a third-party audit',
          name: DESCRIPTION,
          required: 'yes',
          valueType: 'string',
        },
        {
          example: WEIGHED_MASS,
          format: KILOGRAM,
          name: GROSS_WEIGHT,
          notes: `Greater than 0. It must equal the value of the most recent earlier event that carries one, normally the ${WEIGHING} event.`,
          required: 'yes',
          valueType: 'number',
        },
        {
          example: 12.019,
          format: KILOGRAM,
          name: DEDUCTED_WEIGHT,
          notes: `Greater than 0 and lower than ${GROSS_WEIGHT}: it must equal ${GROSS_WEIGHT} multiplied by the sorting factor in the recycler's accreditation. The event value must equal ${GROSS_WEIGHT} minus ${DEDUCTED_WEIGHT}.`,
          required: 'yes',
          valueType: 'number',
        },
      ],
      externalCreatedAt: CREATED_AT,
      name: SORTING,
      slug: 'sorting',
      value: 1189.906,
    },
    {
      ...RECYCLER,
      attributes: [
        {
          example:
            'Composting process completed. The recycling completion date is recorded by a conservative estimate determined and verified by a third-party audit for the recycler',
          name: DESCRIPTION,
          required: 'no',
          valueType: 'string',
        },
      ],
      externalCreatedAt: RECYCLED_AT,
      name: RECYCLED,
      slug: 'recycled',
    },
    {
      ...RECYCLER,
      attachments: [
        {
          fileName: 'recycling-manifest.pdf',
          isPublic: false,
          label: BoldAttachmentLabel.RECYCLING_MANIFEST,
        },
      ],
      attributes: [
        {
          allowedValues: [BoldReportType.CDF],
          example: BoldReportType.CDF,
          name: DOCUMENT_TYPE,
          notes: MANIFEST_ATTACHMENT_NOTE,
          required: 'conditional',
          valueType: 'string',
        },
        {
          example: 'DOC-EXAMPLE-0002',
          name: DOCUMENT_NUMBER,
          notes: MANIFEST_ATTACHMENT_NOTE,
          required: 'conditional',
          valueType: 'string',
        },
        {
          example: '2024-03-10',
          format: DATE,
          name: ISSUE_DATE,
          notes: MANIFEST_ATTACHMENT_NOTE,
          required: 'conditional',
          valueType: 'string',
        },
        EXEMPTION_JUSTIFICATION_ATTRIBUTE,
      ],
      externalCreatedAt: CREATED_AT,
      name: RECYCLING_MANIFEST,
      slug: 'recycling-manifest',
      value: WEIGHED_MASS,
    },
  ],
};
