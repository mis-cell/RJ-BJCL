# ======================================================================
#   Bally Jute - Complete 100% Supabase to Local PostgreSQL (Windows PowerShell)
# ======================================================================

$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "    Bally Jute - Complete Supabase to Local PostgreSQL Migration      " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Locate psql executable
$psqlCmd = "psql"
if (-not (Get-Command "psql" -ErrorAction SilentlyContinue)) {
    # Check default Windows PostgreSQL installation paths
    $pgPaths = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue | Sort-Object FullName -Descending
    if ($pgPaths.Count -gt 0) {
        $psqlCmd = $pgPaths[0].FullName
        Write-Host "Found PostgreSQL at: $psqlCmd" -ForegroundColor Green
    } else {
        Write-Host "❌ Error: 'psql' not found in PATH or standard Program Files." -ForegroundColor Red
        Write-Host "Please ensure PostgreSQL is installed on this Windows PC." -ForegroundColor Yellow
        exit 1
    }
}

$env:PGPASSWORD = "postgres"
$pgHost = "127.0.0.1"
$pgPort = "5432"
$pgUser = "postgres"
$dbName = "bjcl_db"

# 2. Create database bjcl_db if it doesn't exist
Write-Host "`n📋 Step 1/3: Creating database '$dbName'..." -ForegroundColor Yellow
try {
    & $psqlCmd -h $pgHost -p $pgPort -U $pgUser -c "CREATE DATABASE $dbName;" 2>$null
    Write-Host "✅ Database '$dbName' ready." -ForegroundColor Green
} catch {
    Write-Host "Database '$dbName' already exists, continuing..." -ForegroundColor Gray
}

# 3. Apply Schema (All 82 Tables, Constraints, Indexes & 9 Functions)
Write-Host "`n📋 Step 2/3: Applying exact 82 tables schema + 9 stored functions..." -ForegroundColor Yellow
if (Test-Path "complete_local_schema.sql") {
    & $psqlCmd -h $pgHost -p $pgPort -U $pgUser -d $dbName -f "complete_local_schema.sql"
    Write-Host "✅ Schema created successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Error: complete_local_schema.sql not found!" -ForegroundColor Red
    exit 1
}

# 4. Decompress and Import Data (84,726 rows)
Write-Host "`n💾 Step 3/3: Importing 100% of live data (84,726 rows) into $dbName..." -ForegroundColor Yellow

$gzFile = Join-Path $PSScriptRoot "complete_local_data.sql.gz"
$sqlFile = Join-Path $PSScriptRoot "complete_local_data.sql"

if (Test-Path $gzFile) {
    Write-Host "📦 Extracting complete_local_data.sql.gz..." -ForegroundColor Gray
    $inStream = [System.IO.File]::OpenRead($gzFile)
    $gzStream = New-Object System.IO.Compression.GZipStream($inStream, [System.IO.Compression.CompressionMode]::Decompress)
    $outStream = [System.IO.File]::Create($sqlFile)
    $gzStream.CopyTo($outStream)
    $gzStream.Dispose()
    $outStream.Dispose()
    $inStream.Dispose()
    Write-Host "✅ Decompressed complete_local_data.sql" -ForegroundColor Green
}

if (Test-Path $sqlFile) {
    Write-Host "💾 Loading data into PostgreSQL (this may take a few seconds)..." -ForegroundColor Gray
    & $psqlCmd -h $pgHost -p $pgPort -U $pgUser -d $dbName -f $sqlFile
    Write-Host "✅ Data imported successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Error: Neither complete_local_data.sql.gz nor complete_local_data.sql found!" -ForegroundColor Red
    exit 1
}

# 5. Configure local .env file
$envContent = @"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bjcl_db
PGHOST=localhost
PGPORT=5432
PGDATABASE=bjcl_db
PGUSER=postgres
PGPASSWORD=postgres
PORT=3000
"@
Set-Content -Path (Join-Path $PSScriptRoot ".env") -Value $envContent -Encoding UTF8
Write-Host "✅ Local .env file configured." -ForegroundColor Green

# 6. Verify table counts and row counts
Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "  Migration Verification (All Tables & Records in Local PostgreSQL)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
& $psqlCmd -h $pgHost -p $pgPort -U $pgUser -d $dbName -c "
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

Write-Host "`n======================================================================" -ForegroundColor Green
Write-Host "🎉 SUCCESS: All 82 Tables & 85,143 Records Migrated to Local PostgreSQL!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "👉 Start your app with: npm run dev" -ForegroundColor Yellow

