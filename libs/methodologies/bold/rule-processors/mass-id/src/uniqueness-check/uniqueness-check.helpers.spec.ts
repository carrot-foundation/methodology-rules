import { AuditApiService } from '@carrot-fndn/shared/methodologies/audit-api';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentCategory } from '@carrot-fndn/shared/methodologies/bold/types';

import * as helpers from './uniqueness-check.helpers';

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

  describe('findRequiredEvents', () => {
    it('should return null if required events are missing', () => {
      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument()
        .build();

      massIdDocument.externalEvents = [];

      const result = helpers.findRequiredEvents(massIdDocument);

      expect(result).toBeNull();
    });

    it('should find all required events when present', () => {
      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument()
        .build();

      const result = helpers.findRequiredEvents(massIdDocument);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('pickUpEvent');
      expect(result).toHaveProperty('dropOffEvent');
      expect(result).toHaveProperty('wasteGeneratorEvent');
      expect(result).toHaveProperty('recyclerEvent');
    });
  });

  describe('createNewFormatQuery', () => {
    it('should create a valid query object with proper structure', () => {
      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument()
        .build();

      const events = helpers.findRequiredEvents(massIdDocument);

      const query = helpers.createNewFormatQuery(
        massIdDocument,
        events as helpers.RequiredEvents,
      );

      expect(query).toHaveProperty('match.$and');
      expect(query.match.$and).toBeInstanceOf(Array);
      expect(query.match.$and).toHaveLength(4);
      expect(query.match).toHaveProperty('category', massIdDocument.category);
      expect(query.match).toHaveProperty('type', massIdDocument.type);
      expect(query.match).toHaveProperty('subtype', massIdDocument.subtype);
    });
  });

  describe('createOldFormatQuery', () => {
    it('should create a valid query object with proper structure', () => {
      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument()
        .build();

      const events = helpers.findRequiredEvents(massIdDocument);

      const query = helpers.createOldFormatQuery(
        massIdDocument,
        events as helpers.RequiredEvents,
      );

      expect(query).toHaveProperty('match.$and');
      expect(query.match.$and).toBeInstanceOf(Array);
      expect(query.match.$and).toHaveLength(4);
    });
  });

  describe('fetchSimilarMassIdDocumentsImpl', () => {
    it('should return empty array if required events are missing', async () => {
      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument()
        .build();

      massIdDocument.externalEvents = [];

      const result = await helpers.fetchSimilarMassIdDocuments(
        massIdDocument,
        mockAuditApiService as unknown as AuditApiService,
      );

      expect(result).toEqual([]);
      expect(mockCheckDuplicateDocuments).not.toHaveBeenCalled();
    });

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

      const result = await helpers.fetchSimilarMassIdDocuments(
        massIdDocument,
        mockAuditApiService as unknown as AuditApiService,
      );

      expect(result).toEqual([...newFormatDuplicates, ...oldFormatDuplicates]);

      expect(mockCheckDuplicateDocuments).toHaveBeenCalledTimes(2);

      const { calls } = mockCheckDuplicateDocuments.mock;

      expect(calls.length).toBeGreaterThanOrEqual(2);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(calls[0][0].match.category).toBe(massIdDocument.category);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(calls[1][0].match.category).toBe(DocumentCategory.MASS);
    });
  });
});
