import {
  type BoldDocument,
  BoldDocumentCategory,
  BoldDocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { faker } from '@faker-js/faker';

import { stubDocument } from '../stubs';
import { mergeEventsMaps } from './bold.builder.helpers';
import { type StubBoldDocumentParameters } from './bold.stubs.types';

export const stubBoldCertificateDocument = ({
  externalEventsMap,
  partialDocument,
}: StubBoldDocumentParameters = {}): BoldDocument => ({
  ...stubDocument(
    {
      type: faker.helpers.arrayElement([
        BoldDocumentType.GAS_ID,
        BoldDocumentType.RECYCLED_ID,
      ]),
      ...partialDocument,
      category: BoldDocumentCategory.METHODOLOGY,
      externalEvents: [
        ...mergeEventsMaps(new Map(), externalEventsMap ?? {}).values(),
        ...(partialDocument?.externalEvents ?? []),
      ],
    },
    false,
  ),
});
