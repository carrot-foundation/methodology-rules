import {
  CloudWatchClient,
  PutMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';
import { getOrDefault } from '@carrot-fndn/shared/helpers';
import { NonEmptyString } from '@carrot-fndn/shared/types';

import { CLOUDWATCH_CONSTANTS } from './cloudwatch-metrics.constants';

export interface CloudWatchConfig {
  enabled: boolean;
  namespace: string;
}

export interface CloudWatchMetricData {
  attachmentPath: NonEmptyString;
  documentId: NonEmptyString;
  documentManifestType: NonEmptyString;
  validationResponse?: NonEmptyString | undefined;
}

let cloudWatchClient: CloudWatchClient | null = null;

const getCloudWatchClient = (): CloudWatchClient => {
  if (!cloudWatchClient) {
    cloudWatchClient = new CloudWatchClient({
      region: getOrDefault(
        process.env['AWS_REGION'],
        CLOUDWATCH_CONSTANTS.DEFAULT_REGION,
      ),
    });
  }

  return cloudWatchClient;
};

export const setModuleCloudWatchClient = (
  client: CloudWatchClient | null,
): void => {
  cloudWatchClient = client;
};

export class CloudWatchMetricsService {
  private static instance: CloudWatchMetricsService | null = null;
  private readonly config: CloudWatchConfig;

  private constructor() {
    this.config = {
      enabled: this.isCloudWatchMetricsEnabled(),
      namespace: getOrDefault(
        process.env['CLOUDWATCH_METRICS_NAMESPACE'],
        CLOUDWATCH_CONSTANTS.DEFAULT_NAMESPACE,
      ),
    };
  }

  static getInstance(): CloudWatchMetricsService {
    if (!CloudWatchMetricsService.instance) {
      CloudWatchMetricsService.instance = new CloudWatchMetricsService();
    }

    return CloudWatchMetricsService.instance;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  async recordAIValidationFailure(data: CloudWatchMetricData): Promise<void> {
    if (this.isEnabled()) {
      await this.putMetric(data);
    }
  }

  private isCloudWatchMetricsEnabled(): boolean {
    if (process.env['NODE_ENV'] === 'test') {
      return false;
    }

    const value = process.env['ENABLE_CLOUDWATCH_METRICS'];

    if (!value) {
      return true;
    }

    return value.toLowerCase() === 'true';
  }

  private async putMetric(data: CloudWatchMetricData): Promise<void> {
    const client = getCloudWatchClient();

    const command = new PutMetricDataCommand({
      MetricData: [
        {
          Dimensions: [
            {
              Name: CLOUDWATCH_CONSTANTS.DIMENSION_NAME,
              Value: data.documentManifestType,
            },
          ],
          MetricName: CLOUDWATCH_CONSTANTS.METRIC_NAME,
          Timestamp: new Date(),
          Unit: CLOUDWATCH_CONSTANTS.METRIC_UNIT,
          Value: CLOUDWATCH_CONSTANTS.METRIC_VALUE,
        },
      ],
      Namespace: this.config.namespace,
    });

    await client.send(command);
  }
}
