#!/bin/bash
# ==============================================================================
# Automated Database Setup Script for Bally Jute (bjcl_db)
# Runs on Ubuntu 24 to create bjcl_db and import all tables, schema & relations
# ==============================================================================

set -e

DB_NAME="bjcl_db"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
SCHEMA_FILE="$(dirname "$0")/../supabase_schema.sql"

echo "======================================================================"
echo "    Bally Jute Company Limited - Local Database Setup"
echo "======================================================================"
echo "Target Database: $DB_NAME on $DB_HOST:$DB_PORT"
echo ""

read -s -p "Enter password for PostgreSQL user '$DB_USER': " DB_PASS
echo ""
export PGPASSWORD="$DB_PASS"

# Check PostgreSQL connection
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c '\q' 2>/dev/null; then
  echo "Error: Could not connect to PostgreSQL. Please check your password or make sure PostgreSQL is running ('sudo systemctl start postgresql')."
  exit 1
fi

echo "Connected successfully to PostgreSQL."

# Create database bjcl_db if it does not exist
DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")
if [ "$DB_EXISTS" != "1" ]; then
  echo "Creating database '$DB_NAME'..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
else
  echo "Database '$DB_NAME' already exists."
fi

# Execute schema
if [ -f "$SCHEMA_FILE" ]; then
  echo "Importing complete schema and tables from $SCHEMA_FILE into '$DB_NAME'..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCHEMA_FILE"
  echo ""
  echo "SUCCESS: All tables, columns, indexes, and relations created in '$DB_NAME'!"
else
  echo "Error: Schema file not found at $SCHEMA_FILE"
  exit 1
fi
