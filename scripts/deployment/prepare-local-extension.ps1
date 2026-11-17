param([ValidateRange(1,65535)][int]$Port = 3000)

$workspace = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$source = Join-Path $workspace 'browser-extension'
$destination = Join-Path $workspace 'deploy/local-extension'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
foreach ($name in @('popup.html', 'popup.css', 'popup.js', 'README.md')) {
  Copy-Item -LiteralPath (Join-Path $source $name) -Destination (Join-Path $destination $name) -Force
}
$manifest = Get-Content -LiteralPath (Join-Path $source 'manifest.json') -Raw | ConvertFrom-Json
$manifest.name = 'CyberAware AI - Local test'
$manifest.host_permissions = @('http://localhost/*')
$utf8 = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText((Join-Path $destination 'manifest.json'), ($manifest | ConvertTo-Json -Depth 10), $utf8)
[System.IO.File]::WriteAllText((Join-Path $destination 'config.js'), "globalThis.CYBERAWARE_API_ORIGIN = 'http://localhost:$Port';", $utf8)
Write-Output $destination
