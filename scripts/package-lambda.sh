#!/bin/sh

# Check if the correct number of arguments are provided
if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  echo "Usage: $0 <build_path> <zip_path> [resource_name]"
  exit 1
fi

BUILD_PATH=$1
ZIP_PATH=$2

# Extract path components and validate resource name length
ZIP_DIR=$(dirname "$ZIP_PATH")
ZIP_FILE_NAME=$(basename "$ZIP_PATH")

# Use provided resource name or extract from zip file name
if [ "$#" -eq 3 ]; then
  RESOURCE_NAME=$3
else
  RESOURCE_NAME=$(echo "$ZIP_FILE_NAME" | sed 's/\.zip$//')
fi

MAX_RESOURCE_NAME_LENGTH=107  # excludes mandatory 'methodology-' prefix and 'rule-processors' suffix
if [ ${#RESOURCE_NAME} -gt $MAX_RESOURCE_NAME_LENGTH ]; then
  echo "Error: Resource name '$RESOURCE_NAME' is ${#RESOURCE_NAME} characters long."
  echo "Resource names must be $MAX_RESOURCE_NAME_LENGTH characters or less (after removing the 'methodology-' prefix and 'rule-processors) to stay within the 80-char SQS queue limit."
   exit 1
fi

echo "Zipping $BUILD_PATH to $ZIP_PATH"

# Check if the build path exists
if [ ! -d "$BUILD_PATH" ]; then
  echo "Error: Build path $BUILD_PATH does not exist."
  exit 1
fi

# Install dependencies
if ! pnpm install --prod --no-frozen-lockfile --ignore-scripts --dir "$BUILD_PATH"
then
  echo "Error: Failed to install dependencies."
  exit 1
fi

# Create the zip folder if it doesn't exist
if ! mkdir -p "$ZIP_DIR"
then
  echo "Error: Failed to create directory $ZIP_DIR."
  exit 1
fi

# IMPORTANT: change to the build path to create the zip file with the correct relative structure
ABSOLUTE_ZIP_PATH="$(realpath "$ZIP_DIR")/$ZIP_FILE_NAME"
cd "$BUILD_PATH"

# Create the zip file
if zip -y -r -q "$ABSOLUTE_ZIP_PATH" .
then
  echo "Lambda .zip created at $ZIP_PATH"
else
  echo "Error: Failed to create .zip file."
  exit 1
fi
