import type { AnyObject } from '@carrot-fndn/shared/types';
import type { tags } from 'typia';

import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

export interface PostProcessInput {
  output: {
    artifactChecksum: string;
    comment?: string;
    content?: AnyObject | undefined;
    sourceCodeUrl: string & tags.Format<'url'>;
    sourceCodeVersion: string;
    status: RuleOutputStatus;
  };
  taskToken: string;
}
