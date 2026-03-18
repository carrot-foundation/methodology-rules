import type { AnyObject } from '@carrot-fndn/shared/types';

import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

export interface PostProcessInput {
  output: {
    artifactChecksum: string;
    comment?: string;
    content?: AnyObject | undefined;
    sourceCodeUrl: string;
    sourceCodeVersion: string;
    status: RuleOutputStatus;
  };
  taskToken: string;
}
