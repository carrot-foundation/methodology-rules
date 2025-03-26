/* cSpell:disable */
import {
  type Document,
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  DataSetName,
  type MethodologyDocumentAttachment,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import {
  stubAddress,
  stubAuthor,
  stubDocumentEventAttachment,
  stubParticipant,
} from '../stubs';

const primaryParticipant = stubParticipant({
  type: 'COMPANY',
});

const primaryAddress = stubAddress({
  countryCode: primaryParticipant.countryCode,
  latitude: -23.390_224_8,
  longitude: -51.129_103_9,
  neighborhood: 'Jardim Uniao da Vitoria II',
  number: '42',
  participantId: primaryParticipant.id,
  street: 'Rua dos Programadores',
});

const integratorParticipant = stubParticipant({
  type: 'COMPANY',
});

const integratorAddress = stubAddress({
  countryCode: integratorParticipant.countryCode,
  participantId: integratorParticipant.id,
});

const recyclerParticipant = stubParticipant({
  type: 'COMPANY',
});

const recyclerAddress = stubAddress({
  countryCode: primaryParticipant.countryCode,
  latitude: -23.391_098_1,
  longitude: -51.128_752,
  neighborhood: 'Jardim Uniao da Vitoria II',
  number: '42',
  participantId: primaryParticipant.id,
  street: 'Rua dos Digitadores',
});

// TODO: Update the approved document to use the newest format https://app.clickup.com/t/86a6ygw54
const lastYear = new Date().getFullYear() - 1;
const author = stubAuthor();
const externalId = faker.string.uuid();
const externalCreatedAt = `${lastYear}-03-31T09:54:06.000Z`;
const lastEventExternalCreatedAt = `${lastYear}-06-19T10:35:12.000Z`;
const attachment = random<MethodologyDocumentAttachment>();
const vehicleLicensePlate = faker.string.alphanumeric();
const weightScale = {
  manufacturer: faker.string.sample(),
  model: faker.string.numeric(),
  software: faker.string.sample(),
  supplier: faker.string.sample(),
  type: faker.string.sample(),
};

export const approvedMassDocument: Document = {
  attachments: [attachment],
  category: DocumentCategory.MASS,
  createdAt: `${lastYear}-12-19T13:34:35.785Z`,
  currentValue: 109_200,
  dataSetName: DataSetName.PROD,
  externalCreatedAt,
  externalEvents: [
    {
      address: integratorAddress,
      author,
      externalCreatedAt,
      id: faker.string.uuid(),
      isPublic: false,
      metadata: {
        attributes: [
          {
            isPublic: false,
            name: DocumentEventAttributeName.ACTOR_TYPE,
            value: 'INTEGRATOR',
          },
        ],
      },
      name: DocumentEventName.ACTOR,
      participant: integratorParticipant,
    },
    {
      address: primaryAddress,
      author,
      externalCreatedAt,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: true,
            name: 'is-test',
            value: true,
          },
        ],
      },
      name: DocumentEventName.NOTICE,
      participant: integratorParticipant,
    },
    {
      address: primaryAddress,
      author,
      externalCreatedAt,
      externalId,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: true,
            name: DocumentEventAttributeName.MOVE_TYPE,
            value: 'Pick-up',
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.VEHICLE_LICENSE_PLATE,
            value: vehicleLicensePlate,
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.VEHICLE_VOLUME_CAPACITY,
            value: '131000.00 KG',
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.VEHICLE_TYPE,
            value: 'Truck',
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.DRIVER_INTERNAL_ID,
            value: faker.string.uuid(),
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.DESCRIPTION,
            value: faker.string.sample(),
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.HAS_MTR,
            value: false,
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.HAS_REASON_DISMISSAL_MTR,
            value: faker.string.sample(),
          },
        ],
      },
      name: DocumentEventName.OPEN,
      participant: primaryParticipant,
      preserveSensitiveData: false,
    },
    {
      address: primaryAddress,
      author,
      externalCreatedAt,
      externalId,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: true,
            name: DocumentEventAttributeName.ACTOR_TYPE,
            value: 'SOURCE',
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.WASTE_ORIGIN_IDENTIFIED,
            value: true,
          },
        ],
      },
      name: DocumentEventName.ACTOR,
      participant: primaryParticipant,
      preserveSensitiveData: false,
    },
    {
      address: recyclerAddress,
      author,
      externalCreatedAt,
      externalId,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: true,
            name: DocumentEventAttributeName.ACTOR_TYPE,
            value: 'RECYCLER',
          },
        ],
      },
      name: DocumentEventName.ACTOR,
      participant: recyclerParticipant,
      preserveSensitiveData: false,
    },
    {
      address: recyclerAddress,
      author,
      externalCreatedAt,
      externalId,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: true,
            name: DocumentEventAttributeName.ACTOR_TYPE,
            value: 'PROCESSOR',
          },
        ],
      },
      name: DocumentEventName.ACTOR,
      participant: recyclerParticipant,
      preserveSensitiveData: false,
    },
    {
      address: primaryAddress,
      author,
      externalCreatedAt,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: true,
            name: 'is-test',
            value: true,
          },
        ],
      },
      name: DocumentEventName.NOTICE,
      participant: integratorParticipant,
    },
    {
      address: recyclerAddress,
      author,
      externalCreatedAt: `${lastYear}-04-10T23:18:00.000Z`,
      externalId,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: true,
            name: DocumentEventAttributeName.MOVE_TYPE,
            value: 'Identification',
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.DESCRIPTION,
            value: faker.string.sample(),
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.VEHICLE_LICENSE_PLATE,
            value: vehicleLicensePlate,
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.LPR_SOFTWARE,
            value: 'ITSCAM',
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.LPR_SUPPLIER,
            value: 'Pumatronix',
          },
        ],
      },
      name: DocumentEventName.MOVE,
      participant: recyclerParticipant,
      preserveSensitiveData: false,
    },
    {
      address: recyclerAddress,
      author,
      externalCreatedAt: `${lastYear}-04-10T23:23:00.000Z`,
      externalId,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: true,
            name: DocumentEventAttributeName.MOVE_TYPE,
            value: 'Weighing',
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.DESCRIPTION,
            value: faker.string.sample(),
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.WEIGHT_SCALE_TYPE,
            value: weightScale.type,
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.WEIGHT_SCALE_MANUFACTURER,
            value: weightScale.manufacturer,
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.WEIGHT_SCALE_MODEL,
            value: weightScale.model,
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.WEIGHT_SCALE_SOFTWARE,
            value: weightScale.software,
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.WEIGHT_SCALE_SUPPLIER,
            value: weightScale.supplier,
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.VEHICLE_GROSS_WEIGHT,
            value: '128901.00 KG',
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.VEHICLE_WEIGHT,
            value: '19700.00 KG',
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.LOAD_NET_WEIGHT,
            value: '109201.00 KG',
          },
        ],
      },
      name: DocumentEventName.MOVE,
      participant: recyclerParticipant,
      preserveSensitiveData: false,
    },
    {
      address: recyclerAddress,
      author,
      externalCreatedAt: `${lastYear}-04-10T23:29:00.000Z`,
      externalId,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: true,
            name: DocumentEventAttributeName.MOVE_TYPE,
            value: 'Drop-off',
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.DESCRIPTION,
            value: faker.string.sample(),
          },
        ],
      },
      name: DocumentEventName.MOVE,
      participant: recyclerParticipant,
      preserveSensitiveData: false,
    },
    {
      address: recyclerAddress,
      author,
      externalCreatedAt: `${lastYear}-04-10T23:59:00.000Z`,
      externalId,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: true,
            name: DocumentEventAttributeName.MOVE_TYPE,
            value: 'Weighing',
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.DESCRIPTION,
            value: faker.string.sample(),
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.WEIGHT_SCALE_TYPE,
            value: weightScale.type,
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.WEIGHT_SCALE_MANUFACTURER,
            value: weightScale.manufacturer,
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.WEIGHT_SCALE_MODEL,
            value: weightScale.model,
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.WEIGHT_SCALE_SOFTWARE,
            value: weightScale.software,
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.WEIGHT_SCALE_SUPPLIER,
            value: weightScale.supplier,
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.VEHICLE_GROSS_WEIGHT,
            value: '128900.00 KG',
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.VEHICLE_WEIGHT,
            value: '19700.00 KG',
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.LOAD_NET_WEIGHT,
            value: '109200.00 KG',
          },
        ],
      },
      name: DocumentEventName.MOVE,
      participant: recyclerParticipant,
      preserveSensitiveData: false,
      value: 109_200,
    },
    {
      address: recyclerAddress,
      author,
      externalCreatedAt: `${lastYear}-10-02T00:00:00.000Z`,
      externalId,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: false,
            name: DocumentEventAttributeName.INVOICE_NUMBER,
            value: faker.string.alphanumeric(),
          },
          {
            isPublic: false,
            name: DocumentEventAttributeName.INVOICE_KEY,
            value: faker.string.alphanumeric(),
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.INVOICE_DATE,
            value: `${lastYear}-10-02`,
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.INVOICE_NEIGHBORHOOD,
            value: faker.location.street(),
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.INVOICE_COUNTRY_CITY,
            value: faker.location.city(),
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.INVOICE_COUNTRY_STATE,
            value: faker.location.state(),
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.INVOICE_COUNTRY,
            value: faker.location.country(),
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.DESCRIPTION,
            value: faker.string.sample(),
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.INVOICE_TOTAL_WEIGHT,
            value: '136410.00 KG',
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.INVOICE_WEIGHT_MASSID_ASSOCIATED,
            value: '109200.00 KG',
          },
        ],
      },
      name: DocumentEventName.MOVE,
      participant: recyclerParticipant,
      preserveSensitiveData: false,
      value: 109_200,
    },
    {
      address: recyclerAddress,
      attachments: [stubDocumentEventAttachment()],
      author,
      externalCreatedAt: lastEventExternalCreatedAt,
      externalId,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: true,
            name: DocumentEventAttributeName.REPORT_TYPE,
            value: 'CDF',
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.REPORT_NUMBER,
            value: faker.string.numeric(),
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.REPORT_DATE_ISSUED,
            value: false,
          },
        ],
      },
      name: DocumentEventName.END,
      participant: recyclerParticipant,
      preserveSensitiveData: false,
      value: 109_200,
    },
    {
      address: recyclerAddress,
      attachments: [stubDocumentEventAttachment()],
      author,
      externalCreatedAt: lastEventExternalCreatedAt,
      externalId,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: true,
            name: DocumentEventAttributeName.REPORT_TYPE,
            value: 'CDF',
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.REPORT_NUMBER,
            value: faker.string.numeric(),
          },
          {
            isPublic: true,
            name: DocumentEventAttributeName.REPORT_DATE_ISSUED,
            value: false,
          },
        ],
      },
      name: DocumentEventName.RECYCLED,
      participant: recyclerParticipant,
      preserveSensitiveData: false,
      value: 109_200,
    },
  ],
  externalId: faker.string.uuid(),
  id: faker.string.uuid(),
  isPublic: true,
  isPubliclySearchable: true,
  measurementUnit: 'kg',
  permissions: [
    {
      id: faker.string.uuid(),
      participantId: primaryParticipant.id,
    },
    {
      id: faker.string.uuid(),
      participantId: integratorParticipant.id,
    },
    {
      id: faker.string.uuid(),
      participantId: primaryParticipant.id,
    },
    {
      id: faker.string.uuid(),
      participantId: recyclerParticipant.id,
    },
    {
      id: faker.string.uuid(),
      participantId: recyclerParticipant.id,
    },
  ],
  primaryAddress,
  primaryParticipant,
  status: 'OPEN',
  subtype: DocumentSubtype.DOMESTIC_SLUDGE,
  type: DocumentType.ORGANIC,
  updatedAt: lastEventExternalCreatedAt,
};
