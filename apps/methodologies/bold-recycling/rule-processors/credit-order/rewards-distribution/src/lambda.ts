import { RECYCLED_ID } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { rewardsDistributionLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/credit-order/rewards-distribution';

export const handler = rewardsDistributionLambda(RECYCLED_ID);
