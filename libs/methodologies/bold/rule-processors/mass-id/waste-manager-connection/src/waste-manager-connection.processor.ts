import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';
import type { RuleInput } from '@carrot-fndn/shared/rule/types';

import { isNil, toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  loadConnectionEvidence,
  loadDocument,
  toConnectionEvidenceKey,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  and,
  eventLabelIsAnyOf,
  eventNameIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  BoldDocumentEventLabel,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleStandardDataProcessor } from '@carrot-fndn/shared/rule/standard-data-processor';

import type {
  WasteManagerConnectionInput,
  WasteManagerConnectionRuleSubject,
} from './waste-manager-connection.types';

import { WASTE_MANAGER } from './waste-manager-connection.constants';
import { evaluateWasteManagerConnection } from './waste-manager-connection.helpers';

const { ACTOR, DROP_OFF } = BoldDocumentEventName;
const { WASTE_GENERATOR } = BoldDocumentEventLabel;

const singleOrUndefined = <T>(values: T[]): T | undefined =>
  values.length === 1 ? values[0] : undefined;

export class WasteManagerConnectionProcessor extends RuleStandardDataProcessor<
  WasteManagerConnectionInput,
  WasteManagerConnectionRuleSubject
> {
  protected override evaluateResult(
    ruleSubject: WasteManagerConnectionRuleSubject,
  ): EvaluateResultOutput {
    return evaluateWasteManagerConnection(ruleSubject);
  }

  protected override getRuleSubject({
    connectionEvidence,
    executionDocumentId,
    massIDDocument,
  }: WasteManagerConnectionInput): WasteManagerConnectionRuleSubject {
    const events = massIDDocument.externalEvents ?? [];
    const actorParticipantIds = (label: string) => [
      ...new Set(
        events
          .filter(and(eventNameIsAnyOf([ACTOR]), eventLabelIsAnyOf([label])))
          .map((event) => event.participant.id),
      ),
    ];

    return {
      connectionEvidence,
      dropOffDate: singleOrUndefined(
        events.filter(eventNameIsAnyOf([DROP_OFF])),
      )?.externalCreatedAt,
      executionDocumentId,
      massIDDocumentId: massIDDocument.id,
      wasteGeneratorParticipantId: singleOrUndefined(
        actorParticipantIds(WASTE_GENERATOR),
      ),
      wasteManagerParticipantIds: actorParticipantIds(WASTE_MANAGER),
    };
  }

  protected override async loadDocument(
    ruleInput: RuleInput,
  ): Promise<undefined | WasteManagerConnectionInput> {
    const { documentId, documentKeyPrefix, parentDocumentId } = ruleInput;
    const massIDDocument = await loadDocument(
      this.context.documentLoaderService,
      toDocumentKey({ documentId: parentDocumentId, documentKeyPrefix }),
    );

    if (isNil(massIDDocument)) {
      return undefined;
    }

    return {
      connectionEvidence: await loadConnectionEvidence(
        toConnectionEvidenceKey({ documentId, documentKeyPrefix }),
      ),
      executionDocumentId: documentId,
      massIDDocument,
    };
  }
}
