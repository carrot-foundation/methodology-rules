#!/bin/bash
set -e

# Check if the correct number of arguments are provided
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <environment>"
  exit 1
fi

ENVIRONMENT=$1
FILE_PATH="rules-metadata.json"

if [ -f "$FILE_PATH" ]; then
  rm -f "$FILE_PATH"
fi

echo '{"rulesMetadata":[]}' > "$FILE_PATH"

pnpm nx affected --target=upload-lambda --configuration=production --environment=$ENVIRONMENT --parallel=10

FILE_CHECKSUM=$(md5sum "$FILE_PATH" | cut -f1 -d" ")
FILE_NAME=$(basename "$FILE_PATH" .json)

S3_BUCKET=elrond-$ENVIRONMENT-methodology-rules-metadata-lambda-artifacts
S3_KEY=$FILE_NAME-$FILE_CHECKSUM.json

if aws s3 cp "$FILE_PATH" "s3://$S3_BUCKET/$S3_KEY"
then
  echo "Uploaded $FILE_PATH to $S3_URL"
else
  echo "Error: Failed to upload file $FILE_PATH"
  exit 1
fi

