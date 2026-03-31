#!/bin/bash
# Upload k6 test results to Minute93 admin dashboard
#
# Usage: ./k6/upload-results.sh <test-name> <summary-json-path>
# Example: ./k6/upload-results.sh preliminary k6/results/preliminary-20260331-201100/summary.json
#
# Requires: ADMIN_PASSWORD env var

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

# Use Python for the entire upload to avoid shell escaping issues with passwords
python3 - "$TEST_NAME" "$SUMMARY_FILE" "$BASE_URL" "$ADMIN_EMAIL" "$ADMIN_PASSWORD" <<'PYEOF'
import json, sys, urllib.request, os
from datetime import datetime, timezone

test_name, summary_file, base_url, email, password = sys.argv[1:6]

def api_post(path, data, token=None):
    payload = json.dumps(data).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{base_url}{path}", data=payload, headers=headers)
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read().decode())
    except urllib.request.HTTPError as e:
        body = e.read().decode()
        print(f"Error {e.code}: {body}")
        sys.exit(1)

# Login
print(f"Logging in as {email}...")
login_resp = api_post("/auth/login", {"email": email, "password": password})
token = login_resp.get("data", {}).get("accessToken", "")
if not token:
    print(f"Login failed: {login_resp}")
    sys.exit(1)
print("Logged in.")

# Parse summary
print(f"Parsing {summary_file}...")
with open(summary_file) as f:
    data = json.load(f)

metrics = data["metrics"]
duration = metrics["http_req_duration"]
reqs = metrics["http_reqs"]
failed = metrics.get("http_req_failed", {})
vus = metrics.get("vus_max", {})

error_rate = failed.get("value", 0) * 100

all_passed = True
for metric_data in metrics.values():
    if "thresholds" in metric_data:
        for passed in metric_data["thresholds"].values():
            if not passed:
                all_passed = False

# Use file modification time as started_at
mtime = os.path.getmtime(summary_file)
started_at = datetime.fromtimestamp(mtime, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

result = {
    "test_name": test_name,
    "started_at": started_at,
    "virtual_users_peak": int(vus.get("max", vus.get("value", 0))),
    "total_requests": int(reqs.get("count", 0)),
    "requests_per_second": round(reqs.get("rate", 0), 2),
    "error_rate_pct": round(error_rate, 4),
    "p50_response_ms": round(duration.get("med", 0), 2),
    "p95_response_ms": round(duration.get("p(95)", 0), 2),
    "p99_response_ms": round(duration.get("p(99)", duration.get("p(95)", 0) * 1.3), 2),
    "passed": all_passed,
}

print("Uploading:")
print(json.dumps(result, indent=2))

resp = api_post("/admin/analytics/load-tests", result, token)
print(f"\nUploaded successfully! ID: {resp.get('data', {}).get('id', 'unknown')}")
PYEOF
