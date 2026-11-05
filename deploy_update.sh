#!/usr/bin/env bash
# ==============================================================================
# Bally Jute ERP (RJ-BJCL) - 1-Click Update Script for Ubuntu 24
# ==============================================================================
set -e

echo "🚀 [1/5] Pulling latest code from GitHub..."
git pull origin main

echo "📦 [2/5] Installing dependencies..."
npm install

echo "🔄 [3/5] Syncing pending 'temporary_material_received' records (1,398 rows)..."
if [ -f "sync_pending_temporary_arrival.sh" ]; then
    bash sync_pending_temporary_arrival.sh || true
fi

echo "🔨 [4/5] Building production assets (Vite + Express server)..."
npm run build

echo "🔄 [5/5] Restarting PM2 process..."
if command -v pm2 &> /dev/null && pm2 list | grep -q "rj-bjcl"; then
    pm2 restart rj-bjcl
    echo "✅ PM2 process 'rj-bjcl' successfully restarted!"
else
    echo "⚠️ PM2 process 'rj-bjcl' not found. Starting fresh..."
    pm2 start dist/server.cjs --name "rj-bjcl"
    pm2 save
fi

echo ""
echo "======================================================================"
echo "🎉 Update completed successfully! The ERP is running the latest build."
echo "======================================================================"
