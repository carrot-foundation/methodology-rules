/* cSpell:disable */
import {
  DataSetName,
  type Document,
  type DocumentAttachment,
  DocumentEventAttributeName,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
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

const author = stubAuthor();
const externalId = faker.string.uuid();
const externalCreatedAt = '2023-03-31T09:54:06.000Z';
const lastEventExternalCreatedAt = '2023-06-19T10:35:12.000Z';
const attachment = random<DocumentAttachment>();
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
  category: 'Mass',
  createdAt: '2023-12-19T13:34:35.785Z',
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
      name: 'ACTOR',
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
      name: 'NOTICE',
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
            name: 'move-type',
            value: 'Pick-up',
          },
          {
            isPublic: true,
            name: 'vehicle-license-plate',
            value: vehicleLicensePlate,
          },
          {
            isPublic: true,
            name: 'vehicle-volume-capacity',
            value: '131000.00 KG',
          },
          {
            isPublic: true,
            name: 'vehicle-type',
            value: 'Truck',
          },
          {
            isPublic: true,
            name: 'driver-internal-id',
            value: faker.string.uuid(),
          },
          {
            isPublic: true,
            name: 'description',
            value: faker.string.sample(),
          },
          {
            isPublic: true,
            name: 'has-mtr',
            value: false,
          },
          {
            isPublic: true,
            name: 'has-reason-dismissal-mtr',
            value: faker.string.sample(),
          },
        ],
      },
      name: 'OPEN',
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
            name: 'waste-origin-identified',
            value: true,
          },
        ],
      },
      name: 'ACTOR',
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
      name: 'ACTOR',
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
      name: 'ACTOR',
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
      name: 'NOTICE',
      participant: integratorParticipant,
    },
    {
      address: recyclerAddress,
      author,
      externalCreatedAt: '2023-04-10T23:18:00.000Z',
      externalId,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: true,
            name: 'move-type',
            value: 'Identification',
          },
          {
            isPublic: true,
            name: 'description',
            value: faker.string.sample(),
          },
          {
            isPublic: true,
            name: 'vehicle-license-plate',
            value: vehicleLicensePlate,
          },
          {
            isPublic: true,
            name: 'lpr-software',
            value: 'ITSCAM',
          },
          {
            isPublic: true,
            name: 'lpr-supplier',
            value: 'Pumatronix',
          },
        ],
      },
      name: 'MOVE',
      participant: recyclerParticipant,
      preserveSensitiveData: false,
    },
    {
      address: recyclerAddress,
      author,
      externalCreatedAt: '2023-04-10T23:23:00.000Z',
      externalId,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: true,
            name: 'move-type',
            value: 'Weighing',
          },
          {
            isPublic: true,
            name: 'description',
            value: faker.string.sample(),
          },
          {
            isPublic: true,
            name: 'weight-scale-type',
            value: weightScale.type,
          },
          {
            isPublic: true,
            name: 'weight-scale-manufacturer',
            value: weightScale.manufacturer,
          },
          {
            isPublic: true,
            name: 'weight-scale-model',
            value: weightScale.model,
          },
          {
            isPublic: true,
            name: 'weight-scale-software',
            value: weightScale.software,
          },
          {
            isPublic: true,
            name: 'weight-scale-supplier',
            value: weightScale.supplier,
          },
          {
            isPublic: true,
            name: 'vehicle-gross-weight',
            value: '128901.00 KG',
          },
          {
            isPublic: true,
            name: 'vehicle-weight',
            value: '19700.00 KG',
          },
          {
            isPublic: true,
            name: 'load-net-weight',
            value: '109201.00 KG',
          },
        ],
      },
      name: 'MOVE',
      participant: recyclerParticipant,
      preserveSensitiveData: false,
    },
    {
      address: recyclerAddress,
      author,
      externalCreatedAt: '2023-04-10T23:29:00.000Z',
      externalId,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: true,
            name: 'move-type',
            value: 'Drop-off',
          },
          {
            isPublic: true,
            name: 'description',
            value: faker.string.sample(),
          },
        ],
      },
      name: 'MOVE',
      participant: recyclerParticipant,
      preserveSensitiveData: false,
    },
    {
      address: recyclerAddress,
      author,
      externalCreatedAt: '2023-04-10T23:59:00.000Z',
      externalId,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: true,
            name: 'move-type',
            value: 'Weighing',
          },
          {
            isPublic: true,
            name: 'description',
            value: faker.string.sample(),
          },
          {
            isPublic: true,
            name: 'weight-scale-type',
            value: weightScale.type,
          },
          {
            isPublic: true,
            name: 'weight-scale-manufacturer',
            value: weightScale.manufacturer,
          },
          {
            isPublic: true,
            name: 'weight-scale-model',
            value: weightScale.model,
          },
          {
            isPublic: true,
            name: 'weight-scale-software',
            value: weightScale.software,
          },
          {
            isPublic: true,
            name: 'weight-scale-supplier',
            value: weightScale.supplier,
          },
          {
            isPublic: true,
            name: 'vehicle-gross-weight',
            value: '128900.00 KG',
          },
          {
            isPublic: true,
            name: 'vehicle-weight',
            value: '19700.00 KG',
          },
          {
            isPublic: true,
            name: 'load-net-weight',
            value: '109200.00 KG',
          },
        ],
      },
      name: 'MOVE',
      participant: recyclerParticipant,
      preserveSensitiveData: false,
      value: 109_200,
    },
    {
      address: recyclerAddress,
      author,
      externalCreatedAt: '2023-10-02T00:00:00.000Z',
      externalId,
      id: faker.string.uuid(),
      isPublic: true,
      metadata: {
        attributes: [
          {
            isPublic: false,
            name: 'invoice-number',
            value: faker.string.alphanumeric(),
          },
          {
            isPublic: false,
            name: 'invoice-key',
            value: faker.string.alphanumeric(),
          },
          {
            isPublic: true,
            name: 'invoice-date',
            value: '2023-10-02',
          },
          {
            isPublic: true,
            name: 'invoice-neighborhood',
            value: faker.location.street(),
          },
          {
            isPublic: true,
            name: 'invoice-country-city',
            value: faker.location.city(),
          },
          {
            isPublic: true,
            name: 'invoice-country-state',
            value: faker.location.state(),
          },
          {
            isPublic: true,
            name: 'invoice-country',
            value: faker.location.country(),
          },
          {
            isPublic: true,
            name: 'description',
            value: faker.string.sample(),
          },
          {
            isPublic: true,
            name: 'invoice-total-weight',
            value: '136410.00 KG',
          },
          {
            isPublic: true,
            name: 'invoice-weight-massid-associated',
            value: '109200.00 KG',
          },
        ],
      },
      name: 'MOVE',
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
            name: 'report-type',
            value: 'CDF',
          },
          {
            isPublic: true,
            name: 'report-number',
            value: faker.string.numeric(),
          },
          {
            isPublic: true,
            name: 'report-date-issued',
            value: false,
          },
        ],
      },
      name: 'END',
      participant: recyclerParticipant,
      preserveSensitiveData: false,
      value: 109_200,
    },
  ],
  externalId: faker.string.uuid(),
  id: faker.string.uuid(),
  initialValue: 0,
  isPublic: true,
  isPubliclySearchable: true,
  measurementUnit: 'KG',
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
