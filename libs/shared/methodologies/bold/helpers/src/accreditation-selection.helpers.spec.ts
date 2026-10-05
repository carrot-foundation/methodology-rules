import {
  stubAddress,
  stubBoldAccreditationDocument,
  stubBoldAccreditationResultEvent,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAccreditationStatus,
  BoldAttributeName,
  type BoldDocument,
  BoldDocumentEventName,
  BoldDocumentSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { faker } from '@faker-js/faker';

import type { AccreditationHistory } from './accreditation-selection.types';

import {
  getAccreditationEvaluationContext,
  selectAccreditation,
  selectActorAccreditation,
} from './index';

const createSelectionFixture = () => {
  const participant = stubParticipant();
  const address = stubAddress({ participantId: participant.id });
  const history: AccreditationHistory = {
    contentHash: 'a'.repeat(64),
    disposition: 'APPROVED',
    effectiveFrom: '2026-01-01',
    revision: 1,
    revisionId: faker.string.uuid(),
    schemaVersion: '1.0.0',
    scope: {
      cycleId: faker.string.uuid(),
      facilityId: address.id,
      methodologyId: faker.string.uuid(),
      methodologyVersion: '1.0.0',
      participantId: participant.id,
      role: BoldDocumentSubtype.RECYCLER,
    },
  };
  const input = {
    evaluationDate: '2026-06-01T12:00:00.000Z',
    facilityId: address.id,
    methodologyId: history.scope.methodologyId,
    methodologyVersion: history.scope.methodologyVersion,
    participantId: participant.id,
    role: BoldDocumentSubtype.RECYCLER,
  };

  const createDocument = (
    overrides: Partial<typeof history> = {},
    options: {
      expirationDate?: string;
      omitResult?: boolean;
      status?: BoldAccreditationStatus;
    } = {},
  ): BoldDocument => {
    const revision = { ...history, ...overrides };
    const facilityAddress = {
      ...address,
      id: revision.scope.facilityId ?? address.id,
    };

    return stubBoldAccreditationDocument({
      externalEventsMap: {
        'Accreditation Revision': stubDocumentEvent({
          isPublic: false,
          metadata: {
            attributes: [
              {
                isPublic: false,
                name: 'Accreditation History',
                value: revision,
              },
            ],
          },
          name: 'Accreditation Revision',
        }),
        [BoldDocumentEventName.ACCREDITATION_RESULT]: options.omitResult
          ? undefined
          : stubBoldAccreditationResultEvent({
              metadataAttributes: [
                [
                  BoldAttributeName.EFFECTIVE_DATE,
                  `${revision.effectiveFrom}T00:00:00.000Z`,
                ],
                [
                  BoldAttributeName.EXPIRATION_DATE,
                  options.expirationDate ?? '2029-12-31T00:00:00.000Z',
                ],
                [
                  BoldAttributeName.ACCREDITATION_STATUS,
                  options.status ?? BoldAccreditationStatus.APPROVED,
                ],
              ],
            }),
        [BoldDocumentEventName.FACILITY_ADDRESS]: stubDocumentEvent({
          address: facilityAddress,
          name: BoldDocumentEventName.FACILITY_ADDRESS,
          participant,
        }),
      },
      partialDocument: {
        primaryAddress: facilityAddress,
        primaryParticipant: participant,
        subtype: revision.scope.role,
      },
    });
  };

  return { createDocument, history, input };
};

const withoutHistory = (document: BoldDocument): BoldDocument => ({
  ...document,
  externalEvents: document.externalEvents?.filter(
    (event) => event.name !== 'Accreditation Revision',
  ),
});

describe('selectAccreditation', () => {
  it.each([false, true])(
    'should refuse a targetless revocation beside approval in either order (%s)',
    (reverse) => {
      const { createDocument, input } = createSelectionFixture();
      const approval = createDocument();
      const revocation = createDocument({
        disposition: 'REVOKED',
        revision: 2,
        revisionId: faker.string.uuid(),
      });
      const documents = [approval, revocation];

      expect(
        selectAccreditation({
          ...input,
          accreditationDocuments: reverse ? documents.toReversed() : documents,
        }),
      ).toMatchObject({ status: 'MALFORMED' });
    },
  );

  it('should select the intended facility independently of document order', () => {
    const { createDocument, history, input } = createSelectionFixture();
    const selected = createDocument();
    const otherFacility = createDocument({
      revisionId: faker.string.uuid(),
      scope: { ...history.scope, facilityId: faker.string.uuid() },
    });

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [otherFacility, selected],
      }),
    ).toMatchObject({ document: { id: selected.id }, status: 'SELECTED' });
    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [selected, otherFacility],
      }),
    ).toMatchObject({ document: { id: selected.id }, status: 'SELECTED' });
  });

  it('should refuse another facility instead of borrowing its approval', () => {
    const { createDocument, input } = createSelectionFixture();

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [createDocument()],
        facilityId: faker.string.uuid(),
      }),
    ).toMatchObject({ status: 'INACTIVE' });
  });

  it('should keep Recycler and Processor approval scopes separate', () => {
    const { createDocument, input } = createSelectionFixture();

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [createDocument()],
        role: BoldDocumentSubtype.PROCESSOR,
      }),
    ).toMatchObject({ status: 'MISSING' });
  });

  it.each(['methodologyId', 'methodologyVersion'] as const)(
    'should require the intended %s instead of inferring it from candidates',
    (field) => {
      const { createDocument, input } = createSelectionFixture();

      expect(
        selectAccreditation({
          ...input,
          accreditationDocuments: [createDocument()],
          [field]: undefined,
        }),
      ).toMatchObject({ status: 'MALFORMED' });
    },
  );

  it('should choose an explicit renewal and preserve the predecessor historically', () => {
    const { createDocument, history, input } = createSelectionFixture();
    const predecessor = createDocument(
      {},
      { expirationDate: '2026-05-31T00:00:00.000Z' },
    );
    const renewal = createDocument({
      effectiveFrom: '2026-06-01',
      predecessorRevisionId: history.revisionId,
      revision: 2,
      revisionId: faker.string.uuid(),
      scope: { ...history.scope, cycleId: faker.string.uuid() },
      supersedesRevisionId: history.revisionId,
    });

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [renewal, predecessor],
      }),
    ).toMatchObject({ document: { id: renewal.id }, status: 'SELECTED' });
    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [predecessor, renewal],
        evaluationDate: '2026-05-01T12:00:00.000Z',
      }),
    ).toMatchObject({ document: { id: predecessor.id }, status: 'SELECTED' });
  });

  it('should revoke only from the explicit effective date', () => {
    const { createDocument, history, input } = createSelectionFixture();
    const predecessor = createDocument();
    const revocation = createDocument(
      {
        disposition: 'REVOKED',
        effectiveFrom: '2026-05-01',
        revision: 2,
        revisionId: faker.string.uuid(),
        supersedesRevisionId: history.revisionId,
      },
      { omitResult: true },
    );

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [predecessor, revocation],
      }),
    ).toMatchObject({ status: 'REVOKED' });
    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [revocation, predecessor],
        evaluationDate: '2026-04-01T12:00:00.000Z',
      }),
    ).toMatchObject({ document: { id: predecessor.id }, status: 'SELECTED' });
  });

  it('should not treat a rejected lineage successor as revocation', () => {
    const { createDocument, history, input } = createSelectionFixture();
    const predecessor = createDocument();
    const rejected = createDocument(
      {
        disposition: 'REJECTED',
        predecessorRevisionId: history.revisionId,
        revision: 2,
        revisionId: faker.string.uuid(),
      },
      { status: BoldAccreditationStatus.REJECTED },
    );

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [rejected, predecessor],
      }),
    ).toMatchObject({ document: { id: predecessor.id }, status: 'SELECTED' });
  });

  it('should refuse rejection carrying a supersession instruction rather than withdraw approval', () => {
    const { createDocument, history, input } = createSelectionFixture();
    const predecessor = createDocument();
    const rejected = createDocument(
      {
        disposition: 'REJECTED',
        revisionId: faker.string.uuid(),
        supersedesRevisionId: history.revisionId,
      },
      { status: BoldAccreditationStatus.REJECTED },
    );

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [predecessor, rejected],
      }),
    ).toMatchObject({ status: 'MALFORMED' });
  });

  it('should never resurrect a superseded approval after its successor expires', () => {
    const { createDocument, history, input } = createSelectionFixture();
    const predecessor = createDocument();
    const successor = createDocument(
      {
        effectiveFrom: '2026-02-01',
        revision: 2,
        revisionId: faker.string.uuid(),
        supersedesRevisionId: history.revisionId,
      },
      { expirationDate: '2026-05-01T00:00:00.000Z' },
    );

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [successor, predecessor],
      }),
    ).toMatchObject({ status: 'INACTIVE' });
  });

  it('should reject competing unsuperseded approvals', () => {
    const { createDocument, input } = createSelectionFixture();

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [
          createDocument(),
          createDocument({ revision: 2, revisionId: faker.string.uuid() }),
        ],
      }),
    ).toMatchObject({ status: 'AMBIGUOUS' });
  });

  it('should reject a missing explicit supersession target', () => {
    const { createDocument, input } = createSelectionFixture();

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [
          createDocument({ supersedesRevisionId: faker.string.uuid() }),
        ],
      }),
    ).toMatchObject({ status: 'MALFORMED' });
  });

  it('should reject supersession across facility scopes', () => {
    const { createDocument, history, input } = createSelectionFixture();

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [
          createDocument(),
          createDocument({
            revision: 2,
            revisionId: faker.string.uuid(),
            scope: { ...history.scope, facilityId: faker.string.uuid() },
            supersedesRevisionId: history.revisionId,
          }),
        ],
      }),
    ).toMatchObject({ status: 'MALFORMED' });
  });

  it('should reject divergent explicit successors', () => {
    const { createDocument, history, input } = createSelectionFixture();

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [
          createDocument(),
          createDocument({
            revision: 2,
            revisionId: faker.string.uuid(),
            supersedesRevisionId: history.revisionId,
          }),
          createDocument({
            revision: 3,
            revisionId: faker.string.uuid(),
            supersedesRevisionId: history.revisionId,
          }),
        ],
      }),
    ).toMatchObject({ status: 'AMBIGUOUS' });
  });

  it('should reject cycles rather than choose a timestamp winner', () => {
    const { createDocument, history, input } = createSelectionFixture();
    const successorId = faker.string.uuid();

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [
          createDocument({ supersedesRevisionId: successorId }),
          createDocument({
            revision: 2,
            revisionId: successorId,
            supersedesRevisionId: history.revisionId,
          }),
        ],
      }),
    ).toMatchObject({ status: 'MALFORMED' });
  });

  it('should deduplicate identical staged documents but refuse conflicting revision identities', () => {
    const { createDocument, history, input } = createSelectionFixture();
    const document = createDocument();

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [document, structuredClone(document)],
      }),
    ).toMatchObject({ document: { id: document.id }, status: 'SELECTED' });
    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [
          document,
          createDocument({
            contentHash: 'b'.repeat(64),
            revisionId: history.revisionId,
          }),
        ],
      }),
    ).toMatchObject({ status: 'MALFORMED' });
  });

  it('should preserve missing-result Integrator compatibility and refuse explicit revocation', () => {
    const { createDocument, history, input } = createSelectionFixture();
    const scope = {
      ...history.scope,
      facilityId: null,
      role: BoldDocumentSubtype.INTEGRATOR,
    };
    const document = createDocument({ scope }, { omitResult: true });

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [document],
        facilityId: null,
        role: BoldDocumentSubtype.INTEGRATOR,
      }),
    ).toMatchObject({ document: { id: document.id }, status: 'SELECTED' });
    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [
          document,
          createDocument(
            {
              disposition: 'REVOKED',
              revision: 2,
              revisionId: faker.string.uuid(),
              scope,
              supersedesRevisionId: history.revisionId,
            },
            { omitResult: true },
          ),
        ],
        facilityId: null,
        role: BoldDocumentSubtype.INTEGRATOR,
      }),
    ).toMatchObject({ status: 'REVOKED' });
  });

  it('should refuse mixed legacy declarations after an effective supersession instead of bypassing revocation', () => {
    const { createDocument, history, input } = createSelectionFixture();
    const scope = {
      ...history.scope,
      facilityId: null,
      role: BoldDocumentSubtype.INTEGRATOR,
    };
    const legacy = withoutHistory(
      createDocument({ scope }, { omitResult: true }),
    );
    const approval = createDocument(
      { effectiveFrom: '2026-02-01', scope },
      { omitResult: true },
    );
    const revocation = createDocument(
      {
        disposition: 'REVOKED',
        effectiveFrom: '2026-05-01',
        revision: 2,
        revisionId: faker.string.uuid(),
        scope,
        supersedesRevisionId: history.revisionId,
      },
      { omitResult: true },
    );
    const mixedInput = {
      ...input,
      accreditationDocuments: [legacy, approval, revocation],
      facilityId: null,
      role: BoldDocumentSubtype.INTEGRATOR,
    };

    expect(selectAccreditation(mixedInput)).toMatchObject({
      status: 'AMBIGUOUS',
    });
    expect(
      selectAccreditation({
        ...mixedInput,
        accreditationDocuments: [revocation, approval, legacy],
      }),
    ).toMatchObject({ status: 'AMBIGUOUS' });
    expect(
      selectAccreditation({
        ...mixedInput,
        evaluationDate: '2026-01-01T12:00:00.000Z',
      }),
    ).toMatchObject({ document: { id: legacy.id }, status: 'SELECTED' });
  });

  it('should preserve ordinary rejected lineage beside a legacy declaration', () => {
    const { createDocument, history, input } = createSelectionFixture();
    const scope = {
      ...history.scope,
      facilityId: null,
      role: BoldDocumentSubtype.INTEGRATOR,
    };
    const legacy = withoutHistory(
      createDocument({ scope }, { omitResult: true }),
    );
    const rejected = createDocument(
      {
        disposition: 'REJECTED',
        predecessorRevisionId: history.revisionId,
        revisionId: faker.string.uuid(),
        scope,
      },
      { omitResult: true },
    );

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [rejected, legacy],
        facilityId: null,
        role: BoldDocumentSubtype.INTEGRATOR,
      }),
    ).toMatchObject({ document: { id: legacy.id }, status: 'SELECTED' });
  });

  it('should treat malformed history as malformed rather than legacy missing metadata', () => {
    const { createDocument, input } = createSelectionFixture();
    const document = createDocument({
      schemaVersion: 'unsupported' as '1.0.0',
    });

    expect(
      selectAccreditation({ ...input, accreditationDocuments: [document] }),
    ).toMatchObject({ status: 'MALFORMED' });
  });

  it('should require one result event independently of event order', () => {
    const { createDocument, input } = createSelectionFixture();
    const document = createDocument();
    const result = stubBoldAccreditationResultEvent({
      metadataAttributes: [
        [
          BoldAttributeName.ACCREDITATION_STATUS,
          BoldAccreditationStatus.REJECTED,
        ],
      ],
    });

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [
          {
            ...document,
            externalEvents: [...(document.externalEvents ?? []), result],
          },
        ],
      }),
    ).toMatchObject({ status: 'MALFORMED' });
    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [
          {
            ...document,
            externalEvents: [result, ...(document.externalEvents ?? [])],
          },
        ],
      }),
    ).toMatchObject({ status: 'MALFORMED' });
  });

  it('should preserve unique matching legacy approval but refuse legacy ambiguity', () => {
    const { createDocument, input } = createSelectionFixture();
    const legacy = withoutHistory(createDocument());

    expect(
      selectAccreditation({ ...input, accreditationDocuments: [legacy] }),
    ).toMatchObject({ document: { id: legacy.id }, status: 'SELECTED' });
    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [legacy, withoutHistory(createDocument())],
      }),
    ).toMatchObject({ status: 'AMBIGUOUS' });
  });

  it('should reject malformed explicit evaluation dates', () => {
    const { createDocument, input } = createSelectionFixture();

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [createDocument()],
        evaluationDate: '2026-02-30',
      }),
    ).toMatchObject({ status: 'MALFORMED' });
  });

  it('should refuse duplicate expiration attributes rather than treat expiration as absent', () => {
    const { createDocument, input } = createSelectionFixture();
    const document = createDocument();
    const result = document.externalEvents?.find(
      (event) => event.name === BoldDocumentEventName.ACCREDITATION_RESULT,
    );

    result?.metadata?.attributes?.push({
      isPublic: false,
      name: BoldAttributeName.EXPIRATION_DATE,
      value: '2020-01-01T00:00:00.000Z',
    });

    expect(
      selectAccreditation({ ...input, accreditationDocuments: [document] }),
    ).toMatchObject({ status: 'MALFORMED' });
  });
});

