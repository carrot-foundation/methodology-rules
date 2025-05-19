import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { CompostingCycleTimeframeProcessor } from './composting-cycle-timeframe.processor';

const instance = new CompostingCycleTimeframeProcessor();

export const compostingCycleTimeframeLambda =
  wrapRuleIntoLambdaHandler(instance);
