# =============================================================================
# Package SocialForge Codebase for Deployment (Fast & Clean via tar.exe)
# =============================================================================

$zipFileName = "socialforge-production.zip"
Write-Host "Creating clean deployment bundle: $zipFileName..." -ForegroundColor Cyan

# Remove old zip if present
if (Test-Path $zipFileName) {
    Remove-Item $zipFileName -Force
}

$tarExe = "C:\Windows\System32\tar.exe"
if (Test-Path $tarExe) {
    & $tarExe -a -c -f $zipFileName `
      --exclude="node_modules" `
      --exclude="*/node_modules/*" `
      --exclude=".git" `
      --exclude="scratch" `
      --exclude="tmp" `
      --exclude="temp" `
      --exclude="uploads" `
      --exclude="dist" `
      --exclude="*.zip" `
      --exclude="*.tar.gz" `
      --exclude="*.log" `
      --exclude=".turbo" `
      .
} else {
    Write-Host "tar.exe not found, falling back to Compress-Archive..." -ForegroundColor Yellow
    Get-ChildItem -Path . -Exclude @('node_modules', '.git', 'scratch', 'tmp', 'uploads', 'dist', '*.zip') | Compress-Archive -DestinationPath $zipFileName
}

if (Test-Path $zipFileName) {
    $sizeMB = [math]::Round((Get-Item $zipFileName).Length / 1MB, 2)
    Write-Host "Success! Deployment package created: $zipFileName ($sizeMB MB)" -ForegroundColor Green
    Write-Host "Ready to upload to your VPS via SCP or SFTP." -ForegroundColor Yellow
} else {
    Write-Host "Failed to create deployment package." -ForegroundColor Red
}
