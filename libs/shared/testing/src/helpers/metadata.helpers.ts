import type { MethodologyDocumentEventAttributeValue } from '@carrot-fndn/shared/types';

import {
  type DocumentEvent,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';

export const replaceMetadataAttributeValue = (
  documentEvent: DocumentEvent,
  attributeName: DocumentEventAttributeName,
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
