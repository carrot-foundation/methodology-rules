import { MassIDActorType } from '@carrot-fndn/shared/methodologies/bold/types';
import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './prevented-emissions.constants';
import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import { ruleDefinition } from './prevented-emissions.rule-definition';

export const PREVENTED_EMISSIONS_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new PreventedEmissionsProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'ERROR.INVALID_BASELINES': {
      defaultOwner: 'RECYCLER',
      dependsOnAccreditation: MassIDActorType.RECYCLER,
    },
    'ERROR.INVALID_CLASSIFICATION_ID': { defaultOwner: 'INTEGRATOR' },
    'ERROR.INVALID_MASS_ID_DOCUMENT_SUBTYPE': { defaultOwner: 'INTEGRATOR' },
    'ERROR.INVALID_RULE_SUBJECT': { defaultOwner: 'INTEGRATOR' },
    'ERROR.MISSING_GREENHOUSE_GAS_TYPE': {
      defaultOwner: 'RECYCLER',
      dependsOnAccreditation: MassIDActorType.RECYCLER,
    },
    'ERROR.MISSING_MASS_ID_DOCUMENT': { defaultOwner: 'CARROT' },
    'ERROR.MISSING_RECYCLER_ACCREDITATION_DOCUMENT': {
      defaultOwner: 'TO_CONFIRM',
    },
    'ERROR.SUBTYPE_CDM_CODE_MISMATCH': { defaultOwner: 'INTEGRATOR' },
    'FAILED.MISSING_EXCEEDING_EMISSION_COEFFICIENT': {
      defaultOwner: 'RECYCLER',
      dependsOnAccreditation: MassIDActorType.RECYCLER,
    },
    'FAILED.MISSING_RECYCLING_BASELINE_FOR_WASTE_SUBTYPE': {
      defaultOwner: 'RECYCLER',
      dependsOnAccreditation: MassIDActorType.RECYCLER,
    },
    'FAILED.OTHERS_IF_ORGANIC_NO_CARBON_FRACTION': { defaultOwner: 'RECYCLER' },
    'REVIEW_REQUIRED.OTHERS_IF_ORGANIC_AWAITING_LAUDO': {
      defaultOwner: 'RECYCLER',
    },
    'REVIEW_REQUIRED.OTHERS_IF_ORGANIC_EXPIRED_FRACTION': {
      defaultOwner: 'RECYCLER',
    },
  },
);
