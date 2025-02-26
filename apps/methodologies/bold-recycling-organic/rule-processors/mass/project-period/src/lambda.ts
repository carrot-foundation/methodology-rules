import { ProjectPeriodProcessor } from '@carrot-fndn/methodologies/bold/rule-processors/mass-id';
import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

const instance = new ProjectPeriodProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
