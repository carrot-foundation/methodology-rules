import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import {
  type DocumentQueryCriteria,
  RELATED_DOCUMENT_CRITERIA,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Calculates prevented emissions in kg CO2e based on the waste subtype, recycler accreditation baselines, exceeding emission coefficient, and gas type configuration.',
  events: [BoldDocumentEventName.PICK_UP],
  input: RELATED_DOCUMENT_CRITERIA,
  name: 'Prevented Emissions',
  slug: 'prevented-emissions',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition<DocumentQueryCriteria>;
