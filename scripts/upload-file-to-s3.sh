#!/bin/bash
set -e

# Check if the correct number of arguments are provided
if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <s3_path> <file_path> <environment>"
  exit 1
fi

S3_PATH=$1
FILE_PATH=$2
ENVIRONMENT=$3

S3_BUCKET=elrond-$ENVIRONMENT-lambda-artifacts-rules

if aws s3 cp "$FILE_PATH" "s3://$S3_BUCKET/$S3_PATH"
then
  echo "Uploaded $FILE_PATH to $S3_PATH"
else
  echo "Error: Failed to upload file $FILE_PATH"
  exit 1
fi
