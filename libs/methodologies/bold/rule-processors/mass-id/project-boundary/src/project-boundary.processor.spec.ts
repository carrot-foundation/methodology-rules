import { calculateDistance } from '@carrot-fndn/shared/helpers';
import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  stubBoldMassIDDropOffEvent,
  stubBoldMassIDPickUpEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { RESULT_COMMENTS } from './project-boundary.constants';
import { ProjectBoundaryProcessor } from './project-boundary.processor';
import { projectBoundaryTestCases } from './project-boundary.test-cases';

vi.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');
vi.mock('@carrot-fndn/shared/helpers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@carrot-fndn/shared/helpers')>()),
  calculateDistance: vi.fn(),
}));

describe('ProjectBoundaryProcessor', () => {
  const ruleDataProcessor = new ProjectBoundaryProcessor();

  const documentLoaderService = vi.mocked(loadDocument);
  const calculateDistanceMock = vi.mocked(calculateDistance);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(projectBoundaryTestCases)(
    'should return $resultStatus when $scenario',
    async ({ events, resultComment, resultContent, resultStatus }) => {
      const ruleInput = stubRuleInput();

      const { massIDDocument } = new BoldStubsBuilder()
        .createMassIDDocuments({
          externalEventsMap: events,
        })
        .build();

      documentLoaderService.mockResolvedValueOnce(massIDDocument);

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
      const ruleInput = stubRuleInput();

      const { massIDDocument } = new BoldStubsBuilder()
        .createMassIDDocuments({
          externalEventsMap: {
            [BoldDocumentEventName.DROP_OFF]: stubBoldMassIDDropOffEvent(),
            [BoldDocumentEventName.PICK_UP]: stubBoldMassIDPickUpEvent(),
          },
        })
        .build();

      documentLoaderService.mockResolvedValueOnce(massIDDocument);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment: RESULT_COMMENTS.failed.DISTANCE_CALCULATION_FAILED,
        resultContent: undefined,
        resultStatus: 'FAILED',
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    });
  });
});
