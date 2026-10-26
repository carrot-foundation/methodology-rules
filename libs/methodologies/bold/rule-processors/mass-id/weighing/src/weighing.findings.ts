import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import {
  INVALID_RESULT_COMMENTS,
  NOT_FOUND_RESULT_COMMENTS,
  WRONG_FORMAT_RESULT_COMMENTS,
} from './weighing.constants';
import { WeighingProcessorErrors } from './weighing.errors';
import { ruleDefinition } from './weighing.rule-definition';

export const WEIGHING_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new WeighingProcessorErrors().ERROR_MESSAGE,
    INVALID: INVALID_RESULT_COMMENTS,
    NOT_FOUND: NOT_FOUND_RESULT_COMMENTS,
    WRONG_FORMAT: WRONG_FORMAT_RESULT_COMMENTS,
  },
  {
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'ERROR.INVALID_RULE_SUBJECT': { defaultOwner: 'INTEGRATOR' },
    'ERROR.MASS_ID_DOCUMENT_NOT_FOUND': { defaultOwner: 'CARROT' },
    'ERROR.MISSING_RECYCLER_ACCREDITATION_DOCUMENT': {
      defaultOwner: 'TO_CONFIRM',
    },
    'INVALID.CONTAINER_CAPACITY_FORMAT': { defaultOwner: 'INTEGRATOR' },
    'INVALID.CONTAINER_QUANTITY': { defaultOwner: 'INTEGRATOR' },
    'INVALID.GROSS_WEIGHT_FORMAT': { defaultOwner: 'INTEGRATOR' },
    'INVALID.NET_WEIGHT_CALCULATION': { defaultOwner: 'INTEGRATOR' },
    'INVALID.SCALE_TICKET_EXTRACTION_FAILED': { defaultOwner: 'CARROT' },
    'INVALID.SCALE_TICKET_LAYOUT_NOT_RECOGNIZED': {
      defaultOwner: 'INTEGRATOR',
    },
    'INVALID.SCALE_TICKET_MISSING_SOURCE': { defaultOwner: 'INTEGRATOR' },
    'INVALID.SCALE_TICKET_NET_WEIGHT_MISMATCH': { defaultOwner: 'INTEGRATOR' },
    'INVALID.SCALE_TICKET_UNSUPPORTED_LAYOUT': { defaultOwner: 'CARROT' },
    'INVALID.SCALE_TYPE': { defaultOwner: 'INTEGRATOR' },
    'INVALID.SCALE_TYPE_MISMATCH': { defaultOwner: 'INTEGRATOR' },
    'INVALID.TARE_FORMAT': { defaultOwner: 'INTEGRATOR' },
    'INVALID.TWO_STEP_CONTAINER_TYPE': { defaultOwner: 'INTEGRATOR' },
    'INVALID.TWO_STEP_WEIGHING_EVENT_PARTICIPANT_IDS': {
      defaultOwner: 'INTEGRATOR',
    },
    'INVALID.TWO_STEP_WEIGHING_EVENT_SCALE_TYPE': {
      defaultOwner: 'INTEGRATOR',
    },
    'INVALID.TWO_STEP_WEIGHING_EVENT_VALUES': { defaultOwner: 'INTEGRATOR' },
    'INVALID.VEHICLE_LICENSE_PLATE_FORMAT': { defaultOwner: 'TO_CONFIRM' },
    'INVALID.WEIGHING_CAPTURE_METHOD': { defaultOwner: 'INTEGRATOR' },
    'NOT_FOUND.ACCREDITATION_EVENT': { defaultOwner: 'RECYCLER' },
    'NOT_FOUND.MORE_THAN_TWO_WEIGHING_EVENTS': { defaultOwner: 'INTEGRATOR' },
    'NOT_FOUND.NO_WEIGHING_EVENTS': { defaultOwner: 'INTEGRATOR' },
    'WRONG_FORMAT.CONTAINER_CAPACITY': { defaultOwner: 'INTEGRATOR' },
    'WRONG_FORMAT.CONTAINER_QUANTITY': { defaultOwner: 'INTEGRATOR' },
    'WRONG_FORMAT.CONTAINER_TYPE': { defaultOwner: 'INTEGRATOR' },
    'WRONG_FORMAT.DESCRIPTION': { defaultOwner: 'INTEGRATOR' },
    'WRONG_FORMAT.EVENT_VALUE': { defaultOwner: 'INTEGRATOR' },
    'WRONG_FORMAT.GROSS_WEIGHT': { defaultOwner: 'INTEGRATOR' },
    'WRONG_FORMAT.TARE': { defaultOwner: 'INTEGRATOR' },
  },
);
