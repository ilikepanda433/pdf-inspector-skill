$ErrorActionPreference = 'Stop'
Write-Host '=== pdf-inspector-skill installer ==='

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js not found. Install Node.js first.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'npm not found. Reinstall Node.js with npm included.'
}

Set-Location $PSScriptRoot
Write-Host '[1/2] Installing Node dependency...'
npm install

Write-Host '[2/2] Checking optional native CLI...'
if (Get-Command pdf2md -ErrorAction SilentlyContinue) {
  Write-Host 'Native pdf2md CLI is already available.'
} elseif (Get-Command cargo -ErrorAction SilentlyContinue) {
  Write-Host 'Cargo found. To enable all CLI-only features, run:'
  Write-Host '  cargo install pdf-inspector'
} else {
  Write-Host 'Rust/Cargo not found. Core classification + Markdown extraction still work through Node.'
  Write-Host 'Optional full CLI features can be added later with Rust +: cargo install pdf-inspector'
}

Write-Host ''
Write-Host 'Installed. Test with:'
Write-Host '  npm run selftest'
Write-Host 'Then try:'
Write-Host '  node .\scripts\pdf-tool.mjs "C:\path\file.pdf" --json'
