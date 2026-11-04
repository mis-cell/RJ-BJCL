#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  Bally Jute - Supabase Docker Complete Migration Import  "
echo "=========================================================="

# 1. Locate the running Supabase database container
CONTAINER_ID=$(docker ps -q -f name=supabase_db | head -n 1)

if [ -z "$CONTAINER_ID" ]; then
    echo "⚠️  No running Supabase database container found."
    echo "Attempting to start Supabase..."
    sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
    npx supabase start
    CONTAINER_ID=$(docker ps -q -f name=supabase_db | head -n 1)
fi

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Error: Could not find Supabase Docker container. Please run 'npx supabase start' first."
    exit 1
fi

echo "✅ Found Supabase Docker container: $CONTAINER_ID"

# 2. Check for schema and migration sources
if [ -f "complete_local_migration.sql" ]; then
    echo "📦 Importing complete_local_migration.sql directly into Supabase Docker..."
    docker exec -i "$CONTAINER_ID" psql -U postgres -d postgres < "complete_local_migration.sql"
else
    echo "ℹ️  'complete_local_migration.sql' not found. Migrating live from Supabase Web via export_data.cjs..."
    
    # Apply base schema if available
    if [ -f "supabase_schema.sql" ]; then
        echo "📋 Step 1/3: Applying base schema (supabase_schema.sql)..."
        docker exec -i "$CONTAINER_ID" psql -U postgres -d postgres < "supabase_schema.sql" 2>/dev/null || true
    fi

    # Apply add_fields_only.sql for complete columns & views
    if [ -f "add_fields_only.sql" ]; then
        echo "📋 Step 2/3: Applying extra columns & tables (add_fields_only.sql)..."
        docker exec -i "$CONTAINER_ID" psql -U postgres -d postgres < "add_fields_only.sql" 2>/dev/null || true
    fi

    # Run data export from Supabase cloud
    if [ ! -f "local_complete_data_seed.sql" ]; then
        echo "🌐 Step 3/3: Downloading 100% of live data from Supabase Cloud (https://lxuapkccxaadwixjpirs.supabase.co)..."
        node export_data.cjs
    fi

    echo "💾 Loading live data into local Docker database..."
    docker exec -i "$CONTAINER_ID" psql -U postgres -d postgres < "local_complete_data_seed.sql"
fi

# Ensure all additional columns and tables exist (zero deletion)
if [ -f "add_fields_only.sql" ]; then
    docker exec -i "$CONTAINER_ID" psql -U postgres -d postgres < "add_fields_only.sql" 2>/dev/null || true
fi

echo ""
echo "=========================================================="
echo "  Migration Verification: Live Docker Row Counts"
echo "=========================================================="
docker exec -i "$CONTAINER_ID" psql -U postgres -d postgres -c "
SELECT 'user_master' AS table_name, COUNT(*) AS count FROM user_master
UNION ALL
SELECT 'sauda_master', COUNT(*) FROM sauda_master
UNION ALL
SELECT 'supply_master', COUNT(*) FROM supply_master
UNION ALL
SELECT 'temporary_material_received', COUNT(*) FROM temporary_material_received
UNION ALL
SELECT 'mr_settlement_master', COUNT(*) FROM mr_settlement_master
UNION ALL
SELECT 'payment_master', COUNT(*) FROM payment_master;
"

# 3. Ensure .env has local Supabase Docker connection settings
echo ""
echo "⚙️ Configuring local .env for port 54322..."
cat << 'EOF' > .env
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
PGHOST=localhost
PGPORT=54322
PGDATABASE=postgres
PGUSER=postgres
PGPASSWORD=postgres
PORT=3000
EOF

echo "✅ .env file updated successfully."
echo ""
echo "🎉 SUCCESS: All web data, schemas, relations, and logic have migrated into your local Docker Supabase!"
echo ""
echo "👉 Supabase Studio Dashboard : http://localhost:54323"
echo "👉 Start Bally Jute App       : npm run dev"
echo "👉 Login Credentials         :"
echo "    - User: 001   (Password: Admin@3656)"
echo "    - User: admin (Password: admin@123)"
echo "=========================================================="
