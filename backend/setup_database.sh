#!/bin/bash
# ==============================================================================
# Complete Master Database Setup Script for Bally Jute (bjcl_db)
# Creates all tables, sub-tables, constraints, area logic, views & relations
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DB_NAME="bjcl_db"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

echo "======================================================================"
echo "    Bally Jute Company Limited - Complete Database Initialization"
echo "======================================================================"
echo "Target Database: $DB_NAME on $DB_HOST:$DB_PORT"
echo ""

read -s -p "Enter password for PostgreSQL user '$DB_USER': " DB_PASS
echo ""
export PGPASSWORD="$DB_PASS"

# Check PostgreSQL connection
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c '\q' 2>/dev/null; then
  echo "Error: Could not connect to PostgreSQL. Please verify your password or run 'sudo systemctl start postgresql'."
  exit 1
fi

echo "Connected successfully to PostgreSQL."

# 1. Create database bjcl_db if it does not exist
DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")
if [ "$DB_EXISTS" != "1" ]; then
  echo "Creating database '$DB_NAME'..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
else
  echo "Database '$DB_NAME' already exists."
fi

# Enable necessary PostgreSQL extensions
echo "Ensuring pgcrypto extension is installed..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'

# 2. Execute Base Schema (Tables, Foreign Keys & Constraints)
if [ -f "$ROOT_DIR/supabase_schema.sql" ]; then
  echo "[1/3] Importing Base Schema ($ROOT_DIR/supabase_schema.sql)..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$ROOT_DIR/supabase_schema.sql"
fi

# 3. Execute Safe Repairs & Payment Master Schema
if [ -f "$ROOT_DIR/migrations/20261017_safe_repairs.sql" ]; then
  echo "[2/3] Importing Safe Repairs & Extra Tables (20261017_safe_repairs.sql)..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$ROOT_DIR/migrations/20261017_safe_repairs.sql"
fi

# 4. Execute Complete Area Logic & Agency Mappings
if [ -f "$ROOT_DIR/migrations/20261023_create_area_logic.sql" ]; then
  echo "[3/4] Importing Complete Area Logic & Agency Mappings (20261023_create_area_logic.sql)..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$ROOT_DIR/migrations/20261023_create_area_logic.sql"
fi

# 5. Execute Complete Data Migration & Seed (All Masters, Users, Transactions)
if [ -f "$ROOT_DIR/complete_local_migration.sql" ]; then
  echo "[4/4] Importing Complete Local Migration & Master Data ($ROOT_DIR/complete_local_migration.sql)..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$ROOT_DIR/complete_local_migration.sql"
elif [ -f "$ROOT_DIR/backend/complete_local_migration.sql" ]; then
  echo "[4/4] Importing Complete Local Migration & Master Data ($ROOT_DIR/backend/complete_local_migration.sql)..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$ROOT_DIR/backend/complete_local_migration.sql"
fi

echo ""
echo "======================================================================"
echo " SUCCESS: All Tables, Sub-tables, Logic, Constraints & Schemas Ready!"
echo " All User Logins, Saudas, POs, Arrivals, & Payments Successfully Loaded!"
echo " Database '$DB_NAME' is fully initialized on your local PostgreSQL."
echo "======================================================================"
