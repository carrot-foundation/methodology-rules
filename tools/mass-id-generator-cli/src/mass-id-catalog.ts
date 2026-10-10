import {
  BoldAttachmentLabel,
  BoldAttributeName,
  BoldContainerType,
  BoldDocumentCategory,
  BoldDocumentEventName,
  BoldDocumentType,
  BoldReportType,
  BoldScaleType,
  BoldVehicleType,
  BoldWeighingCaptureMethod,
  MassIDActorType,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { DocumentEventAttributeFormat } from '@carrot-fndn/shared/types';

import type { MassIDCatalog } from './mass-id-catalog.types';

const {
  CONTAINER_CAPACITY,
  CONTAINER_QUANTITY,
  CONTAINER_TYPE,
  DEDUCTED_WEIGHT,
  DESCRIPTION,
  DOCUMENT_NUMBER,
  DOCUMENT_TYPE,
  DRIVER_IDENTIFIER,
  GROSS_WEIGHT,
  ISSUE_DATE,
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
  RECEIVING_OPERATOR_IDENTIFIER,
  SCALE_TYPE,
  TARE,
  VEHICLE_LICENSE_PLATE,
  VEHICLE_TYPE,
  WEIGHING_CAPTURE_METHOD,
} = BoldAttributeName;
const {
  DROP_OFF,
  PICK_UP,
  RECYCLED,
  RECYCLING_MANIFEST,
  SORTING,
  TRANSPORT_MANIFEST,
  WEIGHING,
} = BoldDocumentEventName;
const { DATE, KILOGRAM } = DocumentEventAttributeFormat;

const CREATED_AT = '2024-12-05T11:02:47Z';
const RECYCLED_AT = '2025-02-22T10:35:12.000Z';

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
        },
        { example: '02 01 03', name: LOCAL_WASTE_CLASSIFICATION_ID },
        {
          example: 'Resíduos de tecidos vegetais',
          name: LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
        },
        { example: 'ABC1D23', name: VEHICLE_LICENSE_PLATE },
        { example: BoldVehicleType.TRUCK, name: VEHICLE_TYPE },
        {
          example: '00000000-0000-4000-8000-00000000d21f',
          name: DRIVER_IDENTIFIER,
        },
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
        { example: BoldReportType.MTR, name: DOCUMENT_TYPE },
        { example: 'DOC-EXAMPLE-0001', name: DOCUMENT_NUMBER },
        { example: '2024-02-10', format: DATE, name: ISSUE_DATE },
      ],
      externalCreatedAt: CREATED_AT,
      name: TRANSPORT_MANIFEST,
      slug: 'transport-manifest',
      value: 1201.925,
    },
    {
      ...WASTE_GENERATOR,
      attributes: [
        {
          example: 'Weighing captured at waste generator site',
          name: DESCRIPTION,
        },
        {
          example: BoldWeighingCaptureMethod.DIGITAL,
          name: WEIGHING_CAPTURE_METHOD,
        },
        { example: BoldScaleType.FLOOR_SCALE, name: SCALE_TYPE },
        { example: BoldContainerType.DRUM, name: CONTAINER_TYPE },
        { example: 1, name: CONTAINER_QUANTITY },
        { example: 100, format: KILOGRAM, name: CONTAINER_CAPACITY },
        { example: 1211.925, format: KILOGRAM, name: GROSS_WEIGHT },
        { example: 10, format: KILOGRAM, name: TARE },
      ],
      externalCreatedAt: CREATED_AT,
      name: WEIGHING,
      slug: 'weighing',
      value: 1201.925,
    },
    {
      ...RECYCLER,
      attributes: [
        { example: 'Waste deposited in Windrow number 1', name: DESCRIPTION },
        {
          example: PROCESSOR.participantId,
          name: RECEIVING_OPERATOR_IDENTIFIER,
        },
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
        },
        { example: 1201.925, format: KILOGRAM, name: GROSS_WEIGHT },
        { example: 12.019, format: KILOGRAM, name: DEDUCTED_WEIGHT },
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
        { example: BoldReportType.CDF, name: DOCUMENT_TYPE },
        { example: 'DOC-EXAMPLE-0002', name: DOCUMENT_NUMBER },
        { example: '2024-03-10', format: DATE, name: ISSUE_DATE },
      ],
      externalCreatedAt: CREATED_AT,
      name: RECYCLING_MANIFEST,
      slug: 'recycling-manifest',
      value: 1201.925,
    },
  ],
};
