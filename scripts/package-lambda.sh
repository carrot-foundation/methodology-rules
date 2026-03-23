#!/bin/sh

# Check if the correct number of arguments are provided
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <build_path> <zip_path>"
  exit 1
fi

BUILD_PATH=$1
ZIP_PATH=$2

# Extract path components and validate resource name length
ZIP_DIR=$(dirname "$ZIP_PATH")
ZIP_FILE_NAME=$(basename "$ZIP_PATH")

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

# Validate bundle does not contain devDependencies
LEAKED=$(node -p "
  const buildPkg = require('./$BUILD_PATH/package.json');
  const rootPkg = require('./package.json');
  const prodDeps = Object.keys(buildPkg.dependencies || {});
  Object.keys(rootPkg.devDependencies || {})
    .filter(d => !prodDeps.includes(d))
    .filter(d => require('fs').readFileSync('$BUILD_PATH/main.js','utf8').includes(d))
    .join('\n')
" 2>/dev/null)
if [ -n "$LEAKED" ]; then
  echo "Error: devDependencies leaked into bundle:"
  echo "$LEAKED"
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
