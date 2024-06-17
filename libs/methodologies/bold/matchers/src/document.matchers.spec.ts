import { stubDocumentReference } from '@carrot-fndn/methodologies/bold/testing';
import {
  DocumentCategory,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/methodologies/bold/types';

import {
  CERTIFICATE,
  CERTIFICATE_AUDIT,
  CREDIT_CERTIFICATES,
  type DocumentMatch,
  DocumentMatcher,
  MASS,
  MASS_VALIDATION,
} from './document.matchers';

describe('Document Matchers', () => {
  describe('matches', () => {
    it('should return true if document has the same values passed in match', () => {
      const documentMatch: DocumentMatch = {
        category: DocumentCategory.MASS,
        subtype: DocumentSubtype.AGRO_INDUSTRIAL,
        type: DocumentType.ORGANIC,
      };
      const documentReference = stubDocumentReference(documentMatch);

      const documentMatcher = new DocumentMatcher(documentMatch);

      const matchesResult = documentMatcher.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if document has at least one value different from those passed in match', () => {
      const documentMatch: DocumentMatch = {
        category: DocumentCategory.MASS,
        subtype: DocumentSubtype.AGRO_INDUSTRIAL,
        type: DocumentType.ORGANIC,
      };
      const documentReference = stubDocumentReference(documentMatch);

      const documentMatcher = new DocumentMatcher({
        ...documentMatch,
        type: DocumentType.MASS_VALIDATION,
      });

      const matchesResult = documentMatcher.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });

  describe('MASS', () => {
    it('should return true if the document category is Mass', () => {
      const documentReference = stubDocumentReference({
        category: MASS.match.category,
      });

      const matchesResult = MASS.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Mass', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.METHODOLOGY,
      });

      const matchesResult = MASS.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });

  describe('MASS_VALIDATION', () => {
    it('should return true if the document category is Methodology and type is Mass Validation', () => {
      const documentReference = stubDocumentReference({
        category: MASS_VALIDATION.match.category,
        type: MASS_VALIDATION.match.type,
      });

      const matchesResult = MASS_VALIDATION.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.MASS,
        type: MASS_VALIDATION.match.type,
      });

      const matchesResult = MASS_VALIDATION.matches(documentReference);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document type is not Mass Validation', () => {
      const documentReference = stubDocumentReference({
        category: MASS_VALIDATION.match.category,
        type: DocumentType.ORGANIC,
      });

      const matchesResult = MASS_VALIDATION.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });

  describe('CERTIFICATE_AUDIT', () => {
    it('should return true if the document category is Methodology and type is Certificate Audit', () => {
      const documentReference = stubDocumentReference({
        category: CERTIFICATE_AUDIT.match.category,
        subtype: CERTIFICATE_AUDIT.match.subtype,
        type: CERTIFICATE_AUDIT.match.type,
      });

      const matchesResult = CERTIFICATE_AUDIT.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.MASS,
        type: CERTIFICATE_AUDIT.match.type,
      });

      const matchesResult = CERTIFICATE_AUDIT.matches(documentReference);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document type is not Certificate Audit', () => {
      const documentReference = stubDocumentReference({
        category: CERTIFICATE_AUDIT.match.category,
        type: DocumentType.MASS_VALIDATION,
      });

      const matchesResult = CERTIFICATE_AUDIT.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });

  describe('CERTIFICATE', () => {
    it('should return true if the document category is Methodology and type is Certificate', () => {
      const documentReference = stubDocumentReference({
        category: CERTIFICATE.match.category,
        type: CERTIFICATE.match.type,
      });

      const matchesResult = CERTIFICATE.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.MASS,
        type: CERTIFICATE.match.type,
      });

      const matchesResult = CERTIFICATE.matches(documentReference);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document type is not Certificate', () => {
      const documentReference = stubDocumentReference({
        category: CERTIFICATE.match.category,
        type: DocumentType.MASS_VALIDATION,
      });

      const matchesResult = CERTIFICATE.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });

  describe('CREDIT_CERTIFICATES', () => {
    it('should return true if the document category is Methodology and type is Credit Certificates', () => {
      const documentReference = stubDocumentReference({
        category: CREDIT_CERTIFICATES.match.category,
        subtype: CREDIT_CERTIFICATES.match.subtype,
        type: CREDIT_CERTIFICATES.match.type,
      });

      const matchesResult = CREDIT_CERTIFICATES.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.MASS,
        type: CREDIT_CERTIFICATES.match.type,
      });

      const matchesResult = CREDIT_CERTIFICATES.matches(documentReference);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document type is not Credit Certificates', () => {
      const documentReference = stubDocumentReference({
        category: CREDIT_CERTIFICATES.match.category,
        type: DocumentType.MASS_VALIDATION,
      });

      const matchesResult = CREDIT_CERTIFICATES.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });
});
