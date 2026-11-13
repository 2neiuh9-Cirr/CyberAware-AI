$workspace = Split-Path -Parent $PSScriptRoot
$packageScript = Join-Path $PSScriptRoot 'package-gmail-vps.py'

python $packageScript $workspace
if ($LASTEXITCODE -ne 0) { throw 'Could not create the Gmail VPS package.' }
