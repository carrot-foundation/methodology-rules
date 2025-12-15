export const getAttachmentS3Key = (
  documentId: string,
  attachmentId: string,
): string => `attachments/document/${documentId}/${attachmentId}`;
