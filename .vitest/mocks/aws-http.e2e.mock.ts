export * from '../../libs/shared/aws-http/src/index';

const provideStubSmaugCredentials = () =>
  Promise.resolve({
    accessKeyId: 'smaug-access-key',
    secretAccessKey: 'smaug-secret-key',
    sessionToken: 'smaug-session-token',
  });

export const provideSmaugApiCredentials = () => provideStubSmaugCredentials;
