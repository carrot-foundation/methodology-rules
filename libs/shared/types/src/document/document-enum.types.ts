import { z } from 'zod';

export const DataSetNameSchema = z.enum(['PROD', 'PROD_SIMULATION', 'TEST']);
export type DataSetName = z.infer<typeof DataSetNameSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DataSetName = DataSetNameSchema.enum;

export const DocumentStatusSchema = z.enum(['CANCELLED', 'CLOSED', 'OPEN']);
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentStatus = DocumentStatusSchema.enum;

export const DocumentEventAttributeFormatSchema = z.enum([
  'CUBIC_METER',
  'DATE',
  'KILOGRAM',
  'LITER',
]);
export type DocumentEventAttributeFormat = z.infer<
  typeof DocumentEventAttributeFormatSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentEventAttributeFormat =
  DocumentEventAttributeFormatSchema.enum;
