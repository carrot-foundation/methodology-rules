import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';
import type { PartialDeep } from 'type-fest';

import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type BoldExternalEventsObject,
  BoldStubsBuilder,
  MASS_ID_ACTOR_PARTICIPANTS,
  type StubBoldDocumentParameters,
  stubBoldEmissionAndCompostingMetricsEvent,
  stubBoldMassIDDropOffEvent,
  stubBoldMassIDSortingEvent,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  type DocumentEvent,
  type DocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type MethodologyParticipant } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { addYears } from 'date-fns';

import {
  RESULT_COMMENTS,
  SORTING_TOLERANCE,
} from './mass-id-sorting.constants';
import { MassIDSortingProcessorErrors } from './mass-id-sorting.errors';

const processorErrors = new MassIDSortingProcessorErrors();

// Helper functions to reduce duplication
const createAccreditationDocuments = (sortingFactor: number) =>
  new Map([
    [
      'Recycler',
      {
        externalEventsMap: {
          ['Accreditation Context']: stubDocumentEvent({
            name: 'Accreditation Context',
            participant: actorParticipants.get('Recycler')!,
          }),
          ['Emissions & Composting Metrics']:
            stubBoldEmissionAndCompostingMetricsEvent({
              metadataAttributes: [['Sorting Factor', sortingFactor]],
              partialDocumentEvent: {
                participant: actorParticipants.get('Recycler')!,
              },
            }),
        },
      },
    ],
  ]);

const createWeightAttributes = (
  grossWeight: number,
  deductedWeight: number,
) => [
  {
    format: 'KILOGRAM',
    name: 'Gross Weight',
    value: grossWeight,
  },
  {
    format: 'KILOGRAM',
    name: 'Deducted Weight',
    value: deductedWeight,
  },
];

const createMassIDEvents = (
  valueBeforeSorting: number,
  grossWeight: number,
  deductedWeight: number,
  sortingValue?: number,
  includeDescription = true,
) => ({
  ['Drop-off']: stubBoldMassIDDropOffEvent({
    partialDocumentEvent: { value: valueBeforeSorting },
  }),
  ['Sorting']: stubBoldMassIDSortingEvent({
    metadataAttributes: [
      ...createWeightAttributes(grossWeight, deductedWeight),
      ...(includeDescription
        ? []
        : [
            ['Description', undefined] as [
              DocumentEventAttributeName,
              undefined,
            ],
          ]),
    ],
    ...(sortingValue !== undefined && {
      partialDocumentEvent: { value: sortingValue },
    }),
  }),
});

const modifyDocumentEvents = (
  baseDocument: Document,
  eventModifiers: Record<string, unknown>,
): Document => ({
  ...baseDocument,
  externalEvents: baseDocument.externalEvents?.map((event) => {
    const eventName = String(event.name);

    return (eventModifiers[eventName] ?? event) as DocumentEvent;
  }),
});

const createErrorTestCase = (
  scenario: string,
  documents: Document[],
  resultComment: string,
) => ({
  documents,
  massIDAuditDocument,
  resultComment,
  resultStatus: 'FAILED',
  scenario,
});

const createWeightAttributesWithFormat = (
  grossWeight: number,
  deductedWeight: number,
  grossFormat = 'KILOGRAM',
  deductedFormat = 'KILOGRAM',
) => [
  {
    format: grossFormat,
    name: 'Gross Weight',
    value: grossWeight,
  },
  {
    format: deductedFormat,
    name: 'Deducted Weight',
    value: deductedWeight,
  },
];

// Deterministic values for manifestExample test cases
const MANIFEST_SORTING_FACTOR = 0.3;
const MANIFEST_VALUE_BEFORE_SORTING = 100;
const MANIFEST_GROSS_WEIGHT = MANIFEST_VALUE_BEFORE_SORTING;
const MANIFEST_DEDUCTED_WEIGHT =
  MANIFEST_GROSS_WEIGHT * MANIFEST_SORTING_FACTOR;
const MANIFEST_SORTING_VALUE = MANIFEST_GROSS_WEIGHT - MANIFEST_DEDUCTED_WEIGHT;

const sortingFactor = faker.number.float({ max: 1, min: 0 });
const valueBeforeSorting = faker.number.float({ min: 1 });
const grossWeight = valueBeforeSorting;
const expectedDeductedWeight = grossWeight * sortingFactor;
const deductedWeight = expectedDeductedWeight;
const calculatedSortingValue = grossWeight - expectedDeductedWeight;
const wrongSortingValue = calculatedSortingValue + 0.15;
const delta = SORTING_TOLERANCE + 0.01;
const mismatchedDeductedWeight =
  expectedDeductedWeight > delta
    ? expectedDeductedWeight - delta
    : expectedDeductedWeight + delta;

