# Bally Jute Company Limited - Local Ubuntu 24 Deployment Guide

This repository contains the complete Raw Jute ERP system (Sauda, PO, Amad, Inspections, Settlements, Payments, Stocks, Reports) pre-configured to run on your local Ubuntu 24 server (`192.168.1.6`) with external access via your static router IP (`115.187.60.183`).

---

## Folder Structure

```text
RJ-BJCL/
├── backend/                  <-- Backend configuration & automated database scripts
│   ├── setup_database.sh     <-- Runs once to create bjcl_db & import all tables
│   ├── postgrest.conf        <-- PostgREST configuration linking bjcl_db to Port 8000
│   └── start_backend.sh      <-- Starts the backend & database services via PM2
├── src/                      <-- Complete Frontend React / TypeScript UI
├── server.ts                 <-- Full-stack Express API server
├── supabase_schema.sql       <-- Complete SQL schema (all tables, functions, indexes)
├── package.json              <-- Project configuration and dependencies
└── .env                      <-- Local environment configuration
```

---

## 3-Minute Quick Setup on Ubuntu 24

### Step 1: Set up the Database (`bjcl_db`)
In your terminal, navigate to the `RJ-BJCL` folder and run:
```bash
chmod +x backend/*.sh
./backend/setup_database.sh
```
*Enter your PostgreSQL password when prompted. It will automatically create `bjcl_db` and import all tables!*

### Step 2: Install PostgREST & Dependencies
```bash
sudo apt update && sudo apt install -y postgrest nodejs npm
sudo npm install -g pm2
npm install
npm run build
```

### Step 3: Configure `.env`
Edit your `.env` file:
```bash
nano .env
```
Ensure it has:
```env
VITE_SUPABASE_URL=http://115.187.60.183:8000
PORT=3000
```

Also update your password in `backend/postgrest.conf`:
```bash
nano backend/postgrest.conf
```
*(Change `YOUR_POSTGRES_PASSWORD` to your actual postgres password).*

### Step 4: Start Everything
```bash
./backend/start_backend.sh
```

---

## Router Port Forwarding (For Static IP `115.187.60.183`)

In your router admin portal (`http://192.168.1.1`):
1. **Rule 1 (Web App):** WAN Port `3000` ➔ LAN IP `192.168.1.6` : Port `3000` (TCP)
2. **Rule 2 (Database API):** WAN Port `8000` ➔ LAN IP `192.168.1.6` : Port `8000` (TCP)

Open firewall on Ubuntu:
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
sudo ufw enable
```

Access your web app anywhere at:
**`http://115.187.60.183:3000`**
