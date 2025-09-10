import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

import { stubDocument } from '@carrot-fndn/shared/methodologies/bold/testing';

import { optimizeDocumentJsonForValidation } from './ai-attachment-validator.helpers';

describe('optimizeDocumentJsonForValidation', () => {
  it('should transform minimal valid document correctly', () => {
    const minimalDocument: Document = {
      ...stubDocument(),
      externalEvents: undefined,
    };

    const result = optimizeDocumentJsonForValidation(minimalDocument);

    expect(result).toBeDefined();
    expect(result.id).toBe(minimalDocument.id);
    expect(result.category).toBe(minimalDocument.category);
    expect(result.events).toEqual(undefined);
    expect(result.measurementUnit).toBe(minimalDocument.measurementUnit);
    expect(typeof result.addresses).toBe('object');
    expect(typeof result.participants).toBe('object');
  });

  it('should transform complete document data correctly', () => {
    const completeDocument: Document = stubDocument();

    const result = optimizeDocumentJsonForValidation(completeDocument);

    expect(result).toBeDefined();
    expect(result.id).toBe(completeDocument.id);
    expect(result.category).toBe(completeDocument.category);
    expect(result.currentValue).toBe(completeDocument.currentValue);
    expect(result.externalCreatedAt).toBe(completeDocument.externalCreatedAt);
    expect(result.externalId).toBe(completeDocument.externalId);
    expect(result.status).toBe(completeDocument.status);
    expect(result.subtype).toBe(completeDocument.subtype);
    expect(result.type).toBe(completeDocument.type);
    expect(result.measurementUnit).toBe(completeDocument.measurementUnit);
  });

  it('should handle events mapping correctly', () => {
    const documentWithEvents: Document = stubDocument();

    const result = optimizeDocumentJsonForValidation(documentWithEvents);

    expect(result.events).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);

    if (
      documentWithEvents.externalEvents &&
      documentWithEvents.externalEvents.length > 0
    ) {
      expect(result.events?.length).toBeGreaterThan(0);

      const event = result.events?.[0];

      expect(event).toBeDefined();
      expect(event?.id).toBeDefined();
      expect(event?.name).toBeDefined();
      expect(event?.addressId).toBeDefined();
      expect(event?.participantId).toBeDefined();
    }
  });

  it('should handle events without attachments', () => {
    const documentWithEvents: Document = {
      ...stubDocument(),
      externalEvents: [],
    };

    const result = optimizeDocumentJsonForValidation(documentWithEvents);

    expect(result.events).toHaveLength(0);
  });

  it('should handle empty or null values correctly', () => {
    const documentWithNulls: Document = {
      ...stubDocument(),
      externalEvents: [],
      externalId: undefined,
      subtype: undefined,
      type: undefined,
    };

    const result = optimizeDocumentJsonForValidation(documentWithNulls);

    expect(result.events).toEqual([]);
    expect(result.externalId).toBeUndefined();
    expect(result.subtype).toBeUndefined();
    expect(result.type).toBeUndefined();
  });

  it('should verify all required fields are present in output', () => {
    const document: Document = stubDocument();

    const result = optimizeDocumentJsonForValidation(document);

    // Verify all OptimizedDocumentJson fields are present
    expect(result).toHaveProperty('addresses');
    expect(result).toHaveProperty('category');
    expect(result).toHaveProperty('currentValue');
    expect(result).toHaveProperty('events');
    expect(result).toHaveProperty('externalCreatedAt');
    expect(result).toHaveProperty('externalId');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('measurementUnit');
    expect(result).toHaveProperty('participants');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('subtype');
    expect(result).toHaveProperty('type');
  });

  it('should verify data types are correctly transformed', () => {
    const document: Document = stubDocument();

    const result = optimizeDocumentJsonForValidation(document);

    expect(typeof result.addresses).toBe('object');
    expect(typeof result.category).toBe('string');
    expect(typeof result.currentValue).toBe('number');
    expect(Array.isArray(result.events)).toBe(true);
    expect(typeof result.externalCreatedAt).toBe('string');
    expect(typeof result.id).toBe('string');
    expect(result.measurementUnit).toBe(document.measurementUnit);
    expect(typeof result.participants).toBe('object');
    expect(typeof result.status).toBe('string');
  });

  it('should map primary address correctly', () => {
    const document: Document = stubDocument();

    const result = optimizeDocumentJsonForValidation(document);

    const primaryAddress = document.primaryAddress;
    const addressId = primaryAddress.id;
    const mappedAddress = result.addresses[addressId];

    expect(mappedAddress).toBeDefined();
    expect(mappedAddress?.city).toBe(primaryAddress.city);
    expect(mappedAddress?.country).toBe(primaryAddress.countryCode);
    expect(mappedAddress?.lat).toBe(primaryAddress.latitude);
    expect(mappedAddress?.lng).toBe(primaryAddress.longitude);
    expect(mappedAddress?.num).toBe(primaryAddress.number);
    expect(mappedAddress?.state).toBe(primaryAddress.countryState);
    expect(mappedAddress?.street).toBe(primaryAddress.street);
    expect(mappedAddress?.zip).toBe(primaryAddress.zipCode);
  });

  it('should map primary participant correctly', () => {
    const document: Document = stubDocument();

    const result = optimizeDocumentJsonForValidation(document);

    const primaryParticipant = document.primaryParticipant;
    const participantId = primaryParticipant.id;
    const mappedParticipant = result.participants[participantId];

    expect(mappedParticipant).toBeDefined();
    expect(mappedParticipant?.country).toBe(primaryParticipant.countryCode);
    expect(mappedParticipant?.name).toBe(primaryParticipant.name);
    expect(mappedParticipant?.taxId).toBe(primaryParticipant.piiSnapshotId);
    expect(mappedParticipant?.type).toBe(primaryParticipant.type);
  });
});
