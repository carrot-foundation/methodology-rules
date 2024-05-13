import type {
  IRuleDataProcessor,
  RuleInput,
  RuleOutput,
} from '@carrot-fndn/shared/rule/types';

import {
  DocumentLoaderService,
  provideDocumentLoaderService,
} from '@carrot-fndn/shared/document/loader';

export interface AppContext {
  documentLoaderService: DocumentLoaderService;
}

export const defaultAppContext: AppContext = {
  documentLoaderService: provideDocumentLoaderService,
};

export abstract class RuleDataProcessor<Context extends AppContext = AppContext>
  implements IRuleDataProcessor
{
  protected context: Context;

  constructor(context?: Omit<Context, keyof AppContext> & Partial<AppContext>) {
    this.context = {
      ...(defaultAppContext as Context),
      ...context,
    };
  }

  abstract process(data: RuleInput): Promise<RuleOutput>;
}
