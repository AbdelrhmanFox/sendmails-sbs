# Seed admin user (admin / 123) after creating app_users table in Supabase.
# Run this script after executing the SQL in Supabase SQL Editor once.
$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

if (Test-Path "$rootDir\.env") {
  Get-Content "$rootDir\.env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
      [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
    }
  }
} else {
  Write-Host "Create .env from .env.example, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run this script again."
  exit 1
}

Set-Location $rootDir
node scripts/seed-admin.js
