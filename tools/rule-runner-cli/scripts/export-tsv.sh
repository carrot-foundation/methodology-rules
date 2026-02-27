#!/usr/bin/env bash
set -euo pipefail

# Exports rule-runner batch log JSON (review-required / rule-failures) to TSV
# for Google Sheets analysis.
#
# Usage:
#   bash tools/rule-runner-cli/scripts/export-tsv.sh <path-to-log.json or folder>
#   pnpm nx export-tsv rule-runner-cli --args="--file=<path-to-log.json or folder>"

INPUT="${1:?Usage: export-tsv.sh <path-to-log.json or folder>}"

if ! command -v jq &>/dev/null; then
  echo "Error: jq is required but not installed" >&2
  exit 1
fi

TSV_HEADER='resultStatus\tauditedDocumentId\trecyclerName\tgeneratorName\tdocumentType\tlayoutId\treasonCode\treasonDescription\tcomparedFields\ts3Uri'

# Output one row per reason: each failReason (status=FAILED) and each reviewReason (status=REVIEW_REQUIRED).
JQ_QUERY='
  def reason_row($status; $docId; $recyclerName; $generatorName; $docType; $layoutId; $s3Uri):
    .code as $code |
    .description as $desc |
    (if .comparedFields then [.comparedFields[] | .field + ": event=" + .event + " extracted=" + .extracted + (if .similarity then " similarity=" + .similarity else "" end)] | join("; ") else "" end) as $compared |
    [$status, $docId, $recyclerName, $generatorName, $docType, $layoutId, $code, $desc, $compared, $s3Uri] | @tsv;

  .[] |
  (.auditedDocumentId // .documentId // "") as $docId |
  (.resultContent.crossValidation.receiver.eventNames[0] // .resultContent.crossValidation.receiver.extractedName // .resultContent.crossValidation.recycler.eventNames[0] // .resultContent.crossValidation.recycler.extractedName // "") as $recyclerName |
  (.resultContent.crossValidation.generator.eventNames[0] // .resultContent.crossValidation.generator.extractedName // "") as $generatorName |
  (((.resultContent.extractionMetadata // {}) | to_entries | if length > 0 then .[0].value else {} end) | .s3Uri // "") as $s3Uri |
  (((.resultContent.extractionMetadata // {}) | to_entries | if length > 0 then .[0].value else {} end) | .documentType // "") as $docType |
  (((.resultContent.extractionMetadata // {}) | to_entries | if length > 0 then .[0].value else {} end) | .layoutId // "") as $layoutId |
  (
    ((.resultContent.failReasons // [])[] | reason_row("FAILED"; $docId; $recyclerName; $generatorName; $docType; $layoutId; $s3Uri)),
    ((.resultContent.reviewReasons // [])[] | reason_row("REVIEW_REQUIRED"; $docId; $recyclerName; $generatorName; $docType; $layoutId; $s3Uri))
  )
'

export_rows() {
  local file="$1"
  jq -r "$JQ_QUERY" "$file"
}

export_file() {
  local file="$1"
  local out_file="${file%.json}.tsv"

  {
    printf "${TSV_HEADER}\n"
    export_rows "$file"
  } > "$out_file"

  echo "Exported to $out_file"
}

if [[ -d "$INPUT" ]]; then
  found=0
  combined="${INPUT%/}/all.tsv"

  for file in "$INPUT"/{review-required,rule-failures}-*.json; do
    [[ -f "$file" ]] || continue
    export_file "$file"
    found=1
  done

  if [[ "$found" -eq 0 ]]; then
    echo "No review-required-*.json or rule-failures-*.json files found in $INPUT" >&2
    exit 1
  fi

  # Build combined TSV in one go so the header is never lost
  {
    printf "${TSV_HEADER}\n"
    for file in "$INPUT"/{review-required,rule-failures}-*.json; do
      [[ -f "$file" ]] || continue
      export_rows "$file"
    done
  } > "$combined"

  echo "Exported to $combined (combined)"
elif [[ -f "$INPUT" ]]; then
  export_file "$INPUT"
else
  echo "Error: not a file or directory: $INPUT" >&2
  exit 1
fi
