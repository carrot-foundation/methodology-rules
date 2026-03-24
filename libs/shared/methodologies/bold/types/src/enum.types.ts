import {
  MethodologyActorTypeSchema,
  MethodologyDocumentEventNameSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

export const BoldMethodologyNameSchema = z.enum([
  'BOLD Carbon',
  'BOLD Recycling',
]);
export type BoldMethodologyName = z.infer<typeof BoldMethodologyNameSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const BoldMethodologyName = BoldMethodologyNameSchema.enum;

export const BoldMethodologySlugSchema = z.enum([
  'bold-carbon',
  'bold-recycling',
]);
export type BoldMethodologySlug = z.infer<typeof BoldMethodologySlugSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const BoldMethodologySlug = BoldMethodologySlugSchema.enum;

export const DocumentCategorySchema = z.enum(['MassID', 'Methodology']);
export type DocumentCategory = z.infer<typeof DocumentCategorySchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentCategory = DocumentCategorySchema.enum;

export const DocumentEventAccreditationStatusSchema = z.enum([
  'Approved',
  'Rejected',
]);
export type DocumentEventAccreditationStatus = z.infer<
  typeof DocumentEventAccreditationStatusSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentEventAccreditationStatus =
  DocumentEventAccreditationStatusSchema.enum;

export const DocumentEventAttachmentLabelSchema = z.enum([
  'Recycling Manifest',
  'Transport Manifest',
  'Weighing Ticket',
]);
export type DocumentEventAttachmentLabel = z.infer<
  typeof DocumentEventAttachmentLabelSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentEventAttachmentLabel =
  DocumentEventAttachmentLabelSchema.enum;

export const DocumentEventAttributeNameSchema = z.enum([
  'Accreditation Status',
  'Approved Exceptions',
  'Baselines',
  'Business Size Declaration',
  'Captured GPS Latitude',
  'Captured GPS Longitude',
  'Container Capacity',
  'Container Quantity',
  'Container Type',
  'Credit Unit Price',
  'Deducted Weight',
  'Description',
  'Document Number',
  'Document Type',
  'Driver Identifier',
  'Driver Identifier Exemption Justification',
  'Effective Date',
  'Evaluation Result',
  'Exceeding Emission Coefficient (per ton)',
  'Exemption Justification',
  'Expiration Date',
  'Greenhouse Gas Type (GHG)',
  'Gross Weight',
  'Issue Date',
  'Local Waste Classification Description',
  'Local Waste Classification ID',
  'Methodology Slug',
  'Receiving Operator Identifier',
  'Recycler Operator Identifier',
  'Reference Year',
  'Required Additional Verifications',
  'Rule Processor Result Content',
  'Rule Result Details',
  'Scale Type',
  'Scale Validation',
  'Slug',
  'Sorting Factor',
  'Tare',
  'Vehicle Description',
  'Vehicle License Plate',
  'Vehicle Type',
  'Waste Origin',
  'Weighing Capture Method',
]);
export type DocumentEventAttributeName = z.infer<
  typeof DocumentEventAttributeNameSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentEventAttributeName = DocumentEventAttributeNameSchema.enum;

export const DocumentEventAttributeValueSchema = z.enum([
  'Large Business',
  'Small Business',
  'Unidentified',
]);
export type DocumentEventAttributeValue = z.infer<
  typeof DocumentEventAttributeValueSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentEventAttributeValue =
  DocumentEventAttributeValueSchema.enum;

export const DocumentEventContainerTypeSchema = z.enum([
  'Bag',
  'Bin',
  'Drum',
  'Pail',
  'Street Bin',
  'Truck',
  'Waste Box',
]);
export type DocumentEventContainerType = z.infer<
  typeof DocumentEventContainerTypeSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentEventContainerType = DocumentEventContainerTypeSchema.enum;

export const DocumentEventNameSchema = z.enum([
  ...MethodologyDocumentEventNameSchema.exclude(['Recycling Baseline']).options,
  'END',
  'MOVE',
]);
export type DocumentEventName = z.infer<typeof DocumentEventNameSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentEventName = DocumentEventNameSchema.enum;

export const DocumentEventRuleSlugSchema = z.enum(['rewards-distribution']);
export type DocumentEventRuleSlug = z.infer<typeof DocumentEventRuleSlugSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentEventRuleSlug = DocumentEventRuleSlugSchema.enum;

export const DocumentEventScaleTypeSchema = z.enum([
  'Bin Scale',
  'Conveyor Belt Scale',
  'Floor Scale',
  'Forklift Scale',
  'Hanging / Crane Scale',
  'Onboard Truck Scale',
  'Pallet Scale',
  'Portable Axle Weigher',
  'Precision / Bench Scale',
  'Weighbridge (Truck Scale)',
]);
export type DocumentEventScaleType = z.infer<
  typeof DocumentEventScaleTypeSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentEventScaleType = DocumentEventScaleTypeSchema.enum;

export const DocumentEventVehicleTypeSchema = z.enum([
  'Bicycle',
  'Boat',
  'Car',
  'Cargo Ship',
  'Cart',
  'Mini Van',
  'Motorcycle',
  'Others',
  'Sludge Pipes',
  'Truck',
]);
export type DocumentEventVehicleType = z.infer<
  typeof DocumentEventVehicleTypeSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentEventVehicleType = DocumentEventVehicleTypeSchema.enum;

export const DocumentEventWeighingCaptureMethodSchema = z.enum([
  'Digital',
  'Manual',
  'Photo (Scale + Cargo)',
  'Transport Manifest',
]);
export type DocumentEventWeighingCaptureMethod = z.infer<
  typeof DocumentEventWeighingCaptureMethodSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentEventWeighingCaptureMethod =
  DocumentEventWeighingCaptureMethodSchema.enum;

export const MassIDOrganicSubtypeSchema = z.enum([
  'Domestic Sludge',
  'EFB similar to Garden, Yard and Park Waste',
  'Food, Food Waste and Beverages',
  'Garden, Yard and Park Waste',
  'Industrial Sludge',
  'Others (if organic)',
  'Tobacco',
  'Wood and Wood Products',
]);
export type MassIDOrganicSubtype = z.infer<typeof MassIDOrganicSubtypeSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const MassIDOrganicSubtype = MassIDOrganicSubtypeSchema.enum;

export const DocumentSubtypeSchema = z.enum([
  ...MassIDOrganicSubtypeSchema.options,
  'Group',
  'Hauler',
  'Integrator',
  'Process',
  'Processor',
  'Recycler',
  'Source',
  'TCC',
  'TRC',
  'Waste Generator',
]);
export type DocumentSubtype = z.infer<typeof DocumentSubtypeSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentSubtype = DocumentSubtypeSchema.enum;

export const DocumentTypeSchema = z.enum([
  'Credit Order',
  'Definition',
  'GasID',
  'MassID Audit',
  'Organic',
  'Participant Accreditation',
  'RecycledID',
]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentType = DocumentTypeSchema.enum;

export const MassIDDocumentActorTypeSchema = MethodologyActorTypeSchema.extract(
  ['Hauler', 'Integrator', 'Processor', 'Recycler', 'Waste Generator'],
);
export type MassIDDocumentActorType = z.infer<
  typeof MassIDDocumentActorTypeSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const MassIDDocumentActorType = MassIDDocumentActorTypeSchema.enum;

export const MeasurementUnitSchema = z.enum(['kg']);
export type MeasurementUnit = z.infer<typeof MeasurementUnitSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const MeasurementUnit = MeasurementUnitSchema.enum;

export const MethodologyBaselineSchema = z.enum([
  'Landfills with flaring of methane gas (and/or capture of biogas)',
  'Landfills without flaring of methane gas',
  'Open-air dump',
]);
export type MethodologyBaseline = z.infer<typeof MethodologyBaselineSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const MethodologyBaseline = MethodologyBaselineSchema.enum;

export const MethodologyDocumentActorTypeSchema =
  MethodologyActorTypeSchema.extract([
    'Community Impact Pool',
    'Methodology Author',
    'Methodology Developer',
    'Network',
  ]);
export type MethodologyDocumentActorType = z.infer<
  typeof MethodologyDocumentActorTypeSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const MethodologyDocumentActorType =
  MethodologyDocumentActorTypeSchema.enum;

export const ReportTypeSchema = z.enum(['CDF', 'MTR']);
export type ReportType = z.infer<typeof ReportTypeSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const ReportType = ReportTypeSchema.enum;
