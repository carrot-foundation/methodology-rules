#!/bin/sh

# Check if the correct number of arguments are provided
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <build_path> <zip_path>"
  exit 1
fi

BUILD_PATH=$1
ZIP_PATH=$2

# Extract path components and validate lambda name length
ZIP_DIR=$(dirname "$ZIP_PATH")
ZIP_FILE_NAME=$(basename "$ZIP_PATH")
LAMBDA_NAME=$(echo "$ZIP_FILE_NAME" | sed 's/\.zip$//')

if [ ${#LAMBDA_NAME} -gt 80 ]; then
  echo "Error: Lambda name '$LAMBDA_NAME' is ${#LAMBDA_NAME} characters long."
  echo "Lambda names must be 80 characters or less for SQS queue compatibility."
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
