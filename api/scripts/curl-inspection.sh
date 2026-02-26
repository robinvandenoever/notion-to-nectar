#!/usr/bin/env bash
# Minimal curl test for production API.
# Usage:
#   ./scripts/curl-inspection.sh                    # test /version and /health
#   ./scripts/curl-inspection.sh <inspection-id>    # test GET /inspections/:id
set -e
BASE="${VITE_API_BASE_URL:-https://api-production-fb9f.up.railway.app}"

echo "=== GET /version ==="
curl -sS "${BASE}/version" | head -c 200
echo ""

echo ""
echo "=== GET /health ==="
curl -sS "${BASE}/health" | head -c 200
echo ""

if [ -n "$1" ]; then
  echo ""
  echo "=== GET /inspections/$1 ==="
  curl -sS -w "\nHTTP %{http_code}\n" "${BASE}/inspections/$1" | tail -20
fi
