#!/usr/bin/env bash
# ==============================================================================
# Bally Jute ERP (RJ-BJCL) - 1-Click Update Script for Ubuntu 24
# ==============================================================================
set -e

echo "🚀 [1/4] Pulling latest code from GitHub..."
git pull origin main

echo "📦 [2/4] Installing dependencies..."
npm install

echo "🔨 [3/4] Building production assets (Vite + Express server)..."
npm run build

echo "🔄 [4/4] Restarting PM2 process..."
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
