import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { stubDocumentEntity } from '@carrot-fndn/shared/document/loader/stubs';
import {
  type AccreditationEvaluation,
  type AccreditationHistory,
  selectActorAccreditation,
} from '@carrot-fndn/shared/methodologies/bold/helpers';
import {
  BoldStubsBuilder,
  stubBoldAccreditationResultEvent,
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldDocumentCategory,
  BoldDocumentEventName,
  BoldDocumentSubtype,
  BoldDocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';

import { stubQueryContext } from './document-query.stubs';
import {
  collectAccreditationDocuments,
  loadAccreditationDocumentQuery,
} from './index';

const legacyEvaluationDate = '2026-10-04T12:00:00.000Z';
const methodologyId = 'e8baf090-6c93-4d12-b40d-859230b851ab';

const createEvaluationEvent = (evaluationDate = legacyEvaluationDate) => {
  const evaluation: AccreditationEvaluation = {
    evaluationDate,
    methodologyId,
    methodologyVersion: '1.0.0',
    schemaVersion: '1.0.0',
  };

  return stubDocumentEvent({
    isPublic: false,
    metadata: {
      attributes: [
        {
          isPublic: false,
          name: 'Accreditation Evaluation',
          value: evaluation,
        },
      ],
    },
    name: 'Accreditation Evaluation',
  });
};

const createSerializedHistoryQuery = async (control: string) => {
  const {
    massIDAuditDocument,
    massIDDocument,
    methodologyDocument,
    participantsAccreditationDocuments,
  } = new BoldStubsBuilder()
    .createMassIDDocuments()
    .createMassIDAuditDocuments()
    .createMethodologyDocument()
    .createParticipantAccreditationDocuments()
    .build();
  const leaf = participantsAccreditationDocuments.get('Recycler');

  if (leaf?.parentDocumentId === undefined) {
    throw new Error('Recycler fixture missing');
  }

  const sibling = {
    ...leaf,
    externalEvents: [
      stubDocumentEvent({
        isPublic: false,
        metadata: {
          attributes: [
            {
              isPublic: false,
              name: 'Accreditation History',
              value: { disposition: 'REVOKED' },
            },
          ],
        },
        name: 'Accreditation Revision',
      }),
    ],
    id: 'sibling-revocation',
  };
  const group = stubDocument(
    {
      category: BoldDocumentCategory.METHODOLOGY,
      externalEvents: [
        ...[leaf, sibling].map((document) =>
          stubDocumentEvent({
            name: BoldDocumentEventName.OUTPUT,
            relatedDocument: mapDocumentRelation(document),
          }),
        ),
        stubDocumentEvent({ relatedDocument: undefined }),
      ],
      id: leaf.parentDocumentId,
      parentDocumentId: 'publication-accreditation-root',
      subtype: BoldDocumentSubtype.GROUP,
      type: BoldDocumentType.PARTICIPANT_ACCREDITATION,
    },
    false,
  );
  const root = stubDocument(
    {
      category: BoldDocumentCategory.METHODOLOGY,
      externalEvents: [
        stubDocumentEvent({ relatedDocument: mapDocumentRelation(group) }),
      ],
      id: 'publication-accreditation-root',
      parentDocumentId: methodologyDocument!.id,
      type: 'Participant Accreditations & Verifications',
    },
    false,
  );
  const documents = [
    massIDAuditDocument,
    massIDDocument,
    leaf,
    sibling,
    group,
    root,
  ];

  if (control.startsWith('source-hierarchy')) {
    const history: AccreditationHistory = {
      contentHash: 'a'.repeat(64),
      disposition: 'APPROVED',
      effectiveFrom: '2026-01-01',
      revision: 1,
      revisionId: 'e8baf090-6c93-4d12-b40d-859230b851ac',
      schemaVersion: '1.0.0',
      scope: {
        cycleId: 'fictional-cycle',
        facilityId: leaf.primaryAddress.id,
        methodologyId,
        methodologyVersion: '1.0.0',
        participantId: leaf.primaryParticipant.id,
        role: 'Recycler',
      },
    };
    const revocation: AccreditationHistory = {
      ...history,
      contentHash: 'b'.repeat(64),
      disposition: 'REVOKED',
      effectiveFrom: '2026-07-01',
      revision: 2,
      revisionId: 'e8baf090-6c93-4d12-b40d-859230b851ad',
      supersedesRevisionId: history.revisionId,
    };
    const historyAttribute = {
      isPublic: false,
      name: 'Accreditation History',
      value: history,
    };
    const historyEvent = stubDocumentEvent({
      isPublic: false,
      metadata: { attributes: [historyAttribute] },
      name: 'Accreditation Revision',
      relatedDocument: undefined,
    });

    leaf.externalEvents = [
      stubBoldAccreditationResultEvent({
        metadataAttributes: [
          [BoldAttributeName.EFFECTIVE_DATE, history.effectiveFrom],
          [BoldAttributeName.EXPIRATION_DATE, '2027-12-31'],
        ],
      }),
      historyEvent,
    ];
    sibling.externalEvents = [
      {
        ...historyEvent,
        metadata: {
          attributes: [{ ...historyAttribute, value: revocation }],
        },
      },
    ];
    group.subtype = 'Participant';
    group.externalEvents = [
      stubDocumentEvent({
        name: 'Recycler (2026-2026)',
        relatedDocument: mapDocumentRelation(leaf),
      }),
    ];
    const siblingContainer = {
      ...group,
      externalEvents: [
        stubDocumentEvent({
          name: 'Recycler (2026-2026)',
          relatedDocument: mapDocumentRelation(sibling),
        }),
      ],
      id: 'revocation-participant-container',
    };

    sibling.parentDocumentId = siblingContainer.id;
    root.externalEvents = [group, siblingContainer].map((document) =>
      stubDocumentEvent({
        name: 'Fictional participant verifications',
        relatedDocument: mapDocumentRelation(document),
      }),
    );

    switch (control) {
      case 'source-hierarchy-id-only-revocation': {
        root.externalEvents[1]!.relatedDocument = {
          documentId: siblingContainer.id,
        };

        break;
      }
      case 'source-hierarchy-missing-approval-link': {
        root.externalEvents.shift();

        break;
      }
      case 'source-hierarchy-self-parent': {
        group.parentDocumentId = group.id;
        group.externalEvents.push(
          stubDocumentEvent({ relatedDocument: mapDocumentRelation(group) }),
        );

        break;
      }
      case 'source-hierarchy-wrong-root': {
        root.type = BoldDocumentType.MASS_ID_AUDIT;

        break;
      }
      case 'source-hierarchy-wrong-sibling-parent': {
        siblingContainer.parentDocumentId = 'unavailable-other-root';

        break;
      }

      default: {
        break;
      }
    }

    documents.push(siblingContainer);
  }

  switch (control) {
    case 'id-only-links': {
      group.externalEvents = group.externalEvents?.map((event) => ({
        ...event,
        relatedDocument:
          event.relatedDocument === undefined
            ? undefined
            : { documentId: event.relatedDocument.documentId },
      }));

      break;
    }
    case 'id-only-sibling-link': {
      group.externalEvents![1]!.relatedDocument = {
        documentId: sibling.id,
      };

      break;
    }
    case 'legacy-group-cycle': {
      const cyclicGroup = {
        ...group,
        externalEvents: [
          stubDocumentEvent({ relatedDocument: mapDocumentRelation(group) }),
        ],
        id: 'cyclic-accreditation-group',
        parentDocumentId: group.id,
      };

      group.parentDocumentId = cyclicGroup.id;
      group.externalEvents!.push(
        stubDocumentEvent({
          relatedDocument: mapDocumentRelation(cyclicGroup),
        }),
      );
      documents.push(cyclicGroup);

      break;
    }
    case 'legacy-group-missing-parent': {
      group.parentDocumentId = undefined;

      break;
    }
    case 'legacy-group-missing-root-link': {
      root.externalEvents = [];

      break;
    }
    case 'legacy-group-self-parent': {
      group.parentDocumentId = group.id;
      group.externalEvents!.push(
        stubDocumentEvent({ relatedDocument: mapDocumentRelation(group) }),
      );

      break;
    }
    case 'legacy-group-wrong-root': {
      root.type = BoldDocumentType.MASS_ID_AUDIT;

      break;
    }
    case 'legacy-without-context': {
      documents.splice(documents.indexOf(sibling), 1);
      group.externalEvents = group.externalEvents?.filter(
        (event) => event.relatedDocument?.documentId !== sibling.id,
      );

      break;
    }
    case 'missing-group-events': {
      group.externalEvents = undefined;

      break;
    }
    case 'missing-leaf-link': {
      group.externalEvents = group.externalEvents?.filter(
        (event) => event.relatedDocument?.documentId !== leaf.id,
      );

      break;
    }
    case 'missing-parent': {
      leaf.parentDocumentId = undefined;

      break;
    }
    case 'parent-backlinks': {
      root.externalEvents!.push(
        stubDocumentEvent({
          relatedDocument: mapDocumentRelation(methodologyDocument!),
        }),
      );
      group.externalEvents!.push(
        stubDocumentEvent({ relatedDocument: mapDocumentRelation(root) }),
      );

      break;
    }
    case 'wrong-group': {
      group.subtype = BoldDocumentSubtype.RECYCLER;

      break;
    }
    case 'wrong-sibling-type': {
      group.externalEvents![1]!.relatedDocument!.type =
        BoldDocumentType.MASS_ID_AUDIT;

      break;
    }

    default: {
      break;
    }
  }

  massIDAuditDocument.externalEvents = [
    stubDocumentEvent({ relatedDocument: mapDocumentRelation(leaf) }),
    ...(control === 'source-hierarchy-without-context' ||
    control === 'legacy-without-context'
      ? []
      : [
          createEvaluationEvent(
            control === 'source-hierarchy-historical'
              ? '2026-06-01T12:00:00.000Z'
              : legacyEvaluationDate,
          ),
        ]),
  ];
  vi.spyOn(provideDocumentLoaderService, 'load').mockImplementation(
    ({ key }) => {
      const document = documents.find((candidate) =>
        key.endsWith(`/${candidate.id}.json`),
      );

      if (document === undefined) {
        throw new Error(`Missing fixture: ${key}`);
      }

      const serialized = JSON.stringify(document);

      return Promise.resolve(
        stubDocumentEntity({ document: JSON.parse(serialized) }),
      );
    },
  );
  const query = await loadAccreditationDocumentQuery({
    context: stubQueryContext(),
    documentId: massIDAuditDocument.id,
    documentLoaderService: provideDocumentLoaderService,
    legacyEvaluationDate,
  });

  return { leaf, massIDDocument, query, sibling };
};

describe('collectAccreditationDocuments', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ['source-hierarchy', 'REVOKED'],
    ['source-hierarchy-historical', 'SELECTED'],
    ['source-hierarchy-without-context', 'MALFORMED'],
  ] as const)(
    'should evaluate history across published-shape containers (%s)',
    async (control, status) => {
      const { query } = await createSerializedHistoryQuery(control);
      const subject = await collectAccreditationDocuments(
        query,
        legacyEvaluationDate,
      );

      expect(
        selectActorAccreditation({
          accreditationDocuments: subject.accreditationDocuments,
          evaluation: subject.evaluation,
          massIDDocument: subject.massIDDocument!,
          role: 'Recycler',
        }),
      ).toMatchObject({ status });
    },
  );

  it.each(['healthy', 'source-hierarchy', 'parent-backlinks'])(
    'should preserve full sibling history and private metadata through serialized loading (%s)',
    async (control) => {
      const { leaf, massIDDocument, query, sibling } =
        await createSerializedHistoryQuery(control);
      const subject = await collectAccreditationDocuments(
        query,
        legacyEvaluationDate,
      );

      expect(subject.massIDDocument?.id).toBe(massIDDocument.id);
      expect(subject.accreditationDocuments).toEqual(
        expect.arrayContaining([leaf, sibling]),
      );
      expect(
        subject.accreditationDocuments.find(
          (document) => document.id === sibling.id,
        )?.externalEvents,
      ).toEqual(sibling.externalEvents);
      expect(subject.evaluation).toEqual({
        evaluationDate: legacyEvaluationDate,
        methodologyId,
        methodologyVersion: '1.0.0',
      });
    },
  );

  it.each([
    'missing-parent',
    'wrong-group',
    'missing-leaf-link',
    'missing-group-events',
    'id-only-links',
    'id-only-sibling-link',
    'wrong-sibling-type',
    'source-hierarchy-id-only-revocation',
    'source-hierarchy-missing-approval-link',
    'source-hierarchy-wrong-root',
    'source-hierarchy-wrong-sibling-parent',
    'source-hierarchy-self-parent',
    'legacy-group-missing-parent',
    'legacy-group-missing-root-link',
    'legacy-group-wrong-root',
    'legacy-group-self-parent',
    'legacy-group-cycle',
  ])(
    'should refuse incomplete sibling history through serialized loading (%s)',
    async (control) => {
      const { query } = await createSerializedHistoryQuery(control);

      await expect(
        collectAccreditationDocuments(query, legacyEvaluationDate),
      ).rejects.toThrow('Accreditation history group is missing or incomplete');
    },
  );

  it('should retain genuine legacy-only compatibility without pinned context', async () => {
    const { leaf, query } = await createSerializedHistoryQuery(
      'legacy-without-context',
    );
    const subject = await collectAccreditationDocuments(
      query,
      legacyEvaluationDate,
    );

    expect(subject.accreditationDocuments).toEqual([leaf]);
    expect(subject.evaluation).toEqual({
      evaluationDate: legacyEvaluationDate,
      methodologyId: undefined,
      methodologyVersion: undefined,
    });
    expect(
      selectActorAccreditation({
        accreditationDocuments: subject.accreditationDocuments,
        evaluation: subject.evaluation,
        massIDDocument: subject.massIDDocument!,
        role: 'Recycler',
      }),
    ).toMatchObject({ status: 'SELECTED' });
  });

  it('should return an empty subject for a missing query', async () => {
    expect(
      await collectAccreditationDocuments(undefined, legacyEvaluationDate),
    ).toEqual({
      accreditationDocuments: [],
      evaluation: {
        evaluationDate: legacyEvaluationDate,
        methodologyId: undefined,
        methodologyVersion: undefined,
      },
      massIDDocument: undefined,
    });
  });
});

