import { ProjectPeriodProcessor } from '@carrot-fndn/methodologies/bold/rule-processors/mass-id';
import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

const instance = new ProjectPeriodProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
