# Bally Jute ERP - 100% Local PostgreSQL & pgAdmin Migration Guide

This application has been migrated from Supabase Cloud to run **100% locally on your own machine** using native PostgreSQL (`bjcl_db`) and pgAdmin 4.

---

## Why You Saw Those 3 Errors (And How We Fix Them)

### Error 1: `failed to resolve host 'ubuntu/127.0.0.1': [Errno -2] Name or service not known`
- **Cause**: In pgAdmin 4 "Register - Server" modal, under the "Connection" tab, you entered `ubuntu/127.0.0.1`.
- **Fix**: The Host name must be **`127.0.0.1`** or **`localhost`** (without `ubuntu/`).

### Error 2: `Failed to start postgresql.service: Unit postgresql.service not found.`
- **Cause**: PostgreSQL server is **not installed** yet on your Ubuntu machine (`ubuntu@ubuntu`).
- **Fix**: Run:
  ```bash
  sudo apt update
  sudo apt install -y postgresql postgresql-contrib
  ```

### Error 3: `connection to server at "127.0.0.1", port 5432 failed: Connection refused`
- **Cause**: Port 5432 is refused because PostgreSQL wasn't installed or running.
- **Fix**: Once installed and started (`sudo systemctl start postgresql`), port 5432 will accept connections immediately.

---

## 🚀 1-Click Automated Setup (Recommended)

Run the included automated setup script in your project directory:
```bash
chmod +x import_to_local_postgres.sh
./import_to_local_postgres.sh
```

**What this script does automatically**:
1. Checks if PostgreSQL is installed; installs it via `apt` if missing.
2. Starts and enables the `postgresql` service.
3. Sets the `postgres` superuser password to `postgres`.
4. Creates the database `bjcl_db`.
5. Imports **all 82 tables, views, and 9 stored functions** from `complete_local_schema.sql`.
6. Imports **100% of live data (84,726 rows across 59 active tables)** from `complete_local_data.sql`.
7. Generates the local `.env` file pointing directly to `postgresql://postgres:postgres@localhost:5432/bjcl_db`.

---

## 🖥️ How to Connect in pgAdmin 4

1. Open pgAdmin 4.
2. In the left sidebar, right-click **Servers** ➔ **Register** ➔ **Server...**
3. **General Tab**:
   - **Name**: `Bally Jute Local DB` (or any label)
4. **Connection Tab**:
   - **Host name/address**: `127.0.0.1`  *(NOT `ubuntu/127.0.0.1`)*
   - **Port**: `5432`
   - **Maintenance database**: `bjcl_db`  *(or `postgres`)*
   - **Username**: `postgres`
   - **Password**: `postgres`
   - Check **Save password?**
5. Click **Save**.
6. You will see all 82 tables and 9 functions inside:
   `Servers ➔ Bally Jute Local DB ➔ Databases ➔ bjcl_db ➔ Schemas ➔ public ➔ Tables`

---

## 📊 Summary of Migrated Tables & Data

- **Total Exposed Tables**: 82 of 82 tables
- **Total Exposed Functions**: 9 of 9 functions (`fn_save_material_inspection`, `update_purchase_pending_received`, `exec_sql_return`, etc.)
- **Total Live Data Records**: 84,726 rows
  - `user_master`: 10 real users
  - `supply_master`: 1,381 suppliers
  - `temporary_material_received`: 979 arrivals
  - `payment_master`: 867 payment records
  - `satta_calculated_rates`: 58,074 rate records
  - `sauda_check_point_details`: 4,374 sauda items
  - `material_inspection`: inspection records
  - All other masters (area, broker, godown, grade, marka, unit, etc.)

---

## 🏃 Running the Application Locally

```bash
npm run dev
```
Open **http://localhost:3000** in your browser. All data loads directly from your local PostgreSQL database!
