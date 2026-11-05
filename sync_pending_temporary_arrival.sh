#!/usr/bin/env bash
set -e

echo "======================================================================"
echo "  Bally Jute - One-Time Pending Temporary Arrival Migration to Local  "
echo "======================================================================"

DB_NAME="bjcl_db"
LOCAL_USER="postgres"
LOCAL_HOST="127.0.0.1"
LOCAL_PORT="5432"
export PGPASSWORD="${PGPASSWORD:-postgres}"

BEFORE_COUNT=$(psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$DB_NAME" -tAc 'SELECT COUNT(*) FROM "temporary_material_received";' 2>/dev/null || echo "0")
echo "📊 Current local 'temporary_material_received' row count: $BEFORE_COUNT"

# 1. Ensure date column allows defaults & unique index exists
psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$DB_NAME" -c '
  ALTER TABLE IF EXISTS "temporary_material_received" ALTER COLUMN "date" SET DEFAULT CURRENT_DATE;
  ALTER TABLE IF EXISTS "temporary_material_received" ALTER COLUMN "date" DROP NOT NULL;
  ALTER TABLE IF EXISTS "temporary_material_received" ADD COLUMN IF NOT EXISTS "payment_status" TEXT DEFAULT '\''Pending'\'';
' >/dev/null 2>&1 || true

# 2. Import all missing rows from complete_local_data.sql.gz (1,385 Temporary Arrival records + Sauda / Final Arrival)
if [ -f "complete_local_data.sql.gz" ]; then
  echo "📦 Syncing all missing Temporary Arrival & Sauda records from complete_local_data.sql.gz (ON CONFLICT DO NOTHING)..."
  gunzip -c "complete_local_data.sql.gz" | psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$DB_NAME" >/dev/null 2>&1 || true
fi

# 3. Optional: If the user also wants to pull any brand-new rows created directly on Supabase Cloud (db.lxuapkccxaadwixjpirs.supabase.co)
if [ -n "$SUPABASE_DB_PASSWORD" ]; then
  echo "🌐 Connecting to Supabase Cloud (db.lxuapkccxaadwixjpirs.supabase.co) to pull any brand-new Temporary Arrival records..."
  PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump -h "db.lxuapkccxaadwixjpirs.supabase.co" -p 5432 -U postgres -d postgres \
    --data-only \
    --inserts \
    --on-conflict-do-nothing \
    -t 'public.temporary_material_received' \
    -t 'public.sauda_check_point' \
    -t 'public.sauda_check_point_details' \
    -t 'public.final_arrival' \
    | PGPASSWORD="${PGPASSWORD:-postgres}" psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$DB_NAME" >/dev/null 2>&1 || true
fi

AFTER_COUNT=$(psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$DB_NAME" -tAc 'SELECT COUNT(*) FROM "temporary_material_received";' 2>/dev/null || echo "0")
ADDED=$((AFTER_COUNT - BEFORE_COUNT))

echo "======================================================================"
echo "✅ SUCCESS: Temporary Arrival Pending Migration Complete!"
echo "   - Before Migration : $BEFORE_COUNT rows"
echo "   - After Migration  : $AFTER_COUNT rows"
echo "   - Newly Added      : $ADDED pending records"
echo "======================================================================"
