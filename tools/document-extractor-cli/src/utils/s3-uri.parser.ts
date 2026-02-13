export const parseS3Uri = (
  uri: string,
): undefined | { bucket: string; key: string } => {
  const match = /^s3:\/\/([^/]+)\/(.+)$/.exec(uri);

  if (!match) {
    return undefined;
  }

  return { bucket: match[1]!, key: match[2]! };
};

export const isS3Uri = (path: string): boolean => path.startsWith('s3://');