const actorParticipants = new Map(
  MASS_ID_ACTOR_PARTICIPANTS.map((subtype) => [
    subtype,
    stubParticipant({ id: faker.string.uuid(), type: subtype }),
  ]),
);

const {
  massIDAuditDocument,
  massIDDocument,
  participantsAccreditationDocuments,
} = new BoldStubsBuilder()
  .createMassIDDocuments({
    externalEventsMap: {
      ['Drop-off']: stubBoldMassIDDropOffEvent({
        partialDocumentEvent: {
          value: 0,
        },
      }),
      ['Sorting']: stubBoldMassIDSortingEvent({
        metadataAttributes: [
          {
            format: 'KILOGRAM',
            name: 'Gross Weight',
            value: valueBeforeSorting,
          },
          {
            format: 'KILOGRAM',
            name: 'Deducted Weight',
            value: faker.number.float({
              max: valueBeforeSorting / 2,
              min: 0.1,
            }),
          },
        ],
      }),
    },
    partialDocument: {
      externalCreatedAt: addYears(new Date(), 1).toISOString(),
    },
  })
  .createMassIDAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments()
  .build();

interface MassIDSortingTestCase extends RuleTestCase {
  accreditationDocuments?: Map<string, StubBoldDocumentParameters> | undefined;
  actorParticipants: Map<string, MethodologyParticipant>;
  massIDEvents: BoldExternalEventsObject;
  partialDocument: PartialDeep<Document>;
}

export const massIDSortingTestCases: MassIDSortingTestCase[] = [
  {
    actorParticipants,
    manifestFields: { includeCurrentValue: true, includeValue: true },
    massIDEvents: createMassIDEvents(
      valueBeforeSorting,
      grossWeight,
      deductedWeight,
      calculatedSortingValue,
      false,
    ),
    partialDocument: {
      ...massIDDocument,
      currentValue: calculatedSortingValue,
    },
    resultComment: RESULT_COMMENTS.failed.MISSING_SORTING_DESCRIPTION,
    resultStatus: 'FAILED',
    scenario: 'The sorting description is missing',
  },
  {
    accreditationDocuments: createAccreditationDocuments(
      MANIFEST_SORTING_FACTOR,
    ),
    actorParticipants,
    manifestExample: true,
    manifestFields: { includeCurrentValue: true, includeValue: true },
    massIDEvents: createMassIDEvents(
      MANIFEST_VALUE_BEFORE_SORTING,
      MANIFEST_GROSS_WEIGHT,
      MANIFEST_DEDUCTED_WEIGHT,
      MANIFEST_SORTING_VALUE,
    ),
    partialDocument: {
      ...massIDDocument,
      currentValue: MANIFEST_SORTING_VALUE,
    },
    resultComment: RESULT_COMMENTS.passed.SORTING_VALUE_WITHIN_TOLERANCE(0),
    resultStatus: 'PASSED',
    scenario:
      'The sorting value calculation difference is less or equal to 0.1',
  },
  {
    accreditationDocuments: createAccreditationDocuments(sortingFactor),
    actorParticipants,
    manifestFields: { includeCurrentValue: true, includeValue: true },
    massIDEvents: createMassIDEvents(
      valueBeforeSorting,
      grossWeight,
      deductedWeight,
      calculatedSortingValue,
    ),
    partialDocument: {
      ...massIDDocument,
      currentValue: calculatedSortingValue + 1,
    },
    resultComment: RESULT_COMMENTS.failed.DOCUMENT_VALUE_MISMATCH(
      calculatedSortingValue + 1,
      calculatedSortingValue,
    ),
    resultStatus: 'FAILED',
    scenario:
      'The document current value does not match the sorting event value',
  },
  {
    accreditationDocuments: createAccreditationDocuments(sortingFactor),
    actorParticipants,
    manifestExample: true,
    massIDEvents: createMassIDEvents(
      valueBeforeSorting,
      grossWeight,
      deductedWeight,
      wrongSortingValue,
    ),
    partialDocument: { ...massIDDocument, currentValue: wrongSortingValue },
    resultComment: RESULT_COMMENTS.failed.SORTING_VALUE_EXCEEDS_TOLERANCE(
      Math.abs(calculatedSortingValue - wrongSortingValue),
    ),
    resultStatus: 'FAILED',
    scenario: 'The sorting value calculation difference is greater than 0.1',
  },
  {
    accreditationDocuments: createAccreditationDocuments(sortingFactor),
    actorParticipants,
    manifestFields: { includeCurrentValue: true, includeValue: true },
    massIDEvents: createMassIDEvents(
      valueBeforeSorting,
      grossWeight,
      mismatchedDeductedWeight,
      calculatedSortingValue,
    ),
    partialDocument: {
      ...massIDDocument,
      currentValue: calculatedSortingValue,
    },
    resultComment: RESULT_COMMENTS.failed.DEDUCTED_WEIGHT_MISMATCH(
      mismatchedDeductedWeight,
      Number((grossWeight * sortingFactor).toFixed(3)),
    ),
    resultStatus: 'FAILED',
    scenario:
      'The deducted weight does not match the expected value based on sorting factor',
  },
  {
    accreditationDocuments: createAccreditationDocuments(sortingFactor),
    actorParticipants,
    massIDEvents: createMassIDEvents(
      valueBeforeSorting,
      grossWeight + 0.2,
      (grossWeight + 0.2) * sortingFactor,
      calculatedSortingValue,
    ),
    partialDocument: {
      ...massIDDocument,
      currentValue: calculatedSortingValue,
    },
    resultComment: RESULT_COMMENTS.failed.GROSS_WEIGHT_MISMATCH(
      grossWeight + 0.2,
      valueBeforeSorting,
    ),
    resultStatus: 'FAILED',
    scenario: 'The gross weight does not match the previous event value',
  },
];