describe('accreditation metadata and date boundaries', () => {
  it.each([
    'participant',
    'facility',
    'role',
    'owner',
    'public event',
    'public attribute',
    'missing attribute',
    'orphan attribute',
    'duplicate event',
    'duplicate attribute',
    'conflicting document',
  ] as const)(
    'should refuse malformed identity or private history: %s',
    (defect) => {
      const { createDocument, history, input } = createSelectionFixture();
      const document = createDocument();
      const event = document.externalEvents?.find(
        (candidate) => candidate.name === 'Accreditation Revision',
      );

      if (event?.metadata?.attributes === undefined) {
        throw new Error('History fixture missing');
      }
      const attributes = event.metadata.attributes;
      const attribute = attributes[0];

      if (attribute === undefined) {
        throw new Error('History attribute missing');
      }

      if (defect === 'participant') {
        attribute.value = {
          ...history,
          scope: { ...history.scope, participantId: 'another-participant' },
        };
      }

      if (defect === 'facility') {
        attribute.value = {
          ...history,
          scope: { ...history.scope, facilityId: 'another-facility' },
        };
      }

      if (defect === 'role') {
        attribute.value = {
          ...history,
          scope: { ...history.scope, role: 'Processor' },
        };
      }

      if (defect === 'owner') {
        document.primaryAddress = {
          ...document.primaryAddress,
          participantId: 'another-participant',
        };
      }

      if (defect === 'public event') {
        event.isPublic = true;
      }

      if (defect === 'public attribute') {
        attribute.isPublic = true;
      }

      if (defect === 'missing attribute') {
        event.metadata.attributes = undefined;
      }

      if (defect === 'orphan attribute') {
        event.name = 'Unrelated event';
      }

      if (defect === 'duplicate event') {
        document.externalEvents?.push(structuredClone(event));
      }

      if (defect === 'duplicate attribute') {
        attributes.push(structuredClone(attribute));
      }
      const documents =
        defect === 'conflicting document'
          ? [document, { ...document, currentValue: document.currentValue + 1 }]
          : [document];

      expect(
        selectAccreditation({ ...input, accreditationDocuments: documents }),
      ).toMatchObject({ status: 'MALFORMED' });
    },
  );

  it.each(['Recycler', 'Processor', 'Waste Generator'] as const)(
    'should reject null facilities for %s',
    (role) => {
      const { createDocument, history, input } = createSelectionFixture();
      const document = createDocument({
        scope: { ...history.scope, facilityId: null, role },
      });

      expect(
        selectAccreditation({
          ...input,
          accreditationDocuments: [document],
          role,
        }),
      ).toMatchObject({ status: 'MALFORMED' });
    },
  );

  it.each(['Integrator', 'Auditor', 'Hauler'] as const)(
    'should match optional null and exact scope without a specificity priority for %s',
    (role) => {
      const { createDocument, history, input } = createSelectionFixture();
      const actorWide = createDocument({
        scope: { ...history.scope, facilityId: null, role },
      });
      const exact = createDocument({
        revisionId: faker.string.uuid(),
        scope: { ...history.scope, role },
      });

      expect(
        selectAccreditation({
          ...input,
          accreditationDocuments: [actorWide],
          role,
        }),
      ).toMatchObject({ status: 'SELECTED' });
      expect(
        selectAccreditation({
          ...input,
          accreditationDocuments: [actorWide, exact],
          role,
        }),
      ).toMatchObject({ status: 'AMBIGUOUS' });
      expect(
        selectAccreditation({
          ...input,
          accreditationDocuments: [
            createDocument({
              scope: { ...history.scope, facilityId: 'other-facility', role },
            }),
          ],
          role,
        }),
      ).toMatchObject({ status: 'INACTIVE' });
    },
  );

  it.each([
    'invalid effective',
    'invalid expiry',
    'rejected',
    'disagreeing effective',
    'empty result',
  ] as const)('should refuse %s result metadata', (defect) => {
    const { createDocument, input } = createSelectionFixture();
    const document = createDocument();
    const result = document.externalEvents?.find(
      (event) => event.name === BoldDocumentEventName.ACCREDITATION_RESULT,
    );

    if (result === undefined) {
      throw new Error('Result fixture missing');
    }
    let effectiveDate =
      defect === 'invalid effective' ? 'bad-date' : '2026-01-01';

    if (defect === 'disagreeing effective') {
      effectiveDate = '2026-01-02';
    }

    result.metadata = {
      attributes: [
        {
          isPublic: true,
          name: BoldAttributeName.EFFECTIVE_DATE,
          value: effectiveDate,
        },
        {
          isPublic: true,
          name: BoldAttributeName.EXPIRATION_DATE,
          value: defect === 'invalid expiry' ? 'bad-date' : '2026-12-31',
        },
        {
          isPublic: true,
          name: BoldAttributeName.ACCREDITATION_STATUS,
          value: defect === 'rejected' ? 'Rejected' : 'Approved',
        },
      ],
    };

    if (defect === 'empty result') {
      result.metadata = undefined;
    }

    expect(
      selectAccreditation({ ...input, accreditationDocuments: [document] }),
    ).toMatchObject({ status: 'MALFORMED' });
  });

  it('should keep legacy timestamp validation and calendar-day boundaries explicit', () => {
    const { createDocument, input } = createSelectionFixture();
    const legacy = withoutHistory(
      createDocument(
        {},
        { expirationDate: new Date(2026, 5, 1).toISOString() },
      ),
    );
    const future = withoutHistory(
      createDocument({ effectiveFrom: '2027-01-01' }),
    );
    const rejected = withoutHistory(
      createDocument({}, { status: BoldAccreditationStatus.REJECTED }),
    );
    const dateOnly = withoutHistory(
      createDocument({}, { expirationDate: '2026-06-01' }),
    );

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [legacy],
        evaluationDate: new Date(2026, 5, 1, 12).toISOString(),
      }),
    ).toMatchObject({ status: 'SELECTED' });
    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [legacy],
        evaluationDate: '2026-06-03T12:00:00.000Z',
      }),
    ).toMatchObject({ status: 'INACTIVE' });
    expect(
      selectAccreditation({ ...input, accreditationDocuments: [future] }),
    ).toMatchObject({ status: 'INACTIVE' });
    expect(
      selectAccreditation({ ...input, accreditationDocuments: [rejected] }),
    ).toMatchObject({ status: 'REJECTED' });
    expect(
      selectAccreditation({ ...input, accreditationDocuments: [dateOnly] }),
    ).toMatchObject({ status: 'MALFORMED' });
  });

  it('should accept new history through its inclusive UTC expiry day and allow an absent expiry', () => {
    const { createDocument, input } = createSelectionFixture();
    const document = createDocument({}, { expirationDate: '2026-06-01' });
    const noExpiry = createDocument();
    const result = noExpiry.externalEvents?.find(
      (event) => event.name === BoldDocumentEventName.ACCREDITATION_RESULT,
    );

    if (result?.metadata === undefined) {
      throw new Error('Result fixture missing');
    }
    result.metadata.attributes = result.metadata.attributes?.filter(
      (attribute) => attribute.name !== BoldAttributeName.EXPIRATION_DATE,
    );

    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [document],
        evaluationDate: '2026-06-01T23:59:59.000Z',
      }),
    ).toMatchObject({ status: 'SELECTED' });
    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [document],
        evaluationDate: '2026-06-02T00:00:00.000Z',
      }),
    ).toMatchObject({ status: 'INACTIVE' });
    expect(
      selectAccreditation({ ...input, accreditationDocuments: [noExpiry] }),
    ).toMatchObject({ status: 'SELECTED' });
    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [withoutHistory(noExpiry)],
      }),
    ).toMatchObject({ status: 'SELECTED' });
  });

  it('should distinguish genuinely missing candidates and missing required results', () => {
    const { createDocument, input } = createSelectionFixture();
    const document = createDocument({}, { omitResult: true });

    expect(
      selectAccreditation({ ...input, accreditationDocuments: [] }),
    ).toMatchObject({ status: 'MISSING' });
    expect(
      selectAccreditation({ ...input, accreditationDocuments: [document] }),
    ).toMatchObject({ status: 'INACTIVE' });
    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [
          { ...withoutHistory(document), externalEvents: undefined },
        ],
      }),
    ).toMatchObject({ status: 'INACTIVE' });
    expect(
      selectActorAccreditation({
        accreditationDocuments: [],
        evaluation: input,
        massIDDocument: { ...document, externalEvents: undefined },
        role: 'Recycler',
      }),
    ).toMatchObject({ status: 'MISSING' });
    expect(
      selectActorAccreditation({
        accreditationDocuments: [document],
        evaluation: input,
        massIDDocument: { ...document, externalEvents: undefined },
        role: 'Recycler',
      }),
    ).toMatchObject({ status: 'MALFORMED' });
    expect(
      selectAccreditation({
        ...input,
        accreditationDocuments: [document],
        participantId: 'other-participant',
      }),
    ).toMatchObject({ status: 'MISSING' });
  });

  it('should refuse a canonical actor address owned by another participant', () => {
    const { createDocument, input } = createSelectionFixture();
    const document = createDocument();
    const massIDDocument = {
      ...document,
      externalEvents: [
        stubDocumentEvent({
          address: {
            ...document.primaryAddress,
            participantId: 'other-participant',
          },
          label: 'Recycler',
          name: 'ACTOR',
          participant: document.primaryParticipant,
        }),
      ],
    };

    expect(
      selectActorAccreditation({
        accreditationDocuments: [document],
        evaluation: input,
        massIDDocument,
        role: 'Recycler',
      }),
    ).toMatchObject({ status: 'MALFORMED' });
  });
});

