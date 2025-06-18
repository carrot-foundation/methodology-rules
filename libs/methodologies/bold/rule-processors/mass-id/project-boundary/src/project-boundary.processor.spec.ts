import { calculateDistance } from '@carrot-fndn/shared/helpers';
import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  stubBoldMassIdDropOffEvent,
  stubBoldMassIdPickUpEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import {
  ProjectBoundaryProcessor,
  RESULT_COMMENTS,
} from './project-boundary.processor';
import { projectBoundaryTestCases } from './project-boundary.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('@carrot-fndn/shared/helpers', () => ({
  ...jest.requireActual('@carrot-fndn/shared/helpers'),
  calculateDistance: jest.fn(),
}));

describe('ProjectBoundaryProcessor', () => {
  const ruleDataProcessor = new ProjectBoundaryProcessor();

  const documentLoaderService = jest.mocked(loadDocument);
  const calculateDistanceMock = jest.mocked(calculateDistance);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(projectBoundaryTestCases)(
    'should return $resultStatus when $scenario',
    async ({ events, resultComment, resultContent, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();

      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocuments({
          externalEventsMap: events,
        })
        .build();

      documentLoaderService.mockResolvedValueOnce(massIdDocument);

      if (resultContent && typeof resultContent.distance === 'number') {
        const distanceInMeters = resultContent.distance * 1000;

        calculateDistanceMock.mockReturnValue(distanceInMeters);
      }

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultContent,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );

  describe('exceptions', () => {
    // Setup mocks specifically for this describe block
    beforeEach(() => {
      // Reset mock before setting new implementation
      calculateDistanceMock.mockReset();
      // Mock the error for distance calculation
      calculateDistanceMock.mockImplementation(() => {
        throw new Error('Failed to calculate distance');
      });
    });

    it('should return FAILED when the distance is not calculated', async () => {
      const ruleInput = random<Required<RuleInput>>();

      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocuments({
          externalEventsMap: {
            [DocumentEventName.DROP_OFF]: stubBoldMassIdDropOffEvent(),
            [DocumentEventName.PICK_UP]: stubBoldMassIdPickUpEvent(),
          },
        })
        .build();

      documentLoaderService.mockResolvedValueOnce(massIdDocument);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment: RESULT_COMMENTS.DISTANCE_CALCULATION_FAILED,
        resultContent: undefined,
        resultStatus: RuleOutputStatus.FAILED,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    });
  });
});