describe('loadAccreditationDocumentQuery', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([false, true])(
    'should require sibling history only when evaluation context is pinned (%s)',
    async (pinned) => {
      const {
        massIDAuditDocument,
        massIDDocument,
        participantsAccreditationDocuments,
      } = new BoldStubsBuilder()
        .createMassIDDocuments()
        .createMassIDAuditDocuments()
        .createMethodologyDocument()
        .createParticipantAccreditationDocuments()
        .build();
      const leaf = participantsAccreditationDocuments.get('Recycler');

      if (leaf === undefined) {
        throw new Error('Recycler fixture missing');
      }
      massIDAuditDocument.externalEvents = [
        stubDocumentEvent({ relatedDocument: mapDocumentRelation(leaf) }),
      ];

      if (pinned) {
        massIDAuditDocument.externalEvents.push(createEvaluationEvent());
      }
      const documents = [massIDAuditDocument, massIDDocument, leaf];

      vi.spyOn(provideDocumentLoaderService, 'load').mockImplementation(
        ({ key }) => {
          const document = documents.find((candidate) =>
            key.endsWith(`/${candidate.id}.json`),
          );

          if (document === undefined) {
            throw new Error('Missing required history group');
          }

          return Promise.resolve(stubDocumentEntity({ document }));
        },
      );
      const query = await loadAccreditationDocumentQuery({
        context: stubQueryContext(),
        documentId: massIDAuditDocument.id,
        documentLoaderService: provideDocumentLoaderService,
        legacyEvaluationDate,
      });
      const result = query.iterator().map(({ document }) => document);

      let outcome = 'LOADED';

      try {
        await result;
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error;
        }
        outcome = error.message;
      }

      expect(outcome).toBe(
        pinned ? 'Missing required history group' : 'LOADED',
      );
    },
  );
});
