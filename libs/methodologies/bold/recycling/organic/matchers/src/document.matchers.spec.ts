import { stubDocumentReference } from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  DocumentCategory,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';

import {
  CREDIT_CERTIFICATES,
  type DocumentMatch,
  DocumentMatcher,
  MASS,
  MASS_AUDIT,
  MASS_CERTIFICATE,
  MASS_CERTIFICATE_AUDIT,
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
        type: DocumentType.MASS_AUDIT,
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

  describe('MASS_AUDIT', () => {
    it('should return true if the document category is Methodology and type is Mass Audit', () => {
      const documentReference = stubDocumentReference({
        category: MASS_AUDIT.match.category,
        type: MASS_AUDIT.match.type,
      });

      const matchesResult = MASS_AUDIT.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.MASS,
        type: MASS_AUDIT.match.type,
      });

      const matchesResult = MASS_AUDIT.matches(documentReference);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document type is not Mass Audit', () => {
      const documentReference = stubDocumentReference({
        category: MASS_AUDIT.match.category,
        type: DocumentType.ORGANIC,
      });

      const matchesResult = MASS_AUDIT.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });

  describe('MASS_CERTIFICATE_AUDIT', () => {
    it('should return true if the document category is Methodology and type is Mass Certificate Audit', () => {
      const documentReference = stubDocumentReference({
        category: MASS_CERTIFICATE_AUDIT.match.category,
        subtype: MASS_CERTIFICATE_AUDIT.match.subtype,
        type: MASS_CERTIFICATE_AUDIT.match.type,
      });

      const matchesResult = MASS_CERTIFICATE_AUDIT.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.MASS,
        type: MASS_CERTIFICATE_AUDIT.match.type,
      });

      const matchesResult = MASS_CERTIFICATE_AUDIT.matches(documentReference);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document type is not Mass Certificate Audit', () => {
      const documentReference = stubDocumentReference({
        category: MASS_CERTIFICATE_AUDIT.match.category,
        type: DocumentType.MASS_AUDIT,
      });

      const matchesResult = MASS_CERTIFICATE_AUDIT.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });

  describe('MASS_CERTIFICATE', () => {
    it('should return true if the document category is Methodology and type is MassCertificate', () => {
      const documentReference = stubDocumentReference({
        category: MASS_CERTIFICATE.match.category,
        type: MASS_CERTIFICATE.match.type,
      });

      const matchesResult = MASS_CERTIFICATE.matches(documentReference);

      expect(matchesResult).toBe(true);
    });

    it('should return false if the document category is not Methodology', () => {
      const documentReference = stubDocumentReference({
        category: DocumentCategory.MASS,
        type: MASS_CERTIFICATE.match.type,
      });

      const matchesResult = MASS_CERTIFICATE.matches(documentReference);

      expect(matchesResult).toBe(false);
    });

    it('should return false if the document type is not MassCertificate', () => {
      const documentReference = stubDocumentReference({
        category: MASS_CERTIFICATE.match.category,
        type: DocumentType.MASS_AUDIT,
      });

      const matchesResult = MASS_CERTIFICATE.matches(documentReference);

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
        type: DocumentType.MASS_AUDIT,
      });

      const matchesResult = CREDIT_CERTIFICATES.matches(documentReference);

      expect(matchesResult).toBe(false);
    });
  });
});
