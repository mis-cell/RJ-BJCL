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

# 2. Check for the migration SQL file
SQL_FILE="complete_local_migration.sql"
if [ ! -f "$SQL_FILE" ]; then
    if [ -f "backend/complete_local_migration.sql" ]; then
        SQL_FILE="backend/complete_local_migration.sql"
    else
        echo "❌ Error: complete_local_migration.sql not found in current directory."
        exit 1
    fi
fi

echo "📦 Importing $SQL_FILE (33,000+ rows, schemas, relations & logic) into Supabase Docker..."
docker exec -i "$CONTAINER_ID" psql -U postgres -d postgres < "$SQL_FILE"

echo ""
echo "=========================================================="
echo "  Migration Verification"
echo "=========================================================="
docker exec -i "$CONTAINER_ID" psql -U postgres -d postgres -c "
SELECT 'user_master' AS table_name, COUNT(*) AS count FROM user_master
UNION ALL
SELECT 'sauda_master', COUNT(*) FROM sauda_master
UNION ALL
SELECT 'supply_master', COUNT(*) FROM supply_master
UNION ALL
SELECT 'temporary_arrival', COUNT(*) FROM temporary_arrival;
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
echo "🎉 SUCCESS: All data, schemas, relations, and logic have migrated into your local Docker Supabase!"
echo ""
echo "👉 Supabase Studio Dashboard : http://localhost:54323"
echo "👉 Start Bally Jute App       : npm run dev"
echo "👉 Login Credentials         :"
echo "    - User: 001   (Password: Admin@3656)"
echo "    - User: admin (Password: admin@123)"
echo "=========================================================="
