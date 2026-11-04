# Local Supabase Docker Migration & Setup Guide

This guide provides instructions to:
1. **Completely uninstall and purge** old local PostgreSQL, pgAdmin 4, and DBeaver from your Ubuntu machine.
2. **Run Supabase locally using Docker** with built-in **Supabase Studio Web GUI** (eliminating the need for pgAdmin or DBeaver).
3. **Import all data and schemas** into the local Supabase Docker database.
4. **Connect the Bally Jute application** to local Supabase.

---

## Part 1: Completely Uninstall PostgreSQL, pgAdmin 4 & DBeaver

Run the following commands in your Ubuntu terminal:

```bash
# 1. Stop all PostgreSQL & pgAdmin services
sudo systemctl stop postgresql 2>/dev/null || true
sudo systemctl disable postgresql 2>/dev/null || true
sudo systemctl stop pgadmin4 2>/dev/null || true
sudo systemctl disable pgadmin4 2>/dev/null || true
sudo pkill -u postgres 2>/dev/null || true

# 2. Completely remove and purge PostgreSQL packages
sudo apt-get --purge remove -y postgresql postgresql-* libpq-dev postgresql-client-*
sudo apt-get autoremove -y --purge
sudo apt-get autoclean

# 3. Completely remove and purge pgAdmin 4
sudo apt-get --purge remove -y pgadmin4 pgadmin4-desktop pgadmin4-web pgadmin4-*
sudo apt-get autoremove -y --purge

# 4. Remove DBeaver (APT, Snap, and Flatpak)
sudo apt-get --purge remove -y dbeaver-ce dbeaver 2>/dev/null || true
sudo snap remove dbeaver-ce 2>/dev/null || true
flatpak uninstall io.dbeaver.DBeaverCommunity -y 2>/dev/null || true

# 5. Delete all old database directories, configs, and logs
sudo rm -rf /etc/postgresql /etc/postgresql-common /var/lib/postgresql /var/log/postgresql
sudo rm -rf /var/lib/pgadmin /var/log/pgadmin ~/.pgadmin /etc/apt/sources.list.d/pgadmin4.list*
sudo rm -rf ~/.local/share/DBeaverData ~/.eclipse

# 6. Remove the system postgres user and group
sudo deluser --remove-home postgres 2>/dev/null || true
sudo delgroup postgres 2>/dev/null || true
```

*Or simply run the included cleanup script:*
```bash
chmod +x backend/clean_uninstall_postgres_pgadmin_dbeaver.sh
./backend/clean_uninstall_postgres_pgadmin_dbeaver.sh
```

---

## Part 2: Install Docker (If Not Already Installed)

Ensure Docker and Docker Compose are installed:

```bash
# Install Docker and Docker Compose plugin on Ubuntu
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2

# Start and enable Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Allow your user to run Docker without sudo (optional, recommended)
sudo usermod -aG docker $USER
```
*(Note: If you ran `usermod`, log out and log back in or run `newgrp docker` to apply).*

---

## Part 3: Start Local Supabase with Docker

You have two simple ways to run Supabase Docker. **Method A (Supabase CLI)** is recommended as it starts everything in one command.

### Method A: Using Supabase CLI (Recommended)

In your repository directory (`~/RJ-BJCL`):

```bash
# 1. Fix Docker permission (Required on Ubuntu):
sudo systemctl start docker
sudo chmod 666 /var/run/docker.sock
sudo usermod -aG docker $USER

# 2. Start local Supabase Docker stack (in your project folder ~/Public/RJ-BJCL-main):
npx supabase start
```

*(Note: You do NOT need to run `npx supabase init` because `supabase/config.toml` already exists! If you ever need to re-initialize fresh, use `npx supabase init --force`)*

When it finishes starting, it displays your local credentials:
- **Supabase Studio GUI**: `http://localhost:54323` (Use your browser to view all tables and run queries!)
- **API URL**: `http://localhost:54321`
- **PostgreSQL Connection**: `postgresql://postgres:postgres@localhost:54322/postgres`
- **Anon Key**: (Shown in terminal output)

---

### Method B: Using Official Supabase Docker Compose

If you prefer standard Docker Compose:

```bash
# 1. Clone the official Supabase Docker repository
git clone --depth 1 https://github.com/supabase/supabase ~/supabase-docker

# 2. Go to the docker directory
cd ~/supabase-docker/docker

# 3. Copy sample env
cp .env.example .env

# 4. Pull and run all containers
docker compose up -d
```
- **Supabase Studio GUI**: `http://localhost:8000` (Default login: `dashboard` / `this_password_is_insecure_and_should_be_updated`)
- **PostgreSQL Port**: `5432` (password in `.env` is `your-super-secret-and-long-postgres-password`)

---

## Part 4: Import Complete Database & Data (33,000+ Rows)

Import the complete data migration into your local Supabase Docker instance:

### If using Method A (Supabase CLI on port 54322):
```bash
cd ~/RJ-BJCL
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -f complete_local_migration.sql
```

### Alternatively, using Supabase Studio Web UI:
1. Open your browser to `http://localhost:54323`
2. Click **SQL Editor** on the left menu.
3. Open `complete_local_migration.sql` or `supabase_schema.sql` and click **Run**.

---

## Part 5: Update Your `.env` File

Update your `.env` file in `~/RJ-BJCL/.env`:

```env
# Database connection for Bally Jute backend
PGHOST=localhost
PGPORT=54322
PGDATABASE=postgres
PGUSER=postgres
PGPASSWORD=postgres

# Direct connection URI
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

PORT=3000
```

---

## Part 6: Start Your Application

```bash
cd ~/RJ-BJCL
npm run dev
```

1. Open `http://localhost:3000` in your browser.
2. Sign in with:
   - **User ID**: `admin` or `001`
   - **Password**: `admin@123` or your configured password.
3. All tables, user accounts, and business records will be available through your local Supabase Docker database.
