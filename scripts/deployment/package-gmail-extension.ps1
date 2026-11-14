$workspace = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$source = Join-Path $workspace 'browser-extension'
$destinationDirectory = Join-Path $workspace 'public/downloads'
$destination = Join-Path $destinationDirectory 'cyberaware-gmail-extension.zip'
New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
Compress-Archive -Path (Join-Path $source '*') -DestinationPath $destination -Force
Write-Output $destination
