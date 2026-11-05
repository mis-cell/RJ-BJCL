#!/usr/bin/env bash
set -e

echo "======================================================================"
echo "  Bally Jute - Sync All 1,398 'temporary_material_received' Records   "
echo "======================================================================"

DB_NAME="bjcl_db"
LOCAL_USER="postgres"
LOCAL_HOST="127.0.0.1"
LOCAL_PORT="5432"
export PGPASSWORD="${PGPASSWORD:-postgres}"

BEFORE_COUNT=$(psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$DB_NAME" -tAc 'SELECT COUNT(*) FROM "temporary_material_received";' 2>/dev/null || echo "0")
echo "📊 Current local 'temporary_material_received' row count: $BEFORE_COUNT"

# 1. Drop idx_unique_temp_arrival_no so MR00400 & MR00408 (distinct amad_id UUIDs) and all 1,398 Supabase rows are preserved
psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$DB_NAME" -c '
  DROP INDEX IF EXISTS idx_unique_temp_arrival_no;
  ALTER TABLE IF EXISTS "temporary_material_received" ALTER COLUMN "date" SET DEFAULT CURRENT_DATE;
  ALTER TABLE IF EXISTS "temporary_material_received" ALTER COLUMN "date" DROP NOT NULL;
  ALTER TABLE IF EXISTS "temporary_material_received" ADD COLUMN IF NOT EXISTS "payment_status" TEXT DEFAULT '\''Pending'\'';
' >/dev/null 2>&1 || true

# 2. Import all missing rows from complete_local_data.sql.gz (restores 1,383 -> 1,385 rows by amad_id PK)
if [ -f "complete_local_data.sql.gz" ]; then
  echo "📦 Restoring missing rows from complete_local_data.sql.gz (ON CONFLICT DO NOTHING)..."
  gunzip -c "complete_local_data.sql.gz" | psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$DB_NAME" >/dev/null 2>&1 || true
fi

MID_COUNT=$(psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$DB_NAME" -tAc 'SELECT COUNT(*) FROM "temporary_material_received";' 2>/dev/null || echo "0")
echo "📊 Local 'temporary_material_received' count after local backup restore: $MID_COUNT"

# 3. Pull the remaining 13 newer records from Supabase Web (https://lxuapkccxaadwixjpirs.supabase.co) to reach 1,398 rows
if [ -n "$SUPABASE_ANON_KEY" ]; then
  echo "🌐 Pulling all 1,398 records from Supabase Web via REST API..."
  curl -s -X POST "http://127.0.0.1:3000/api/db/sync-pending-arrivals" \
    -H "Content-Type: application/json" \
    -d "{\"supabaseUrl\":\"https://lxuapkccxaadwixjpirs.supabase.co\",\"supabaseKey\":\"$SUPABASE_ANON_KEY\"}" >/dev/null 2>&1 || true
elif [ -n "$SUPABASE_DB_PASSWORD" ]; then
  echo "🌐 Connecting to Supabase Cloud (db.lxuapkccxaadwixjpirs.supabase.co) to pull all 1,398 Temporary Arrival records..."
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
echo "✅ Temporary Arrival Sync Summary:"
echo "   - Before Migration : $BEFORE_COUNT rows"
echo "   - After Migration  : $AFTER_COUNT rows"
echo "   - Newly Added      : $ADDED records"
if [ "$AFTER_COUNT" -lt 1398 ]; then
  echo "----------------------------------------------------------------------"
  echo "💡 NOTE: To pull the remaining $((1398 - AFTER_COUNT)) brand-new rows created on"
  echo "   Supabase Web after the backup, either:"
  echo "   1) Click the green 'Sync Pending Data' button in Temporary Arrival"
  echo "      (Amad Register) and upload your Supabase CSV export or paste"
  echo "      your Supabase Anon Key, OR"
  echo "   2) Run: SUPABASE_ANON_KEY='your_anon_key' bash sync_pending_temporary_arrival.sh"
fi
echo "======================================================================"
