import { MassIDActorType } from '@carrot-fndn/shared/methodologies/bold/types';
import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './mass-id-sorting.constants';
import { MassIDSortingProcessorErrors } from './mass-id-sorting.errors';
import { ruleDefinition } from './mass-id-sorting.rule-definition';

export const MASS_ID_SORTING_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new MassIDSortingProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'ERROR.INVALID_DEDUCTED_WEIGHT': { defaultOwner: 'INTEGRATOR' },
    'ERROR.INVALID_DEDUCTED_WEIGHT_FORMAT': { defaultOwner: 'INTEGRATOR' },
    'ERROR.INVALID_GROSS_WEIGHT': { defaultOwner: 'INTEGRATOR' },
    'ERROR.INVALID_GROSS_WEIGHT_FORMAT': { defaultOwner: 'INTEGRATOR' },
    'ERROR.INVALID_VALUE_AFTER_SORTING': { defaultOwner: 'INTEGRATOR' },
    'ERROR.INVALID_VALUE_BEFORE_SORTING': { defaultOwner: 'INTEGRATOR' },
    'ERROR.INVALID_WEIGHT_COMPARISON': { defaultOwner: 'INTEGRATOR' },
    'ERROR.MASS_ID_DOCUMENT_NOT_FOUND': { defaultOwner: 'CARROT' },
    'ERROR.MISSING_EXTERNAL_EVENTS': { defaultOwner: 'INTEGRATOR' },
    'ERROR.MISSING_RECYCLER_ACCREDITATION_DOCUMENT': {
      defaultOwner: 'TO_CONFIRM',
    },
    'ERROR.MISSING_SORTING_EVENT': { defaultOwner: 'INTEGRATOR' },
    'ERROR.MISSING_SORTING_FACTOR': {
      defaultOwner: 'RECYCLER',
      dependsOnAccreditation: MassIDActorType.RECYCLER,
    },
    'FAILED.DEDUCTED_WEIGHT_MISMATCH': {
      defaultOwner: 'INTEGRATOR',
      dependsOnAccreditation: MassIDActorType.RECYCLER,
    },
    'FAILED.DOCUMENT_VALUE_MISMATCH': { defaultOwner: 'INTEGRATOR' },
    'FAILED.GROSS_WEIGHT_MISMATCH': { defaultOwner: 'INTEGRATOR' },
    'FAILED.MISSING_SORTING_DESCRIPTION': { defaultOwner: 'INTEGRATOR' },
    'FAILED.SORTING_VALUE_EXCEEDS_TOLERANCE': { defaultOwner: 'INTEGRATOR' },
  },
);
