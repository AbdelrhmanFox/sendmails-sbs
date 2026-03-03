# تشغيل بذر الأدمن (admin / 123) بعد إنشاء جدول app_users في Supabase.
# الاستخدام: شغّل هذا الملف بعد تنفيذ الـ SQL في Supabase SQL Editor مرة واحدة.
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
  Write-Host "أنشئ ملف .env من .env.example واملأ SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY ثم شغّل هذا السكربت مرة أخرى."
  exit 1
}

Set-Location $rootDir
node scripts/seed-admin.js
