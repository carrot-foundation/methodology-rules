import {
  CloudWatchClient,
  PutMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';
import {
  getAwsRegion,
  getCloudwatchMetricsNamespace,
  getEnableCloudwatchMetrics,
} from '@carrot-fndn/shared/env';
import { NonEmptyString } from '@carrot-fndn/shared/types';

import { CLOUDWATCH_CONSTANTS } from './cloudwatch-metrics.constants';

export interface CloudWatchMetricData {
  documentManifestType: NonEmptyString;
}

let cloudWatchClient: CloudWatchClient | null = null;

const getCloudWatchClient = (): CloudWatchClient => {
  if (!cloudWatchClient) {
    cloudWatchClient = new CloudWatchClient({
      region: getAwsRegion(),
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
  private readonly enabled: boolean;
  private readonly namespace: string;

  private constructor() {
    this.enabled = getEnableCloudwatchMetrics();
    this.namespace =
      getCloudwatchMetricsNamespace() ?? CLOUDWATCH_CONSTANTS.DEFAULT_NAMESPACE;
  }

  static getInstance(): CloudWatchMetricsService {
    if (!CloudWatchMetricsService.instance) {
      CloudWatchMetricsService.instance = new CloudWatchMetricsService();
    }

    return CloudWatchMetricsService.instance;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async recordAIValidationFailure(data: CloudWatchMetricData): Promise<void> {
    if (this.isEnabled()) {
      await this.putMetric(data);
    }
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
      Namespace: this.namespace,
    });

    await client.send(command);
  }
}
