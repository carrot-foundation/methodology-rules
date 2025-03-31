import type { AuditApiService } from '@carrot-fndn/shared/methodologies/audit-api';

import {
  BoldStubsBuilder,
  stubBoldMassIdDropOffEvent,
  stubBoldMassIdPickUpEvent,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentCategory } from '@carrot-fndn/shared/methodologies/bold/types';
import { type NonEmptyString } from '@carrot-fndn/shared/types';

import * as helpers from './uniqueness-check.helpers';

const { MASS, MASS_ID } = DocumentCategory;

const mockCheckDuplicateDocuments = jest.fn();
const mockAuditApiService = {
  checkDuplicateDocuments: mockCheckDuplicateDocuments,
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('./uniqueness-check.helpers', () => ({
  ...jest.requireActual('./uniqueness-check.helpers'),
  createAuditApiService: () => mockAuditApiService,
}));

describe('uniqueness-check.helpers', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockCheckDuplicateDocuments.mockReset();
  });

  describe('mapMassIdV2Query', () => {
    it('should create a valid query object with proper structure', () => {
      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument()
        .build();

      const eventsData: helpers.EventsData = {
        dropOffEvent: stubBoldMassIdDropOffEvent(),
        pickUpEvent: stubBoldMassIdPickUpEvent(),
        recyclerEvent: stubDocumentEvent(),
        vehicleLicensePlate: 'ABC123',
        wasteGeneratorEvent: stubDocumentEvent(),
      };

      const query = helpers.mapMassIdV2Query(massIdDocument, eventsData);

      expect(query).toHaveProperty('match.$and');
      expect(query.match.$and).toBeInstanceOf(Array);
      expect(query.match.$and).toHaveLength(4);
      expect(query.match).toHaveProperty('category', MASS_ID);
      expect(query.match).toHaveProperty('type', massIdDocument.type);
      expect(query.match).toHaveProperty('subtype', massIdDocument.subtype);
    });
  });

  describe('createOldFormatQuery', () => {
    it('should create a valid query object with proper structure', () => {
      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument()
        .build();

      const eventsData: helpers.EventsData = {
        dropOffEvent: stubBoldMassIdDropOffEvent(),
        pickUpEvent: stubBoldMassIdPickUpEvent(),
        recyclerEvent: stubDocumentEvent(),
        vehicleLicensePlate: 'ABC123',
        wasteGeneratorEvent: stubDocumentEvent(),
      };

      const query = helpers.mapMassIdV1Query(massIdDocument, eventsData);

      expect(query).toHaveProperty('match.$and');
      expect(query.match.category).toBe(MASS);
      expect(query.match.$and).toBeInstanceOf(Array);
      expect(query.match.$and).toHaveLength(4);
    });
  });

  describe('fetchSimilarMassIdDocumentsImpl', () => {
    it('should call API with both new and old format queries and combine results', async () => {
      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument()
        .build();

      const newFormatDuplicates = [
        { id: 'new1', metadata: {}, status: 'OPEN' },
        { id: 'new2', metadata: {}, status: 'CANCELLED' },
      ];
      const oldFormatDuplicates = [
        { id: 'old1', metadata: {}, status: 'OPEN' },
      ];

      mockCheckDuplicateDocuments
        .mockResolvedValueOnce(newFormatDuplicates)
        .mockResolvedValueOnce(oldFormatDuplicates);

      const eventsData: helpers.EventsData = {
        dropOffEvent: stubBoldMassIdDropOffEvent(),
        pickUpEvent: stubBoldMassIdPickUpEvent(),
        recyclerEvent: stubDocumentEvent(),
        vehicleLicensePlate: 'ABC123',
        wasteGeneratorEvent: stubDocumentEvent(),
      };

      const result = await helpers.fetchSimilarMassIdDocuments({
        auditApiService: mockAuditApiService as unknown as AuditApiService,
        document: massIdDocument,
        eventsData,
      });

      expect(result).toEqual([...newFormatDuplicates, ...oldFormatDuplicates]);

      expect(mockCheckDuplicateDocuments).toHaveBeenCalledTimes(2);

      const { calls } = mockCheckDuplicateDocuments.mock;

      expect(calls.length).toBeGreaterThanOrEqual(2);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(calls[0][0].match.category).toBe(MASS_ID);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(calls[1][0].match.category).toBe(MASS);
    });
  });

  describe('createLicensePlateRegex', () => {
    it('should create a regex that matches the exact license plate value', () => {
      const licensePlate = 'ABC123';
      const regex = helpers.createLicensePlateRegex(
        licensePlate as NonEmptyString,
      );

      expect(regex).toBe('^ABC123$');

      const pattern = new RegExp(regex);

      expect(pattern.test('ABC123')).toBe(true);
      expect(pattern.test('abc123')).toBe(false);
      expect(pattern.test('ABC1234')).toBe(false);
      expect(pattern.test('AB123')).toBe(false);
    });

    it('should remove whitespace from the license plate value', () => {
      const licensePlate = ' A BC 123 ';
      const regex = helpers.createLicensePlateRegex(
        licensePlate as NonEmptyString,
      );

      expect(regex).toBe('^ABC123$');

      const pattern = new RegExp(regex);

      expect(pattern.test('ABC123')).toBe(true);
      expect(pattern.test(' A BC 123 ')).toBe(false);
    });

    it('should escape special regex characters in the license plate', () => {
      const licensePlate = 'A.B*C(1)2?3';
      const regex = helpers.createLicensePlateRegex(
        licensePlate as NonEmptyString,
      );

      expect(regex).toContain('\\.');
      expect(regex).toContain('\\*');
      expect(regex).toContain('\\(');
      expect(regex).toContain('\\)');
      expect(regex).toContain('\\?');

      const pattern = new RegExp(regex);

      expect(pattern.test('A.B*C(1)2?3')).toBe(true);
      expect(pattern.test('ABC123')).toBe(false);
    });
  });
});
