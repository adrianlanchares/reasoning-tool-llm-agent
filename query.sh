#!/bin/bash

PHASE=4

while [[ "$1" == --* ]]; do
  case "$1" in
    --phase)
      PHASE="$2"
      shift 2
      ;;
    *)
      echo "Unknown flag: $1"
      exit 1
      ;;
  esac
done

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 [--phase <1|2|3|4>] \"PROMPT text\""
  exit 1
fi

PROMPT="$1"

case "$PHASE" in
  1) ENDPOINT="http://localhost:8009/phase1/reasoning" ;;
  2) ENDPOINT="http://localhost:8009/phase2/tools" ;;
  3) ENDPOINT="http://localhost:8009/phase3/rag" ;;
  4) ENDPOINT="http://localhost:8009/phase4/agent" ;;
  *)
    echo "Invalid phase: $PHASE. Must be 1, 2, 3, or 4."
    exit 1
    ;;
esac

curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\": \"$PROMPT\"}" | jq

echo ""