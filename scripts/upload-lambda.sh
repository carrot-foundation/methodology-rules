#!/bin/bash
set -e

# Check if the correct number of arguments are provided
if [ "$#" -lt 3 ] || [ "$#" -gt 4 ]; then
  echo "Usage: $0 <project_folder> <zip_path> <environment> [resource_name]"
  exit 1
fi

PROJECT_FOLDER=$1
ZIP_PATH=$2
ENVIRONMENT=$3

FILE_CHECKSUM=$(md5sum "$ZIP_PATH" | cut -f1 -d" ")
FILE_NAME=$(basename "$ZIP_PATH" .zip)

S3_BUCKET=elrond-$ENVIRONMENT-methodology-rules-lambda-artifacts
S3_FOLDER=$(echo "$PROJECT_FOLDER" | sed 's/^apps\/methodologies\///' | sed 's/rule-processors\///')
S3_KEY=$S3_FOLDER/$FILE_NAME-$FILE_CHECKSUM.zip
S3_URL=s3://$S3_BUCKET/$S3_KEY

METHODOLOGY_SLUG=$(echo "$PROJECT_FOLDER" | sed -n 's/^apps\/methodologies\/\([^/]*\)\/rule-processors\/.*/\1/p')

# Use provided resource name or derive from S3_FOLDER
if [ "$#" -eq 4 ]; then
  RESOURCE_NAME=$4
  # Validate resource name length
  MAX_RESOURCE_NAME_LENGTH=110  # excludes mandatory 'methodologies-' prefix and 'rule-processors' suffix
  if [ ${#RESOURCE_NAME} -gt $MAX_RESOURCE_NAME_LENGTH ]; then
    echo "Error: Resource name '$RESOURCE_NAME' is ${#RESOURCE_NAME} characters long."
    echo "Resource names must be $MAX_RESOURCE_NAME_LENGTH characters or less (after removing the 'methodologies-' prefix and 'rule-processors) to stay within the 80-char SQS queue limit."
    exit 1
  fi
  RULE_NAME=$RESOURCE_NAME
else
  RULE_NAME=$(echo "$S3_FOLDER" | sed 's/\//-/g')
fi

GIT_REPO_URL=$(git config --get remote.origin.url | sed 's/\.git//g')
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

COMMIT_HASH=$(git rev-parse HEAD)
SOURCE_CODE_URL=$GIT_REPO_URL/tree/$COMMIT_HASH/$PROJECT_FOLDER

# Upload zip file to S3 bucket
if aws s3 cp "$ZIP_PATH" "s3://$S3_BUCKET/$S3_KEY"
then
  echo "Uploaded $ZIP_PATH to $S3_URL"

  # concatenates metadata rules in rules metadata file
  METADATA_FILE="rules-metadata.json"
  METADATA_TEMP_FILE="temp-rules-metadata.json"

  if [ -s "$METADATA_FILE" ]; then
    jq ".rulesMetadata += [{\"rule-name\": \"$RULE_NAME\", \"methodology-slug\": \"$METHODOLOGY_SLUG\", \"commit-hash\": \"$COMMIT_HASH\", \"file-checksum\": \"$FILE_CHECKSUM\", \"source-code-url\": \"$SOURCE_CODE_URL\", \"s3-bucket\": \"$S3_BUCKET\", \"s3-key\": \"$S3_KEY\"}]" "$METADATA_FILE" > "$METADATA_TEMP_FILE" && mv "$METADATA_TEMP_FILE" "$METADATA_FILE"
  fi
else
  echo "Error: Failed to upload file $ZIP_PATH"
  exit 1
fi
