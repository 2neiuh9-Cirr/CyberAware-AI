param([string]$PackageName = 'cyberaware-gmail-v1-vps.zip')

$ErrorActionPreference = 'Stop'
if ($PackageName -ne [System.IO.Path]::GetFileName($PackageName) -or -not $PackageName.EndsWith('.zip')) {
  throw 'PackageName must be a ZIP filename.'
}

$workspace = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$destinationDirectory = Join-Path $workspace 'deploy/packages'
$destination = Join-Path $destinationDirectory $PackageName
$items = @('backend', 'shared', 'src', 'public', 'dist', 'server.ts', 'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', 'index.html')
foreach ($item in $items) {
  if (-not (Test-Path -LiteralPath (Join-Path $workspace $item))) { throw "Missing package item: $item" }
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
$stream = [System.IO.File]::Open($destination, [System.IO.FileMode]::Create)
$archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create, $false)

function Add-ZipPath([string]$sourcePath) {
  $relative = $sourcePath.Substring($workspace.Length).TrimStart([char[]]@('\', '/')).Replace('\', '/')
  $entryInfo = Get-Item -LiteralPath $sourcePath -Force
  if ($entryInfo.LinkType) { throw "Symlink not supported in VPS package: $relative" }
  if ($entryInfo.PSIsContainer) {
    $entry = $archive.CreateEntry($relative + '/')
    $entry.ExternalAttributes = (0x41ED -shl 16) -bor 0x10 # Linux directory 755
    foreach ($child in Get-ChildItem -LiteralPath $sourcePath -Force | Sort-Object Name) { Add-ZipPath $child.FullName }
  } else {
    $entry = [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $sourcePath, $relative, [System.IO.Compression.CompressionLevel]::Optimal)
    $entry.ExternalAttributes = 0x81A4 -shl 16 # Linux regular file 644
  }
}

try {
  foreach ($item in $items) { Add-ZipPath (Join-Path $workspace $item) }
} finally {
  $archive.Dispose()
  $stream.Dispose()
}
Write-Output $destination
