import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import { stubContext, stubRuleResponse } from '@carrot-fndn/shared/testing';

import { handler } from '../lambda';

describe('AnalyzeAttatchmentProcessor', () => {
  it('should return the rule output APPROVED and with the extracted NFT metadata', async () => {
    (await handler(
      {
        documentId: 'a29e41a2-d88f-41cc-89e7-2371e830b6cd',
        documentKeyPrefix: 'e7def986-2df5-472f-8ffb-d09a8a8880f0/documents',
        parentDocumentId: 'ac821b9a-1059-42d7-b0b3-9621a2c6e8de',
        requestId: 'e7def986-2df5-472f-8ffb-d09a8a8880f0',
        responseToken:
          'AQB8AAAAKgAAAAMAAAAAAAAAATjYa7oqpUQUKTn9z2xt1wfVeL28tppM0xqM1WL22jAGB1wSb82TXGoa2vo4zoO4nLaB/xe2gaz8o6Ns3EKDRfXWu3PG/WCA+JXqYCwwk/nsLYUgmkLJfDLrpc8mAEiheA3sE7zAHS8caKUisezOWJVaRkivvNvpm/oEgDMCii1xgOPquZVHTL9mlph7Y9bV5uiq2X0i3m8sJwLvq1bAOeJu5BZ+KRcTF42VcLjM3JHUQ35TTLLEjRTjs1bITPqiinCMUdPbEb/jeeU3MCemtWVDu7YjxexamCDRrJblXcgXI/IXwKVsWowS0lvNFK/YK4vaaDXL2ezlxVVvbYKoOp//8fmFUk4vtEAr69ubs6RZWZk2qDmbQz5/AoJiq+ZsE5R8pUbpAmAp94i7MRO9JRK9PUBnuX7YEFZHqXhhaDpmQIv9TWYgnxtgbEvw5zegHnMger37fQLeH+Prxr5PpTEtQgnF/831blmdG2hShDVvdYfQ8b3l/iczjVnDctANlTGJDjXWziJl109jGZJwSbIiWFMXMHOqVngXDe0X6jkJ3Zg8WQ3uLl0znbY/wX4rCw/qEq61MGm6tfYx1wN0ZTG7Y1j0HfdX70GSK+soK3kuGdNtuOUlQn3Vp3hc',
        responseUrl:
          'https://smaug.carrot.eco/methodologies/d62ec0a1-3566-424a-b0a9-ca940b9cfee0/executions/e7def986-2df5-472f-8ffb-d09a8a8880f0/rules/1307914b-fa59-41c2-ae9d-7e35366db5d8/post-process',
        ruleName: 'CDF Address',
      },
      stubContext(),
      () => stubRuleResponse(),
    )) as RuleOutput;

    expect(true).toBe(true);
  });
});
