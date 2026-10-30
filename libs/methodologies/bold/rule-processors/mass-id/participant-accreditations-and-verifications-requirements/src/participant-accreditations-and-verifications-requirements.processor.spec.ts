import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  expectRuleFindings,
  findTestCase,
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAccreditationStatus,
  BoldAttributeName,
  type BoldDocument,
  BoldDocumentEventName,
  MassIDActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { PARTICIPANT_ACCREDITATIONS_AND_VERIFICATIONS_REQUIREMENTS_FINDINGS } from './participant-accreditations-and-verifications-requirements.findings';
import { ParticipantAccreditationsAndVerificationsRequirementsProcessor } from './participant-accreditations-and-verifications-requirements.processor';
import { participantAccreditationsAndVerificationsRequirementsTestCases } from './participant-accreditations-and-verifications-requirements.test-cases';

describe('ParticipantAccreditationsAndVerificationsRequirementsProcessor', () => {
  const ruleDataProcessor =
    new ParticipantAccreditationsAndVerificationsRequirementsProcessor();

  it.each([
    {
      at: '2024-06-15T12:00:00.000Z',
      duplicateEffectiveDate: undefined,
      expected: 'PASSED',
      scenario: 'one leaf has historical and future renewal periods',
    },
    {
      at: '2025-06-15T12:00:00.000Z',
      duplicateEffectiveDate: undefined,
      expected: 'PASSED',
      scenario: 'one leaf has an expired period followed by a renewal',
    },
    {
      at: '2025-06-15T12:00:00.000Z',
      duplicateEffectiveDate: undefined,
      expected: 'PASSED',
      firstExpirationDate: '2026-12-31T00:00:00.000Z',
      scenario: 'one leaf has two overlapping approved periods',
    },
    {
      at: '2024-06-15T12:00:00.000Z',
      duplicateEffectiveDate: '2024-01-01T00:00:00.000Z',
      expected: 'FAILED',
      scenario: 'two processor leaves are valid at the historical mass date',
    },
    {
      at: '2024-06-15T12:00:00.000Z',
      duplicateEffectiveDate: '2025-01-01T00:00:00.000Z',
      expected: 'PASSED',
      scenario: 'a second processor leaf is only effective after the mass date',
    },
  ])(
    'should return $expected when $scenario',
    async ({
      at,
      duplicateEffectiveDate,
      expected,
      firstExpirationDate = '2024-12-31T00:00:00.000Z',
    }) => {
      const {
        massIDAuditDocument,
        massIDDocument,
        participantsAccreditationDocuments,
      } = new BoldStubsBuilder()
        .createMassIDDocuments({ partialDocument: { externalCreatedAt: at } })
        .createMassIDAuditDocuments({
          partialDocument: { externalCreatedAt: '2030-01-01T00:00:00.000Z' },
        })
        .createMethodologyDocument()
        .createParticipantAccreditationDocuments()
        .build();
      const { ACCREDITATION_STATUS, EFFECTIVE_DATE, EXPIRATION_DATE } =
        BoldAttributeName;
      const periods = [
        {
          effectiveDate: '2024-01-01T00:00:00.000Z',
          expirationDate: firstExpirationDate,
        },
        {
          effectiveDate: '2025-01-01T00:00:00.000Z',
          expirationDate: '2025-12-31T00:00:00.000Z',
        },
      ].map(({ effectiveDate, expirationDate }) =>
        stubDocumentEventWithMetadataAttributes(
          {
            externalCreatedAt: '2030-01-01T00:00:00.000Z',
            name: BoldDocumentEventName.ACCREDITATION_RESULT,
          },
          [
            [EFFECTIVE_DATE, effectiveDate],
            [EXPIRATION_DATE, expirationDate],
            [ACCREDITATION_STATUS, BoldAccreditationStatus.APPROVED],
          ],
        ),
      );
      const accreditationDocuments: BoldDocument[] = [
        ...participantsAccreditationDocuments.values(),
      ].map((document) => ({
        ...document,
        externalEvents: periods,
      }));

      if (duplicateEffectiveDate) {
        const original = participantsAccreditationDocuments.get(
          MassIDActorType.PROCESSOR,
        )!;

        accreditationDocuments.push(
          stubDocument(
            {
              category: original.category,
              externalEvents: [
                stubDocumentEventWithMetadataAttributes(
                  { name: BoldDocumentEventName.ACCREDITATION_RESULT },
                  [
                    [EFFECTIVE_DATE, duplicateEffectiveDate],
                    [EXPIRATION_DATE, '2025-12-31T00:00:00.000Z'],
                    [ACCREDITATION_STATUS, BoldAccreditationStatus.APPROVED],
                  ],
                ),
              ],
              primaryParticipant: original.primaryParticipant,
              subtype: original.subtype,
              type: original.type,
            },
            false,
          ),
        );
      }

      spyOnDocumentQueryServiceLoad(stubDocument(), [
        massIDAuditDocument,
        massIDDocument,
        ...accreditationDocuments,
      ]);

      const ruleOutput = await ruleDataProcessor.process(
        stubRuleInput({ documentId: massIDAuditDocument.id }),
      );

      expect(ruleOutput.resultStatus).toBe(expected);
      expect(ruleOutput.resultContent).toEqual(
        expected === 'FAILED'
          ? {
              findings: [
                {
                  code: 'participant-accreditations-and-verifications-requirements.ERROR.MULTIPLE_VALID_ACCREDITATIONS_FOR_PARTICIPANT',
                  defaultOwner: 'INTEGRATOR',
                },
              ],
            }
          : undefined,
      );
    },
  );

  it.each(participantAccreditationsAndVerificationsRequirementsTestCases)(
    'should return $resultStatus when $scenario',
    async ({ documents, massIDAuditDocument, resultComment, resultStatus }) => {
      spyOnDocumentQueryServiceLoad(stubDocument(), [
        massIDAuditDocument,
        ...documents,
      ]);

      const ruleInput = stubRuleInput({
        documentId: massIDAuditDocument.id,
      });

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      };

      expect(
        expectRuleFindings(
          ruleOutput,
          PARTICIPANT_ACCREDITATIONS_AND_VERIFICATIONS_REQUIREMENTS_FINDINGS,
        ),
      ).toEqual(expectedRuleOutput);
    },
  );

  it('should report multiple valid accreditations without an accreditation dependency', async () => {
    const { documents, massIDAuditDocument } = findTestCase(
      participantAccreditationsAndVerificationsRequirementsTestCases,
      'The MassID document has a PROCESSOR with multiple valid accreditations (should fail)',
    );

    spyOnDocumentQueryServiceLoad(stubDocument(), [
      massIDAuditDocument,
      ...documents,
    ]);

    const ruleOutput = await ruleDataProcessor.process(
      stubRuleInput({ documentId: massIDAuditDocument.id }),
    );

    expect(ruleOutput.resultContent).toStrictEqual({
      findings: [
        {
          code: 'participant-accreditations-and-verifications-requirements.ERROR.MULTIPLE_VALID_ACCREDITATIONS_FOR_PARTICIPANT',
          defaultOwner: 'INTEGRATOR',
        },
      ],
    });
  });
});
