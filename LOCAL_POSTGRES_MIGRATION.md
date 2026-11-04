# Bally Jute ERP - 100% Local PostgreSQL Migration Guide

This application has been fully decoupled from Supabase Cloud. It now runs **100% on local PostgreSQL (`bjcl_db`)** using native Node.js PostgreSQL drivers (`pg.Pool`).

---

## What Changed in the Codebase

1. **Supabase Cloud Connection Removed**:
   - `src/lib/supabase.ts` now routes all 460+ database queries through a native client (`src/lib/localPostgresClient.ts`).
   - The Express backend (`server.ts`) directly handles database operations on local PostgreSQL (`bjcl_db` on port 5432) via `/api/db/*`.
   - No external Supabase URLs, anon keys, or third-party connections are used.

2. **Database Data Seed File (`seed_core_business_data.sql`)**:
   - Contains all 10 user accounts (`user_master`), 1,381 suppliers, 979 arrivals, 867 payments, saudas, and purchase orders extracted from the cloud database.

---

## Step-by-Step Setup on Your Local Ubuntu Server (`192.168.1.6`)

### Step 1: Initialize Database Schema in `bjcl_db`
In your terminal, navigate to the project directory:
```bash
chmod +x backend/*.sh
./backend/setup_database.sh
```
*(Enter your local PostgreSQL password. This creates `bjcl_db` and all table schemas, constraints, and area logic).*

### Step 2: Import All Core Business Data (All Tables & Rows)
Run this single command to insert all actual data:
```bash
psql -h localhost -U postgres -d bjcl_db -f seed_core_business_data.sql
```
*(Enter your local PostgreSQL password).*

### Step 3: Configure Environment Variables
Copy or edit `.env`:
```bash
nano .env
```
Ensure it contains your local PostgreSQL credentials:
```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=bjcl_db
PGUSER=postgres
PGPASSWORD=your_actual_postgres_password
PORT=3000
```
*(Save with `Ctrl + O`, `Enter`, `Ctrl + X`)*.

### Step 4: Build and Start the Application
```bash
npm install
npm run build
pm2 start dist/server.cjs --name "bjl-app"
pm2 save
pm2 startup
```

---

## Verifying the Migration

1. **In pgAdmin 4:**
   Connect to `bjcl_db` and run:
   ```sql
   SELECT 'user_master' as table, count(*) FROM user_master
   UNION ALL
   SELECT 'supply_master', count(*) FROM supply_master
   UNION ALL
   SELECT 'final_arrival', count(*) FROM final_arrival
   UNION ALL
   SELECT 'sauda_master', count(*) FROM sauda_master
   UNION ALL
   SELECT 'purchase_master', count(*) FROM purchase_master;
   ```
   *All rows will be present locally on your disk.*

2. **In the Web App:**
   Open:
   - Local PC: `http://localhost:3000`
   - Office LAN: `http://192.168.1.6:3000`
   - External (Static IP): `http://115.187.60.183:3000`

   Log in using the real administrator account:
   - **Username:** `ADMIN`
   - **Password:** `Admin@3656`

---

## Supabase Features Assessment
- **PostgREST / Realtime WebSockets:** Replaced by native Express `/api/db` routes that execute parameterized SQL directly against PostgreSQL.
- **Row Level Security (RLS) / Auth:** Replaced by the native application authentication system (`user_master` and session tokens).
- **Storage / Bucket:** File uploads are saved directly on the local server disk (`/public/uploads` or data URIs).
