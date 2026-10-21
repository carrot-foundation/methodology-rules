export const captureThrownError = (run: () => unknown): unknown => {
  try {
    run();
  } catch (error) {
    return error;
  }

  throw new Error('Expected the callback to throw');
};
