import type {
  DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventAttributeValue,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';

export const replaceMetadataAttributeValue = (
  documentEvent: DocumentEvent,
  attributeName: DocumentEventAttributeName,
  newValue: DocumentEventAttributeValue,
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
