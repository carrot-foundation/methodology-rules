export const parseConfig = (
  configString: string | undefined,
): Record<string, unknown> | undefined => {
  if (!configString) {
    return undefined;
  }

  try {
    return JSON.parse(configString) as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid --config JSON: ${configString}`);
  }
};
