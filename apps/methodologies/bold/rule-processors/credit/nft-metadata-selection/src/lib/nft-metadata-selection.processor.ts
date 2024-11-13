import type { NonEmptyArray } from '@carrot-fndn/shared/types';

import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  MASS,
  MASS_CERTIFICATE_AUDIT,
  METHODOLOGY_DEFINITION,
} from '@carrot-fndn/methodologies/bold/matchers';
import {
  type Document,
  type DocumentReference,
} from '@carrot-fndn/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/methodologies/bold/utils';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

import { NFT_METADATA_SELECTION_CRITERIA } from './nft-metadata-selection.constants';
import {
  type MassCertificateMetadata,
  type MethodologyCreditNftMetadataDto,
  type MethodologyMetadata,
  type RewardsDistributionMetadata,
} from './nft-metadata-selection.dto';
import {
  findMassAuditId,
  findMassCertificateIdFromDocumentLinks,
  getImageFromMetadata,
  mapMassMetadata,
  mapMethodologyMetadata,
  mapNftMetadata,
  mapNftMetadataDto,
  mapRewardDistributionMetadata,
} from './nft-metadata-selection.helpers';

export interface DocumentLinks {
  parentDocumentId?: string | undefined;
  relatedDocuments?: DocumentReference[] | undefined;
}

export class NftMetadataSelection extends RuleDataProcessor {
  private async generateDocumentQuery(
    ruleInput: RuleInput,
  ): Promise<DocumentQuery<Document>> {
    const documentQueryService = new DocumentQueryService(
      provideDocumentLoaderService,
    );

    return documentQueryService.load({
      context: {
        s3KeyPrefix: ruleInput.documentKeyPrefix,
      },
      criteria: NFT_METADATA_SELECTION_CRITERIA,
      documentId: ruleInput.documentId,
    });
  }

  private async getRuleSubject(
    documentQuery: DocumentQuery<Document>,
  ): Promise<Omit<MethodologyCreditNftMetadataDto, 'creditDocumentId'>> {
    const documentsLinks = new Map<string, DocumentLinks>();
    const massCertificates = new Map<string, MassCertificateMetadata>();
    const credit = documentQuery.rootDocument;

    let methodologyMetadata: MethodologyMetadata = {} as MethodologyMetadata;
    let rewardsDistribution: RewardsDistributionMetadata =
      {} as RewardsDistributionMetadata;

    await documentQuery.iterator().each(({ document }) => {
      const documentReference = mapDocumentReference(document);

      documentsLinks.set(document.id, {
        parentDocumentId: document.parentDocumentId,
        relatedDocuments: document.externalEvents
          ?.map((event) => event.relatedDocument)
          .filter(Boolean) as DocumentReference[],
      });

      if (MASS.matches(documentReference)) {
        const massAuditId = findMassAuditId(document, documentsLinks);
        const massCertificateId = findMassCertificateIdFromDocumentLinks(
          massAuditId,
          documentsLinks,
        );
        const massCertificate = massCertificates.get(massCertificateId);
        const mass = mapMassMetadata(document);

        if (massCertificate) {
          massCertificate.masses.push(mass);
        } else {
          massCertificates.set(massCertificateId, {
            documentId: massCertificateId,
            masses: [mass],
          });
        }
      }

      if (METHODOLOGY_DEFINITION.matches(documentReference)) {
        methodologyMetadata = mapMethodologyMetadata(document);
      }

      if (MASS_CERTIFICATE_AUDIT.matches(documentReference)) {
        rewardsDistribution = mapRewardDistributionMetadata(document);
      }
    });

    return {
      image: getImageFromMetadata(credit),
      massCertificates: [
        ...massCertificates.values(),
      ] as NonEmptyArray<MassCertificateMetadata>,
      methodology: methodologyMetadata,
      rewardsDistribution,
    };
  }

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const documentQuery = await this.generateDocumentQuery(ruleInput);

    const ruleSubject = await this.getRuleSubject(documentQuery);

    const dto = mapNftMetadataDto(ruleSubject, ruleInput);

    console.log('Temporary log to check the uri value', ruleSubject.image);

    return mapToRuleOutput(ruleInput, RuleOutputStatus.APPROVED, {
      resultContent: mapNftMetadata(dto),
    });
  }
}
