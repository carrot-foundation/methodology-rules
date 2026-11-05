import { MassIDActorType } from '@carrot-fndn/shared/methodologies/bold/types';

import {
  INVALID_LOCAL_WASTE_CLASSIFICATION_ID_META,
  MASS_ID_DOCUMENT_NOT_FOUND_META,
  MASS_ID_WITHOUT_EVENTS_META,
  MISSING_PICK_UP_EVENT_META,
  MISSING_RECYCLER_ACCREDITATION_DOCUMENT_META,
} from './mass-id-finding-meta';
import { defineRuleFindings } from './rule-findings';

describe('mass-id finding meta', () => {
  it('should let every shared meta back a rule finding', () => {
    const findings = defineRuleFindings(
      'test-rule',
      {
        ERROR: {
          INVALID_ID: 'invalid id',
          MISSING_ACCREDITATION: 'missing accreditation',
          MISSING_EVENTS: 'missing events',
          MISSING_PICK_UP: 'missing pick-up',
          NOT_FOUND: 'not found',
        },
      },
      {
        'ERROR.INVALID_ID': INVALID_LOCAL_WASTE_CLASSIFICATION_ID_META,
        'ERROR.MISSING_ACCREDITATION':
          MISSING_RECYCLER_ACCREDITATION_DOCUMENT_META,
        'ERROR.MISSING_EVENTS': MASS_ID_WITHOUT_EVENTS_META,
        'ERROR.MISSING_PICK_UP': MISSING_PICK_UP_EVENT_META,
        'ERROR.NOT_FOUND': MASS_ID_DOCUMENT_NOT_FOUND_META,
      },
    );

    expect(findings.finding('ERROR.MISSING_ACCREDITATION')).toStrictEqual({
      code: 'test-rule.ERROR.MISSING_ACCREDITATION',
      defaultOwner: 'TO_CONFIRM',
      dependsOnAccreditation: MassIDActorType.RECYCLER,
    });
    expect(findings.finding('ERROR.NOT_FOUND')).toStrictEqual({
      code: 'test-rule.ERROR.NOT_FOUND',
      defaultOwner: 'CARROT',
    });
  });
});
