import { stubDocumentReference } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentCategory,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';

import {
  type DocumentMatch,
  DocumentMatcher,
  MASS_ID,
  MASS_ID_AUDIT,
  METHODOLOGY_DEFINITION,
  PARTICIPANT_HOMOLOGATION_GROUP,
  PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH,
  RECYCLED_ID,
  TCC_CREDIT_MATCH,
  TRC_CREDIT_MATCH,
} from './document.matchers';

describe('Document Matchers', () => {
  describe('matches', () => {
    it('should return true if document has the same values passed in match', () => {
      const documentMatch: DocumentMatch = {
        category: DocumentCategory.MASS_ID,
        subtype: DocumentSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
        type: DocumentType.ORGANIC,
      };
      const documentReference = stubDocumentReference(documentMatch);

      const documentMatcher = new DocumentMatcher(documentMatch);

      const matchesResult = documentMatcher.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if document has at least one value different from those passed in match', () => {
      const documentMatch: DocumentMatch = {
        category: DocumentCategory.MASS_ID,
        subtype: DocumentSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
        type: DocumentType.ORGANIC,
      };
      const documentReference = stubDocumentReference(documentMatch);

      const documentMatcher = new DocumentMatcher({
        ...documentMatch,
        type: DocumentType.MASS_ID_AUDIT,
      });

      const matchesResult = documentMatcher.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });

  describe('MASS_ID', () => {
    it('should return true if the document category is Mass ID', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.MASS_ID,
      });

      const matchesResult = MASS_ID.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Mass ID', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.METHODOLOGY,
      });

      const matchesResult = MASS_ID.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });

  describe('MASS_ID_AUDIT', () => {
    it('should return true if the document category is Methodology and type is Mass ID Audit', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.MASS_ID_AUDIT,
      });

      const matchesResult = MASS_ID_AUDIT.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.MASS_ID,
        type: DocumentType.MASS_ID_AUDIT,
      });

      const matchesResult = MASS_ID_AUDIT.matches(documentReference);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document type is not Mass ID Audit', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.ORGANIC,
      });

      const matchesResult = MASS_ID_AUDIT.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });

  describe('RECYCLED_ID', () => {
    it('should return true if the document category is Methodology and type is Recycled ID', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.RECYCLED_ID,
      });

      const matchesResult = RECYCLED_ID.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.MASS_ID,
        type: DocumentType.RECYCLED_ID,
      });

      const matchesResult = RECYCLED_ID.matches(documentReference);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document type is not Recycled ID', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.ORGANIC,
      });

      const matchesResult = RECYCLED_ID.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });

  describe('METHODOLOGY_DEFINITION', () => {
    it('should return true if the document category is Methodology and type is Definition', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.DEFINITION,
      });

      const matchesResult = METHODOLOGY_DEFINITION.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.MASS_ID,
        type: DocumentType.DEFINITION,
      });

      const matchesResult = METHODOLOGY_DEFINITION.matches(documentReference);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document type is not Definition', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.ORGANIC,
      });

      const matchesResult = METHODOLOGY_DEFINITION.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });

  describe('PARTICIPANT_HOMOLOGATION_GROUP', () => {
    it('should return true if document matches category, type and subtype', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.METHODOLOGY,
        subtype: DocumentSubtype.GROUP,
        type: DocumentType.PARTICIPANT_HOMOLOGATION,
      });

      const matchesResult =
        PARTICIPANT_HOMOLOGATION_GROUP.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.MASS_ID,
        subtype: DocumentSubtype.GROUP,
        type: DocumentType.PARTICIPANT_HOMOLOGATION,
      });

      const matchesResult =
        PARTICIPANT_HOMOLOGATION_GROUP.matches(documentReference);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document subtype is not Group', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.METHODOLOGY,
        subtype: DocumentSubtype.TCC,
        type: DocumentType.PARTICIPANT_HOMOLOGATION,
      });

      const matchesResult =
        PARTICIPANT_HOMOLOGATION_GROUP.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });

  describe('PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH', () => {
    it('should return true if document matches category and type', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.PARTICIPANT_HOMOLOGATION,
      });

      const matchesResult =
        PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.MASS_ID,
        type: DocumentType.PARTICIPANT_HOMOLOGATION,
      });

      const matchesResult =
        PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH.matches(documentReference);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document type is not Participant Homologation', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.ORGANIC,
      });

      const matchesResult =
        PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });

  describe('TRC_CREDIT_MATCH', () => {
    it('should return true if document matches category, type and TRC subtype', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.METHODOLOGY,
        subtype: DocumentSubtype.TRC,
        type: DocumentType.CREDIT,
      });

      const matchesResult = TRC_CREDIT_MATCH.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.MASS_ID,
        subtype: DocumentSubtype.TRC,
        type: DocumentType.CREDIT,
      });

      const matchesResult = TRC_CREDIT_MATCH.matches(documentReference);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document subtype is not TRC', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.METHODOLOGY,
        subtype: DocumentSubtype.TCC,
        type: DocumentType.CREDIT,
      });

      const matchesResult = TRC_CREDIT_MATCH.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });

  describe('TCC_CREDIT_MATCH', () => {
    it('should return true if document matches category, type and TCC subtype', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.METHODOLOGY,
        subtype: DocumentSubtype.TCC,
        type: DocumentType.CREDIT,
      });

      const matchesResult = TCC_CREDIT_MATCH.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.MASS_ID,
        subtype: DocumentSubtype.TCC,
        type: DocumentType.CREDIT,
      });

      const matchesResult = TCC_CREDIT_MATCH.matches(documentReference);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document subtype is not TCC', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.METHODOLOGY,
        subtype: DocumentSubtype.TRC,
        type: DocumentType.CREDIT,
      });

      const matchesResult = TCC_CREDIT_MATCH.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });
});
