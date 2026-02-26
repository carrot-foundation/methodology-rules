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

TSV_HEADER='resultStatus\tauditedDocumentId\trecyclerName\tdocumentType\tlayoutId\treasonCode\treasonDescription\tcomparedFields\ts3Uri'

JQ_QUERY='
  .[] |
  (.auditedDocumentId // .documentId // "") as $docId |
  (.resultContent.crossValidation.receiver.eventName // .resultContent.crossValidation.recycler.eventName // "") as $recyclerName |
  (.resultContent.crossValidation._extraction.s3Uri // "") as $s3Uri |
  (.resultContent.crossValidation._extraction.documentType // "") as $docType |
  (.resultContent.crossValidation._extraction.layoutId // "") as $layoutId |
  (.resultContent[$rkey] // [])[] |
  .code as $code |
  .description as $desc |
  (
    if .comparedFields then
      [.comparedFields[] |
        .field + ": event=" + .event + " extracted=" + .extracted +
        (if .similarity then " similarity=" + .similarity else "" end)
      ] | join("; ")
    else ""
    end
  ) as $compared |
  [$status, $docId, $recyclerName, $docType, $layoutId, $code, $desc, $compared, $s3Uri] |
  @tsv
'

detect_status() {
  local file="$1"

  local reason_key
  reason_key=$(jq -r '
    if (.[0].resultContent.reviewReasons // [] | length) > 0 then "reviewReasons"
    elif (.[0].resultContent.failReasons // [] | length) > 0 then "failReasons"
    else "reviewReasons"
    end
  ' "$file")

  local result_status="REVIEW_REQUIRED"
  if [[ "$reason_key" == "failReasons" ]]; then
    result_status="FAILED"
  fi

  echo "$result_status" "$reason_key"
}

export_rows() {
  local file="$1"
  read -r result_status reason_key <<< "$(detect_status "$file")"
  jq -r --arg status "$result_status" --arg rkey "$reason_key" "$JQ_QUERY" "$file"
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

  printf "${TSV_HEADER}\n" > "$combined"

  for file in "$INPUT"/{review-required,rule-failures}-*.json; do
    [[ -f "$file" ]] || continue
    export_file "$file"
    export_rows "$file" >> "$combined"
    found=1
  done

  if [[ "$found" -eq 0 ]]; then
    rm -f "$combined"
    echo "No review-required-*.json or rule-failures-*.json files found in $INPUT" >&2
    exit 1
  fi

  echo "Exported to $combined (combined)"
elif [[ -f "$INPUT" ]]; then
  export_file "$INPUT"
else
  echo "Error: not a file or directory: $INPUT" >&2
  exit 1
fi
