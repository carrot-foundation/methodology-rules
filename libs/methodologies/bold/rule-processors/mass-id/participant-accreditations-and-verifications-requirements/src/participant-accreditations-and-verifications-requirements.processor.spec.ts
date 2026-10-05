import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  stubAddress,
  stubDocument,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { ParticipantAccreditationsAndVerificationsRequirementsProcessor } from './participant-accreditations-and-verifications-requirements.processor';
import { participantAccreditationsAndVerificationsRequirementsTestCases } from './participant-accreditations-and-verifications-requirements.test-cases';

describe('ParticipantAccreditationsAndVerificationsRequirementsProcessor', () => {
  const ruleDataProcessor =
    new ParticipantAccreditationsAndVerificationsRequirementsProcessor();

  it.each([
    'different-participants',
    'different-facilities',
    'missing-first',
    'missing-second',
    'missing-both',
  ])('should validate each Processor scope (%s)', async (control) => {
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
    const first = participantsAccreditationDocuments.get('Processor');

    if (first === undefined) {
      throw new Error('Processor fixture missing');
    }

    const participant =
      control === 'different-facilities'
        ? first.primaryParticipant
        : stubParticipant();
    const second = {
      ...first,
      id: 'second-processor-accreditation',
      primaryAddress: stubAddress({ participantId: participant.id }),
      primaryParticipant: participant,
    };

    massIDDocument.externalEvents = [
      ...(massIDDocument.externalEvents ?? []),
      stubDocumentEvent({
        address: second.primaryAddress,
        label: 'Processor',
        name: BoldDocumentEventName.ACTOR,
        participant,
      }),
    ];
    const documents = [
      massIDDocument,
      ...participantsAccreditationDocuments.values(),
      second,
    ].filter(
      (document) =>
        !(
          ['missing-both', 'missing-first'].includes(control) &&
          document.id === first.id
        ) &&
        !(
          ['missing-both', 'missing-second'].includes(control) &&
          document.id === second.id
        ),
    );

    spyOnDocumentQueryServiceLoad(massIDAuditDocument, documents);
    const output = await ruleDataProcessor.process(
      stubRuleInput({ documentId: massIDAuditDocument.id }),
    );

    expect(output.resultStatus).toBe(
      control.startsWith('missing-') ? 'FAILED' : 'PASSED',
    );
  });

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

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );
});
