#!/bin/bash
# Usage: ./k6/run-test.sh <test-name>
# Example: ./k6/run-test.sh preliminary
#          ./k6/run-test.sh level1
#          ./k6/run-test.sh match-day
#
# Reports are saved to k6/results/<test-name>-<timestamp>/

set -e

TEST_NAME="${1:-preliminary}"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
RESULTS_DIR="k6/results/${TEST_NAME}-${TIMESTAMP}"
BASE_URL="${BASE_URL:-https://minute93.onrender.com}"

# Map test name to script
case "$TEST_NAME" in
  preliminary) SCRIPT="k6/preliminary-test.js" ;;
  level1)      SCRIPT="k6/level1-test.js" ;;
  match-day)   SCRIPT="k6/match-day-test.js" ;;
  spike)       SCRIPT="k6/spike-test.js" ;;
  *)           echo "Unknown test: $TEST_NAME"; exit 1 ;;
esac

mkdir -p "$RESULTS_DIR"

echo "============================================"
echo "  Minute93 Load Test: $TEST_NAME"
echo "  Target: $BASE_URL"
echo "  Reports: $RESULTS_DIR/"
echo "  Started: $(date)"
echo "============================================"
echo ""

# Run k6 with JSON output for detailed metrics + summary to file
k6 run \
  --env BASE_URL="$BASE_URL" \
  --out json="$RESULTS_DIR/raw-metrics.json" \
  --summary-export="$RESULTS_DIR/summary.json" \
  "$SCRIPT" \
  2>&1 | tee "$RESULTS_DIR/console-output.txt"

echo ""
echo "============================================"
echo "  Test complete: $(date)"
echo "  Reports saved to: $RESULTS_DIR/"
echo "    - console-output.txt  (terminal output)"
echo "    - summary.json        (structured summary)"
echo "    - raw-metrics.json    (detailed metrics)"
echo "============================================"

# Auto-upload results to admin dashboard if ADMIN_PASSWORD is set
if [ -n "$ADMIN_PASSWORD" ] && [ -f "$RESULTS_DIR/summary.json" ]; then
  echo ""
  echo "Uploading results to admin dashboard..."
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  BASE_URL="$BASE_URL" ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    "$SCRIPT_DIR/upload-results.sh" "$TEST_NAME" "$RESULTS_DIR/summary.json" || \
    echo "Warning: Upload failed (results are still saved locally)"
fi
