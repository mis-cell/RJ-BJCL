#!/bin/bash
# ==============================================================================
# Start Backend Services for Bally Jute (bjcl_db + PostgREST + Express API)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "=== 1. Checking PostgreSQL Service ==="
sudo systemctl start postgresql

echo "=== 2. Starting PostgREST (Database REST API on Port 8000) ==="
if command -v postgrest &> /dev/null; then
  pm2 delete postgrest-api 2>/dev/null || true
  pm2 start "postgrest $SCRIPT_DIR/postgrest.conf" --name "postgrest-api"
  echo "PostgREST started on port 8000 via PM2."
else
  echo "Warning: postgrest command not found. Install via: sudo apt install -y postgrest"
fi

echo "=== 3. Starting Express Application Server (Port 3000) ==="
pm2 delete bjl-server 2>/dev/null || true
pm2 start "npm run start" --name "bjl-server"

pm2 save
echo ""
echo "=== Backend and Frontend are now RUNNING! ==="
echo "Local URL: http://192.168.1.6:3000"
echo "Public Static URL: http://115.187.60.183:3000"
echo "Database API: http://192.168.1.6:8000"
echo "View logs with: pm2 logs"