describe('getAccreditationEvaluationContext', () => {
  it('should use the private pinned audit context rather than document timestamps', () => {
    const { input } = createSelectionFixture();
    const auditDocument = stubBoldAccreditationDocument({
      externalEventsMap: {
        'Accreditation Evaluation': stubDocumentEvent({
          isPublic: false,
          metadata: {
            attributes: [
              {
                isPublic: false,
                name: 'Accreditation Evaluation',
                value: {
                  evaluationDate: input.evaluationDate,
                  methodologyId: input.methodologyId,
                  methodologyVersion: input.methodologyVersion,
                  schemaVersion: '1.0.0',
                },
              },
            ],
          },
          name: 'Accreditation Evaluation',
        }),
      },
    });

    expect(
      getAccreditationEvaluationContext(
        auditDocument,
        '2029-01-01T00:00:00.000Z',
      ),
    ).toEqual({
      evaluationDate: input.evaluationDate,
      methodologyId: input.methodologyId,
      methodologyVersion: input.methodologyVersion,
    });
  });

  it('should use only the caller-supplied compatibility instant for legacy snapshots', () => {
    const { createDocument } = createSelectionFixture();

    expect(
      getAccreditationEvaluationContext(
        createDocument(),
        '2026-03-01T00:00:00.000Z',
      ),
    ).toEqual({
      evaluationDate: '2026-03-01T00:00:00.000Z',
      methodologyId: undefined,
      methodologyVersion: undefined,
    });
  });

  it('should refuse malformed pinned context rather than fall back to compatibility', () => {
    const { createDocument } = createSelectionFixture();
    const auditDocument = createDocument();

    auditDocument.externalEvents = [
      stubDocumentEvent({ isPublic: false, name: 'Accreditation Evaluation' }),
    ];

    expect(() =>
      getAccreditationEvaluationContext(
        auditDocument,
        '2026-03-01T00:00:00.000Z',
      ),
    ).toThrow('Accreditation evaluation context is malformed');
  });
});

