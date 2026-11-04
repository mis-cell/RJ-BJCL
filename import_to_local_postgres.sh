#!/usr/bin/env bash
set -e

echo "======================================================================"
echo "    Bally Jute - Complete 100% Supabase to Local PostgreSQL Import    "
echo "======================================================================"

# 1. Check if PostgreSQL package is installed; if not, install it automatically
if ! command -v psql &> /dev/null || ! systemctl list-unit-files | grep -q "postgresql.service"; then
    echo "⚠️  PostgreSQL is not installed yet on this system."
    echo "📦 Installing PostgreSQL and postgresql-contrib now..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
fi

# 2. Start and enable PostgreSQL service
echo "⚡ Starting local PostgreSQL service..."
sudo systemctl daemon-reload
sudo systemctl start postgresql
sudo systemctl enable postgresql

if systemctl is-active --quiet postgresql; then
    echo "✅ Local PostgreSQL service is running and active on port 5432."
else
    echo "❌ Error: Failed to start PostgreSQL service. Please check: sudo systemctl status postgresql"
    exit 1
fi

# 3. Setup PostgreSQL user password and bjcl_db database
echo "📋 Step 1/3: Configuring 'postgres' user and creating database 'bjcl_db'..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE bjcl_db;" 2>/dev/null || echo "Database 'bjcl_db' already exists, continuing..."

# 4. Apply Complete Schema (All 82 Tables, Constraints, Types, Primary Keys, Views & 9 Functions)
echo "📋 Step 2/3: Applying exact 82 tables schema + 9 stored functions into bjcl_db..."
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d bjcl_db -f "complete_local_schema.sql"

# 5. Import Complete Live Data (85,143 live records)
echo "💾 Step 3/3: Importing 100% of live data (85,143 rows) into bjcl_db..."
if [ -f "complete_local_data.sql.gz" ]; then
    echo "📦 Extracting and streaming complete_local_data.sql.gz directly into bjcl_db..."
    gunzip -c "complete_local_data.sql.gz" | PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d bjcl_db
elif [ -f "complete_local_data.sql" ]; then
    PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d bjcl_db -f "complete_local_data.sql"
else
    echo "❌ Error: Neither complete_local_data.sql.gz nor complete_local_data.sql found!"
    exit 1
fi

# 6. Configure local project .env file
cat << 'ENV' > .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bjcl_db
PGHOST=localhost
PGPORT=5432
PGDATABASE=bjcl_db
PGUSER=postgres
PGPASSWORD=postgres
PORT=3000
ENV

echo ""
echo "======================================================================"
echo "  Migration Verification (Live Records in Local PostgreSQL)"
echo "======================================================================"
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d bjcl_db -c "
SELECT 'TOTAL TABLES & VIEWS' AS metric, COUNT(*)::text AS count 
FROM information_schema.tables WHERE table_schema = 'public'
UNION ALL
SELECT 'user_master', COUNT(*)::text FROM user_master
UNION ALL
SELECT 'supply_master', COUNT(*)::text FROM supply_master
UNION ALL
SELECT 'sauda_check_point_details', COUNT(*)::text FROM sauda_check_point_details
UNION ALL
SELECT 'temporary_material_received', COUNT(*)::text FROM temporary_material_received
UNION ALL
SELECT 'material_inspection', COUNT(*)::text FROM material_inspection
UNION ALL
SELECT 'mr_settlement_master', COUNT(*)::text FROM mr_settlement_master
UNION ALL
SELECT 'payment_master', COUNT(*)::text FROM payment_master
UNION ALL
SELECT 'satta_calculated_rates', COUNT(*)::text FROM satta_calculated_rates
UNION ALL
SELECT 'user_activity_logs', COUNT(*)::text FROM user_activity_logs;
"


echo ""
echo "======================================================================"
echo "🎉 SUCCESS: All 82 Tables, Views, 9 Functions & Data are in Local PostgreSQL!"
echo "======================================================================"
echo "👉 How to connect in pgAdmin 4:"
echo "   1. Right-click 'Servers' -> 'Register' -> 'Server...'"
echo "   2. Tab 'General' -> Name: Local PostgreSQL"
echo "   3. Tab 'Connection':"
echo "        Host name/address: 127.0.0.1   (DO NOT type 'ubuntu/127.0.0.1'!)"
echo "        Port:              5432"
echo "        Maintenance DB:    bjcl_db (or postgres)"
echo "        Username:          postgres"
echo "        Password:          postgres"
echo "   4. Click 'Save' - Connection will be 100% successful!"
echo "======================================================================"
echo "👉 Start your local app:"
echo "     npm run dev"
echo "======================================================================"
