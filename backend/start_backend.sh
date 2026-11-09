#!/bin/bash
# ==============================================================================
# Start Pure Local Backend (PostgreSQL bjcl_db + Express Node Backend + PostgREST)
# 100% LOCAL - ZERO CLOUD SUPABASE DEPENDENCY
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "======================================================================"
echo "    Starting Bally Jute Local Stack (PostgreSQL bjcl_db)"
echo "======================================================================"

# 1. Start local PostgreSQL
echo "[1/4] Ensuring local PostgreSQL service is running..."
sudo systemctl start postgresql

# 2. Start Direct Node.js PostgreSQL Backend (Port 5000)
echo "[2/4] Starting Local Node.js Backend on port 5000..."
pm2 delete bjl-backend 2>/dev/null || true
pm2 start "$ROOT_DIR/backend/server.ts" --name "bjl-backend" --interpreter "$ROOT_DIR/node_modules/.bin/tsx"

# 3. Start PostgREST (Maps local bjcl_db directly to REST API on Port 8000)
echo "[3/4] Starting local database API bridge on port 8000..."
if command -v postgrest &> /dev/null; then
  pm2 delete postgrest-api 2>/dev/null || true
  pm2 start "postgrest $SCRIPT_DIR/postgrest.conf" --name "postgrest-api"
else
  echo "Notice: postgrest is not installed. You can install it anytime with: sudo apt install -y postgrest"
fi

# 4. Start Full-Stack Web App (Port 3000)
echo "[4/4] Starting Bally Jute Web App on port 3000..."
pm2 delete bjl-webapp 2>/dev/null || true
cd "$ROOT_DIR"
pm2 start "npm run start" --name "bjl-webapp"

pm2 save

echo ""
echo "======================================================================"
echo " SUCCESS: Everything is running LOCALLY from your PostgreSQL (bjcl_db)!"
echo "======================================================================"
echo " • Web App Frontend:         http://192.168.1.6:3000 (or http://115.187.60.183:3000)"
echo " • Local Node.js Backend:    http://127.0.0.1:5000"
echo " • Local Database REST API:  http://192.168.1.6:8000"
echo " • Local PostgreSQL:         localhost:5432 (database: bjcl_db)"
echo "======================================================================"
echo "To view live logs: pm2 logs"
echo "To stop everything: pm2 stop all"
