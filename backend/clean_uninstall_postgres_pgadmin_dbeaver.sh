#!/bin/bash
set -e

# ==============================================================================
# Bally Jute ERP - Complete Removal & Cleanup Script
# Removes PostgreSQL, pgAdmin 4, and DBeaver from Ubuntu / Debian
# ==============================================================================

echo "=========================================================="
echo " Starting Full Purge of PostgreSQL, pgAdmin 4 & DBeaver..."
echo "=========================================================="

# 1. Stop all active PostgreSQL and pgAdmin services
echo "[1/6] Stopping services..."
sudo systemctl stop postgresql 2>/dev/null || true
sudo systemctl disable postgresql 2>/dev/null || true
sudo systemctl stop pgadmin4 2>/dev/null || true
sudo systemctl disable pgadmin4 2>/dev/null || true
sudo pkill -u postgres 2>/dev/null || true

# 2. Completely purge PostgreSQL packages
echo "[2/6] Purging PostgreSQL packages..."
sudo apt-get --purge remove -y postgresql postgresql-* libpq-dev postgresql-client-* 2>/dev/null || true
sudo apt-get autoremove -y --purge
sudo apt-get autoclean

# 3. Completely purge pgAdmin 4
echo "[3/6] Purging pgAdmin 4..."
sudo apt-get --purge remove -y pgadmin4 pgadmin4-desktop pgadmin4-web pgadmin4-* 2>/dev/null || true
sudo apt-get autoremove -y --purge

# 4. Remove DBeaver (APT, Snap, and Flatpak versions)
echo "[4/6] Removing DBeaver Community Edition..."
sudo apt-get --purge remove -y dbeaver-ce dbeaver 2>/dev/null || true
sudo snap remove dbeaver-ce 2>/dev/null || true
flatpak uninstall io.dbeaver.DBeaverCommunity -y 2>/dev/null || true

# 5. Delete all lingering configuration directories, databases, and logs
echo "[5/6] Deleting leftover files, databases, and config directories..."
sudo rm -rf /etc/postgresql
sudo rm -rf /etc/postgresql-common
sudo rm -rf /var/lib/postgresql
sudo rm -rf /var/log/postgresql
sudo rm -rf /var/lib/pgadmin
sudo rm -rf /var/log/pgadmin
sudo rm -rf ~/.pgadmin
sudo rm -rf /etc/apt/sources.list.d/pgadmin4.list*
sudo rm -rf ~/.local/share/DBeaverData
sudo rm -rf ~/.eclipse

# 6. Remove the system 'postgres' user and group (optional clean state)
echo "[6/6] Cleaning system user and group..."
sudo deluser --remove-home postgres 2>/dev/null || true
sudo delgroup postgres 2>/dev/null || true

echo "=========================================================="
echo " Cleanup Complete! Ports 5432 and all old configs are free."
echo " You are now ready to run Supabase Docker!"
echo "=========================================================="