describe('selectActorAccreditation', () => {
  it.each(['healthy', 'foreign-owner-first', 'foreign-owner-last'])(
    'should validate ownership on every duplicate canonical actor (%s)',
    (control) => {
      const { createDocument, input } = createSelectionFixture();
      const document = createDocument();
      const actor = stubDocumentEvent({
        address: document.primaryAddress,
        label: 'Recycler',
        name: 'ACTOR',
        participant: document.primaryParticipant,
      });
      const duplicate = {
        ...actor,
        address: {
          ...actor.address,
          participantId:
            control === 'healthy' ? actor.participant.id : 'other-participant',
        },
      };

      expect(
        selectActorAccreditation({
          accreditationDocuments: [document],
          evaluation: input,
          massIDDocument: {
            ...document,
            externalEvents:
              control === 'foreign-owner-first'
                ? [duplicate, actor]
                : [actor, duplicate],
          },
          role: 'Recycler',
        }),
      ).toMatchObject({
        status: control === 'healthy' ? 'SELECTED' : 'MALFORMED',
      });
    },
  );

  it.each([
    'participant',
    'facility',
    'missing-participant',
    'missing-facility',
  ])('should use an explicit canonical actor scope (%s)', (control) => {
    const { createDocument, input } = createSelectionFixture();
    const document = createDocument();
    const participant =
      control === 'participant'
        ? stubParticipant()
        : document.primaryParticipant;
    const other = {
      ...withoutHistory(createDocument()),
      primaryAddress: stubAddress({ participantId: participant.id }),
      primaryParticipant: participant,
    };
    const massIDDocument = {
      ...document,
      externalEvents: [document, other].map((candidate) =>
        stubDocumentEvent({
          address: candidate.primaryAddress,
          label: 'Recycler',
          name: 'ACTOR',
          participant: candidate.primaryParticipant,
        }),
      ),
    };
    const actorScope: { facilityId?: string; participantId: string } = {
      participantId:
        control === 'missing-participant'
          ? 'missing-participant'
          : document.primaryParticipant.id,
    };

    if (control !== 'participant') {
      actorScope.facilityId =
        control === 'missing-facility'
          ? 'missing-facility'
          : document.primaryAddress.id;
    }

    expect(
      selectActorAccreditation({
        accreditationDocuments: [document, other],
        actorScope,
        evaluation: input,
        massIDDocument,
        role: 'Recycler',
      }),
    ).toMatchObject({
      status: control.startsWith('missing-') ? 'MALFORMED' : 'SELECTED',
    });
  });

  it('should select the canonical ACTOR scope without a traversal-order guess', () => {
    const { createDocument, input } = createSelectionFixture();
    const document = createDocument();
    const massIDDocument = stubBoldAccreditationDocument({
      partialDocument: {
        externalEvents: [
          stubDocumentEvent({
            address: document.primaryAddress,
            label: 'Recycler',
            name: 'ACTOR',
            participant: document.primaryParticipant,
          }),
        ],
      },
    });

    expect(
      selectActorAccreditation({
        accreditationDocuments: [document],
        evaluation: input,
        massIDDocument,
        role: 'Recycler',
      }),
    ).toMatchObject({ document: { id: document.id }, status: 'SELECTED' });
  });

  it('should refuse conflicting actors of the same role', () => {
    const { createDocument, input } = createSelectionFixture();
    const document = createDocument();
    const massIDDocument = stubBoldAccreditationDocument({
      partialDocument: {
        externalEvents: [
          stubDocumentEvent({
            address: document.primaryAddress,
            label: 'Recycler',
            name: 'ACTOR',
            participant: document.primaryParticipant,
          }),
          stubDocumentEvent({ label: 'Recycler', name: 'ACTOR' }),
        ],
      },
    });

    expect(
      selectActorAccreditation({
        accreditationDocuments: [document],
        evaluation: input,
        massIDDocument,
        role: 'Recycler',
      }),
    ).toMatchObject({ status: 'AMBIGUOUS' });
  });
});
