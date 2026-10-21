import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  expectRuleFindings,
  stubBoldMassIDDocument,
  stubBoldMassIDPickUpEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldDocumentEventName,
  BoldVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { VEHICLE_IDENTIFICATION_FINDINGS } from './vehicle-identification.findings';
import { VehicleIdentificationProcessor } from './vehicle-identification.processor';
import { vehicleIdentificationTestCases } from './vehicle-identification.test-cases';

vi.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

const { VEHICLE_LICENSE_PLATE, VEHICLE_TYPE } = BoldAttributeName;
const { PICK_UP } = BoldDocumentEventName;

describe('VehicleIdentificationProcessor', () => {
  const ruleDataProcessor = new VehicleIdentificationProcessor();

  const documentLoaderService = vi.mocked(loadDocument);

  it.each(vehicleIdentificationTestCases)(
    'should return $resultStatus when $scenario',
    async ({ events, resultComment, resultStatus }) => {
      const ruleInput = stubRuleInput();
      const document = stubBoldMassIDDocument({
        externalEventsMap: events,
      });

      documentLoaderService.mockResolvedValueOnce(document);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      };

      expect(
        expectRuleFindings(ruleOutput, VEHICLE_IDENTIFICATION_FINDINGS),
      ).toEqual(expectedRuleOutput);
    },
  );

  it('should attribute a license plate missing from the events to TO_CONFIRM', async () => {
    const ruleInput = stubRuleInput();

    documentLoaderService.mockResolvedValueOnce(
      stubBoldMassIDDocument({
        externalEventsMap: new Map([
          [
            PICK_UP,
            stubBoldMassIDPickUpEvent({
              metadataAttributes: [
                [VEHICLE_TYPE, BoldVehicleType.TRUCK],
                [VEHICLE_LICENSE_PLATE, undefined],
              ],
            }),
          ],
        ]),
      }),
    );

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    expect(ruleOutput.resultContent).toEqual({
      findings: [
        {
          code: 'vehicle-identification.FAILED.LICENSE_PLATE_MISSING',
          defaultOwner: 'TO_CONFIRM',
        },
      ],
    });
  });
});
