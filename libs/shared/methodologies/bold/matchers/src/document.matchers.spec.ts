import { stubDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentCategory,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';

import {
  CREDIT_ORDER_MATCH,
  type DocumentMatch,
  DocumentMatcher,
  MASS_ID,
  MASS_ID_AUDIT,
  METHODOLOGY_DEFINITION,
  PARTICIPANT_ACCREDITATION_GROUP,
  PARTICIPANT_ACCREDITATION_PARTIAL_MATCH,
  RECYCLED_ID,
} from './document.matchers';

describe('Document Matchers', () => {
  describe('matches', () => {
    it('should return true if document has the same values passed in match', () => {
      const documentMatch: DocumentMatch = {
        category: DocumentCategory.MASS_ID,
        subtype: DocumentSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
        type: DocumentType.ORGANIC,
      };
      const documentRelation = stubDocumentRelation(documentMatch);

      const documentMatcher = new DocumentMatcher(documentMatch);

      const matchesResult = documentMatcher.matches(documentRelation);

      expect(matchesResult).toBe(true);
    });

    it('should return false if document has at least one value different from those passed in match', () => {
      const documentMatch: DocumentMatch = {
        category: DocumentCategory.MASS_ID,
        subtype: DocumentSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
        type: DocumentType.ORGANIC,
      };
      const documentRelation = stubDocumentRelation(documentMatch);

      const documentMatcher = new DocumentMatcher({
        ...documentMatch,
        type: DocumentType.MASS_ID_AUDIT,
      });

      const matchesResult = documentMatcher.matches(documentRelation);

      expect(matchesResult).toBe(false);
    });
  });

  describe('MASS_ID', () => {
    it('should return true if the document category is Mass ID', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.MASS_ID,
      });

      const matchesResult = MASS_ID.matches(documentRelation);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Mass ID', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.METHODOLOGY,
      });

      const matchesResult = MASS_ID.matches(documentRelation);

      expect(matchesResult).toBe(false);
    });
  });

  describe('MASS_ID_AUDIT', () => {
    it('should return true if the document category is Methodology and type is Mass ID Audit', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.MASS_ID_AUDIT,
      });

      const matchesResult = MASS_ID_AUDIT.matches(documentRelation);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.MASS_ID,
        type: DocumentType.MASS_ID_AUDIT,
      });

      const matchesResult = MASS_ID_AUDIT.matches(documentRelation);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document type is not Mass ID Audit', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.ORGANIC,
      });

      const matchesResult = MASS_ID_AUDIT.matches(documentRelation);

      expect(matchesResult).toBe(false);
    });
  });

  describe('RECYCLED_ID', () => {
    it('should return true if the document category is Methodology and type is Recycled ID', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.RECYCLED_ID,
      });

      const matchesResult = RECYCLED_ID.matches(documentRelation);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.MASS_ID,
        type: DocumentType.RECYCLED_ID,
      });

      const matchesResult = RECYCLED_ID.matches(documentRelation);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document type is not Recycled ID', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.ORGANIC,
      });

      const matchesResult = RECYCLED_ID.matches(documentRelation);

      expect(matchesResult).toBe(false);
    });
  });

  describe('METHODOLOGY_DEFINITION', () => {
    it('should return true if the document category is Methodology and type is Definition', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.DEFINITION,
      });

      const matchesResult = METHODOLOGY_DEFINITION.matches(documentRelation);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.MASS_ID,
        type: DocumentType.DEFINITION,
      });

      const matchesResult = METHODOLOGY_DEFINITION.matches(documentRelation);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document type is not Definition', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.ORGANIC,
      });

      const matchesResult = METHODOLOGY_DEFINITION.matches(documentRelation);

      expect(matchesResult).toBe(false);
    });
  });

  describe('PARTICIPANT_ACCREDITATION_GROUP', () => {
    it('should return true if document matches category, type and subtype', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.METHODOLOGY,
        subtype: DocumentSubtype.GROUP,
        type: DocumentType.PARTICIPANT_ACCREDITATION,
      });

      const matchesResult =
        PARTICIPANT_ACCREDITATION_GROUP.matches(documentRelation);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.MASS_ID,
        subtype: DocumentSubtype.GROUP,
        type: DocumentType.PARTICIPANT_ACCREDITATION,
      });

      const matchesResult =
        PARTICIPANT_ACCREDITATION_GROUP.matches(documentRelation);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document subtype is not Group', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.METHODOLOGY,
        subtype: DocumentSubtype.TCC,
        type: DocumentType.PARTICIPANT_ACCREDITATION,
      });

      const matchesResult =
        PARTICIPANT_ACCREDITATION_GROUP.matches(documentRelation);

      expect(matchesResult).toBe(false);
    });
  });

  describe('PARTICIPANT_ACCREDITATION_PARTIAL_MATCH', () => {
    it('should return true if document matches category and type', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.PARTICIPANT_ACCREDITATION,
      });

      const matchesResult =
        PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(documentRelation);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.MASS_ID,
        type: DocumentType.PARTICIPANT_ACCREDITATION,
      });

      const matchesResult =
        PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(documentRelation);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document type is not Participant Accreditation', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.ORGANIC,
      });

      const matchesResult =
        PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(documentRelation);

      expect(matchesResult).toBe(false);
    });
  });

  describe('CREDIT_ORDER_MATCH', () => {
    it('should return true if document matches category and type', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.METHODOLOGY,
        type: DocumentType.CREDIT_ORDER,
      });

      const matchesResult = CREDIT_ORDER_MATCH.matches(documentRelation);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentRelation = stubDocumentRelation({
        category: DocumentCategory.MASS_ID,
        type: DocumentType.CREDIT_ORDER,
      });

      const matchesResult = CREDIT_ORDER_MATCH.matches(documentRelation);

      expect(matchesResult).toBe(false);
    });
  });
});
