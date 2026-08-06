import type { ReviewReason } from '@carrot-fndn/shared/document-extractor';

export interface NotValidatedEntry {
  attributeName?: string;
  eventName: string;
}

export type PrivacyFlagField =
  | 'isPublic'
  | 'preserveSensitiveData'
  | 'sensitive';

export interface PrivacyFlagsResultContent {
  notValidated: NotValidatedEntry[];
  reviewReasons: PrivacyReviewReason[];
}

export interface PrivacyReviewReason extends ReviewReason {
  actual: boolean | undefined;
  attributeName?: string;
  eventLabel?: string;
  eventName: string;
  expected: boolean;
  field: PrivacyFlagField;
}