const invalidSortingValue = new BoldStubsBuilder()
  .createMassIDDocuments({
    externalEventsMap: {
      ['Sorting']: stubBoldMassIDSortingEvent({
        metadataAttributes: [
          {
            format: 'KILOGRAM',
            name: 'Gross Weight',
            value: faker.number.float({ min: 1 }),
          },
          {
            format: 'KILOGRAM',
            name: 'Deducted Weight',
            value: faker.number.float({ min: 0.1 }),
          },
        ],
        partialDocumentEvent: {
          value: 0,
        },
      }),
    },
    partialDocument: {
      externalCreatedAt: addYears(new Date(), 1).toISOString(),
    },
  })
  .createMassIDAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments()
  .build();

interface MassIDSortingErrorTestCase extends RuleTestCase {
  documents: Document[];
  massIDAuditDocument: Document;
}

export const massIDSortingErrorTestCases: MassIDSortingErrorTestCase[] = [
  createErrorTestCase(
    'The MassID document does not exist',
    [...participantsAccreditationDocuments.values()],
    processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
  ),
  createErrorTestCase(
    'The MassID document does not contain external events',
    [
      { ...massIDDocument, externalEvents: [] },
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.MISSING_EXTERNAL_EVENTS,
  ),
  createErrorTestCase(
    'The Recycler accreditation does not exist',
    [massIDDocument],
    processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_ACCREDITATION_DOCUMENT,
  ),
  createErrorTestCase(
    'The MassID document does not contain a Sorting event',
    [
      {
        ...massIDDocument,
        externalEvents: massIDDocument.externalEvents?.filter(
          (event) => event.name !== 'Sorting',
        ),
      },
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.MISSING_SORTING_EVENT,
  ),
  createErrorTestCase(
    'The value after sorting is not valid',
    [
      invalidSortingValue.massIDDocument,
      invalidSortingValue.massIDAuditDocument,
      ...invalidSortingValue.participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_VALUE_AFTER_SORTING(0),
  ),
  createErrorTestCase(
    'The Recycler accreditation does not contain a Sorting Factor attribute',
    [
      modifyDocumentEvents(massIDDocument, {
        ['Sorting']: stubBoldMassIDSortingEvent({
          metadataAttributes: createWeightAttributes(
            valueBeforeSorting,
            deductedWeight,
          ),
          partialDocumentEvent: {
            value: massIDDocument.externalEvents?.find(
              eventNameIsAnyOf(['Drop-off']),
            )?.value,
          },
        }),
      }),
      {
        ...participantsAccreditationDocuments.get('Recycler'),
        externalEvents: participantsAccreditationDocuments
          .get('Recycler')
          ?.externalEvents?.filter(
            (event) => !event.name.includes('Emissions & Composting Metrics'),
          ),
      } as Document,
    ],
    processorErrors.ERROR_MESSAGE.MISSING_SORTING_FACTOR,
  ),
  createErrorTestCase(
    'The value before sorting is not greater than 0',
    [massIDDocument, ...participantsAccreditationDocuments.values()],
    processorErrors.ERROR_MESSAGE.INVALID_VALUE_BEFORE_SORTING(0),
  ),
  createErrorTestCase(
    'The gross weight has invalid format',
    [
      modifyDocumentEvents(massIDDocument, {
        ['Drop-off']: {
          ...massIDDocument.externalEvents?.find((e) => e.name === 'Drop-off'),
          value: valueBeforeSorting,
        },
        ['Sorting']: stubBoldMassIDSortingEvent({
          metadataAttributes: createWeightAttributesWithFormat(
            10,
            deductedWeight,
            'CUBIC_METER',
            'KILOGRAM',
          ),
          partialDocumentEvent: { value: calculatedSortingValue },
        }),
      }),
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_GROSS_WEIGHT_FORMAT,
  ),
  createErrorTestCase(
    'The deducted weight has invalid format',
    [
      modifyDocumentEvents(massIDDocument, {
        ['Drop-off']: {
          ...massIDDocument.externalEvents?.find((e) => e.name === 'Drop-off'),
          value: valueBeforeSorting,
        },
        ['Sorting']: stubBoldMassIDSortingEvent({
          metadataAttributes: createWeightAttributesWithFormat(
            valueBeforeSorting,
            5,
            'KILOGRAM',
            'CUBIC_METER',
          ),
          partialDocumentEvent: { value: calculatedSortingValue },
        }),
      }),
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_DEDUCTED_WEIGHT_FORMAT,
  ),
  createErrorTestCase(
    'The gross weight is not greater than 0',
    [
      modifyDocumentEvents(massIDDocument, {
        ['Drop-off']: {
          ...massIDDocument.externalEvents?.find((e) => e.name === 'Drop-off'),
          value: valueBeforeSorting,
        },
        ['Sorting']: stubBoldMassIDSortingEvent({
          metadataAttributes: createWeightAttributes(0, deductedWeight),
          partialDocumentEvent: { value: calculatedSortingValue },
        }),
      }),
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_GROSS_WEIGHT(0),
  ),
  createErrorTestCase(
    'The deducted weight is not greater than 0',
    [
      modifyDocumentEvents(massIDDocument, {
        ['Drop-off']: {
          ...massIDDocument.externalEvents?.find((e) => e.name === 'Drop-off'),
          value: valueBeforeSorting,
        },
        ['Sorting']: stubBoldMassIDSortingEvent({
          metadataAttributes: createWeightAttributes(valueBeforeSorting, 0),
          partialDocumentEvent: { value: calculatedSortingValue },
        }),
      }),
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_DEDUCTED_WEIGHT(0),
  ),
  createErrorTestCase(
    'The gross weight has valid value but invalid format',
    [
      modifyDocumentEvents(massIDDocument, {
        ['Drop-off']: {
          ...massIDDocument.externalEvents?.find((e) => e.name === 'Drop-off'),
          value: valueBeforeSorting,
        },
        ['Sorting']: stubBoldMassIDSortingEvent({
          metadataAttributes: createWeightAttributesWithFormat(
            15,
            8,
            'CUBIC_METER',
            'KILOGRAM',
          ),
          partialDocumentEvent: { value: 7 },
        }),
      }),
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_GROSS_WEIGHT_FORMAT,
  ),
  createErrorTestCase(
    'The deducted weight has valid value but invalid format',
    [
      modifyDocumentEvents(massIDDocument, {
        ['Drop-off']: {
          ...massIDDocument.externalEvents?.find((e) => e.name === 'Drop-off'),
          value: valueBeforeSorting,
        },
        ['Sorting']: stubBoldMassIDSortingEvent({
          metadataAttributes: createWeightAttributesWithFormat(
            15,
            8,
            'KILOGRAM',
            'CUBIC_METER',
          ),
          partialDocumentEvent: { value: 7 },
        }),
      }),
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_DEDUCTED_WEIGHT_FORMAT,
  ),
  createErrorTestCase(
    'The deducted weight is greater than or equal to gross weight',
    [
      modifyDocumentEvents(massIDDocument, {
        ['Drop-off']: {
          ...massIDDocument.externalEvents?.find((e) => e.name === 'Drop-off'),
          value: valueBeforeSorting,
        },
        ['Sorting']: stubBoldMassIDSortingEvent({
          metadataAttributes: createWeightAttributes(5, 10),
          partialDocumentEvent: { value: calculatedSortingValue },
        }),
      }),
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_WEIGHT_COMPARISON(10, 5),
  ),
];
