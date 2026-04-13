#!/bin/bash
PHASE=4
ENDPOINT_TYPE="local"

while [[ "$1" == --* ]]; do
  case "$1" in
    --phase)
      PHASE="$2"
      shift 2
      ;;
    --endpoint)
      ENDPOINT_TYPE="$2"
      shift 2
      ;;
    *)
      echo "Unknown flag: $1"
      exit 1
      ;;
  esac
done

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 [--phase <1|2|3|4>] [--endpoint <local|ngrok>] \"PROMPT text\""
  exit 1
fi

PROMPT="$1"

case "$ENDPOINT_TYPE" in
  local) BASE_URL="http://localhost:8010" ;;
  ngrok) BASE_URL="https://affine-nonastronomically-evelynn.ngrok-free.dev" ;;
  *)
    echo "Invalid endpoint type: $ENDPOINT_TYPE. Must be 'local' or 'ngrok'."
    exit 1
    ;;
esac

case "$PHASE" in
  1) ENDPOINT="$BASE_URL/phase1/reasoning" ;;
  2) ENDPOINT="$BASE_URL/phase2/tools" ;;
  3) ENDPOINT="$BASE_URL/phase3/rag" ;;
  4) ENDPOINT="$BASE_URL/phase4/agent" ;;
  *)
    echo "Invalid phase: $PHASE. Must be 1, 2, 3, or 4."
    exit 1
    ;;
esac

curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\": \"$PROMPT\"}" | jq
echo ""