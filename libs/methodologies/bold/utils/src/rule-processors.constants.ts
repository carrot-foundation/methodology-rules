import { DataSetName } from '@carrot-fndn/methodologies/bold/types';

export const DOCUMENT_NOT_FOUND_RESULT_COMMENT =
  'The mass document was not found';

const CARROT_PARTICIPANT_NAME = 'Carrot Fndn';

// TODO: remove when environment variable is implemented
export const CARROT_PARTICIPANT_BY_ENVIRONMENT = {
  development: {
    [DataSetName.PROD]: {
      id: 'e710790f-5909-4a54-ab89-6a59819472ee',
      name: CARROT_PARTICIPANT_NAME,
    },
    [DataSetName.PROD_SIMULATION]: {
      id: 'e710790f-5909-4a54-ab89-6a59819472ee',
      name: CARROT_PARTICIPANT_NAME,
    },
    [DataSetName.TEST]: {
      id: 'f5746bcf-8510-46ca-96d8-d4081bda9410',
      name: CARROT_PARTICIPANT_NAME,
    },
  },
  production: {
    [DataSetName.PROD]: {
      id: 'b20a7caf-3e55-42f7-86f5-9bde362a4b0f',
      name: CARROT_PARTICIPANT_NAME,
    },
    [DataSetName.PROD_SIMULATION]: {
      id: 'b20a7caf-3e55-42f7-86f5-9bde362a4b0f',
      name: CARROT_PARTICIPANT_NAME,
    },
    [DataSetName.TEST]: {
      id: 'aabf119f-6b1e-409a-91fa-521b0f5f0a33',
      name: CARROT_PARTICIPANT_NAME,
    },
  },
} as const;
