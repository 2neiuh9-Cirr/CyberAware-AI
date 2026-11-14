param([string]$PackageName = 'cyberaware-gmail-v1-vps.zip')
$workspace = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$packageScript = Join-Path $PSScriptRoot 'package-gmail-vps.py'

python $packageScript $workspace $PackageName
if ($LASTEXITCODE -ne 0) { throw 'Could not create the Gmail VPS package.' }
