import {
  BoldStubsBuilder,
  stubBoldHomologationDocumentCloseEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { AvoidedEmissionsProcessorErrors } from './avoided-emissions.errors';
import { RESULT_COMMENTS } from './avoided-emissions.processor';

const {
  PROJECT_EMISSION_CALCULATION_INDEX: PROJECT_EMISION_CALCULATION_INDEX,
} = DocumentEventAttributeName;
const { RECYCLER } = MassIdDocumentActorType;
const { CLOSE } = DocumentEventName;

export const avoidedEmissionsTestCases = [
  {
    homologationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [CLOSE]: stubBoldHomologationDocumentCloseEvent({
              metadataAttributes: [
                [PROJECT_EMISION_CALCULATION_INDEX, undefined],
              ],
            }),
          },
        },
      ],
    ]),
    resultComment: RESULT_COMMENTS.MISSING_INDEX,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the Recycler Homologation document does not have the "${PROJECT_EMISION_CALCULATION_INDEX}" attribute`,
  },
  {
    homologationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [CLOSE]: stubBoldHomologationDocumentCloseEvent({
              metadataAttributes: [[PROJECT_EMISION_CALCULATION_INDEX, 0.8]],
            }),
          },
        },
      ],
    ]),
    massIdDocumentValue: 100,
    resultComment: RESULT_COMMENTS.APPROVED(80, 0.8, 100),
    resultContent: {
      avoidedEmissions: 80,
    },
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the Recycler Homologation document has the "${PROJECT_EMISION_CALCULATION_INDEX}" attribute and was calculated correctly`,
  },
];

const processorErrors = new AvoidedEmissionsProcessorErrors();

const {
  massIdAuditDocument,
  massIdDocument,
  participantsHomologationDocuments,
} = new BoldStubsBuilder()
  .createMassIdDocument()
  .createMassIdAuditDocument()
  .createMethodologyDocuments()
  .createParticipantHomologationDocuments()
  .build();

export const avoidedEmissionsErrorTestCases = [
  {
    documents: [...participantsHomologationDocuments.values()],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_MASS_ID_DOCUMENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the MassID document was not found`,
  },
  {
    documents: [massIdDocument],
    massIdAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_HOMOLOGATION_DOCUMENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the Recycler Homologation document was not found`,
  },
];
