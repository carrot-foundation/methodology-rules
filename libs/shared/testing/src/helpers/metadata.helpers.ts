import type { MethodologyDocumentEventAttributeValue } from '@carrot-fndn/shared/types';

import {
  type DocumentEvent,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';

export const replaceMetadataAttributeValue = (
  documentEvent: DocumentEvent,
  attributeName: NewDocumentEventAttributeName,
  newValue: MethodologyDocumentEventAttributeValue,
): DocumentEvent => {
  const attributes = documentEvent.metadata?.attributes?.map((attribute) => {
    if (attribute.name === String(attributeName)) {
      return {
        ...attribute,
        value: newValue,
      };
    }

    return attribute;
  });

  return {
    ...documentEvent,
    metadata: {
      ...documentEvent.metadata,
      attributes,
    },
  };
};
