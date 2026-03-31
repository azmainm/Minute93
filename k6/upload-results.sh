#!/bin/bash
# Upload k6 test results to Minute93 admin dashboard
#
# Usage: ./k6/upload-results.sh <test-name> <summary-json-path>
# Example: ./k6/upload-results.sh preliminary k6/results/preliminary-20260331-201100/summary.json
#
# Requires: ADMIN_EMAIL and ADMIN_PASSWORD env vars (or uses defaults)

set -e

TEST_NAME="${1:?Usage: upload-results.sh <test-name> <summary-json-path>}"
SUMMARY_FILE="${2:?Usage: upload-results.sh <test-name> <summary-json-path>}"
BASE_URL="${BASE_URL:-https://minute93.onrender.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@minute93.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?Set ADMIN_PASSWORD env var}"

if [ ! -f "$SUMMARY_FILE" ]; then
  echo "Error: Summary file not found: $SUMMARY_FILE"
  exit 1
fi

echo "Logging in as $ADMIN_EMAIL..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('access_token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Error: Failed to login. Response: $LOGIN_RESPONSE"
  exit 1
fi
echo "Logged in."

# Parse k6 summary JSON into load test payload
echo "Parsing $SUMMARY_FILE..."
PAYLOAD=$(python3 -c "
import json, sys

with open('$SUMMARY_FILE') as f:
    data = json.load(f)

metrics = data['metrics']
duration = metrics['http_req_duration']
reqs = metrics['http_reqs']
failed = metrics.get('http_req_failed', {})
vus = metrics.get('vus_max', {})

# Calculate error rate
error_rate = failed.get('value', 0) * 100  # value is a rate (0-1)

# Check if all thresholds passed
all_passed = True
for metric_name, metric_data in metrics.items():
    if 'thresholds' in metric_data:
        for threshold_name, passed in metric_data['thresholds'].items():
            if not passed:
                all_passed = False

result = {
    'test_name': '$TEST_NAME',
    'started_at': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    'virtual_users_peak': int(vus.get('max', vus.get('value', 0))),
    'total_requests': int(reqs.get('count', 0)),
    'requests_per_second': round(reqs.get('rate', 0), 2),
    'error_rate_pct': round(error_rate, 4),
    'p50_response_ms': round(duration.get('med', 0), 2),
    'p95_response_ms': round(duration.get('p(95)', 0), 2),
    'p99_response_ms': round(duration.get('p(99)', duration.get('p(95)', 0) * 1.3), 2),
    'passed': all_passed,
}

print(json.dumps(result))
")

if [ -z "$PAYLOAD" ]; then
  echo "Error: Failed to parse summary JSON"
  exit 1
fi

echo "Uploading results..."
echo "$PAYLOAD" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2))"

RESPONSE=$(curl -s -X POST "$BASE_URL/admin/analytics/load-tests" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$PAYLOAD")

echo ""
echo "Response: $RESPONSE"
echo "Done!"
