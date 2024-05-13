#!/bin/bash
set -e

# Check if the correct number of arguments are provided
if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <project_folder> <zip_path> <environment>"
  exit 1
fi

PROJECT_FOLDER=$1
ZIP_PATH=$2
ENVIRONMENT=$3

FILE_CHECKSUM=$(md5sum "$ZIP_PATH" | cut -f1 -d" ")
FILE_NAME=$(basename "$ZIP_PATH" .zip)

S3_BUCKET=elrond-$ENVIRONMENT-lambda-artifacts-rules
S3_FOLDER=$(echo "$PROJECT_FOLDER" | sed 's/^apps\/methodologies\///' | sed 's/rule-processors\///')
S3_KEY=$S3_FOLDER/$FILE_NAME-$FILE_CHECKSUM.zip
S3_URL=s3://$S3_BUCKET/$S3_KEY

RULE_NAME=$(echo "$S3_FOLDER" | sed 's/\//-/g')

GIT_REPO_URL=$(git config --get remote.origin.url | sed 's/\.git//g')
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

SOURCE_CODE_URL=$GIT_REPO_URL/blob/$GIT_BRANCH/$PROJECT_FOLDER
COMMIT_HASH=$(git rev-parse HEAD)

# Upload zip file to S3 bucket
if aws s3 cp "$ZIP_PATH" "s3://$S3_BUCKET/$S3_KEY" --metadata="commit-hash=$COMMIT_HASH,file-checksum=$FILE_CHECKSUM,source-code-url=$SOURCE_CODE_URL,rule-name=$RULE_NAME"
then
  echo "Uploaded $ZIP_PATH to $S3_URL"
else
  echo "Error: Failed to upload file $ZIP_PATH"
  exit 1
fi
