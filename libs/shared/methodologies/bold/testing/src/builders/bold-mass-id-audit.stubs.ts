import type {
  BoldDocument,
  BoldDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { isNil } from '@carrot-fndn/shared/helpers';
import {
  BoldAttributeName,
  BoldDocumentCategory,
  BoldDocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '../stubs';
import { mergeEventsMaps } from './bold.builder.helpers';
import { type StubBoldDocumentParameters } from './bold.stubs.types';

const { EVALUATION_RESULT } = BoldAttributeName;
const { PASSED } = RuleOutputStatus;

const resultEventName = `Result: MassID ${PASSED}`;

const boldMassIDAuditExternalEventsMap: Map<string, BoldDocumentEvent> =
  new Map([
    [
      resultEventName,
      stubDocumentEventWithMetadataAttributes(
        {
          name: resultEventName,
        },
        [[EVALUATION_RESULT, PASSED]],
      ),
    ],
  ]);

export const stubBoldMassIDAuditDocument = ({
  externalEventsMap,
  partialDocument,
}: StubBoldDocumentParameters = {}): BoldDocument => {
  const mergedEventsMap = isNil(externalEventsMap)
    ? boldMassIDAuditExternalEventsMap
    : mergeEventsMaps(boldMassIDAuditExternalEventsMap, externalEventsMap);

  return {
    ...stubDocument(
      {
        ...partialDocument,
        category: BoldDocumentCategory.METHODOLOGY,
        externalEvents: [
          ...mergedEventsMap.values(),
          ...(partialDocument?.externalEvents ?? []),
        ],
        type: BoldDocumentType.MASS_ID_AUDIT,
      },
      false,
    ),
  };
};
