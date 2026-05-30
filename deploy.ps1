#!/usr/bin/env pwsh
# SalesForge AI — One-Command Deploy Script
# Usage: .\deploy.ps1
# Requirements: Node.js, npm, git, Vercel account

param(
    [string]$VercelToken = $env:VERCEL_TOKEN,
    [string]$AppUrl = ""
)

Write-Host "`n🚀 SalesForge AI — Deploy to Vercel`n" -ForegroundColor Cyan

if (-not $VercelToken) {
    Write-Host "❌ VERCEL_TOKEN not set." -ForegroundColor Red
    Write-Host "   Get a full-access token from: https://vercel.com/account/tokens" -ForegroundColor Yellow
    Write-Host "   Then run: `$env:VERCEL_TOKEN='your-token'; .\deploy.ps1`n" -ForegroundColor Yellow
    exit 1
}

# 1. Build
Write-Host "📦 Building production bundle..." -ForegroundColor Blue
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Fix errors and retry." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build successful`n" -ForegroundColor Green

# 2. Deploy with Vercel CLI
Write-Host "🌐 Deploying to Vercel..." -ForegroundColor Blue
$deployOutput = npx vercel --token $VercelToken --yes --prod 2>&1
Write-Host $deployOutput

# Extract URL from output
$url = ($deployOutput | Select-String -Pattern "https://[a-z0-9\-\.]+\.vercel\.app" | ForEach-Object { $_.Matches.Value } | Select-Object -Last 1)

if ($url) {
    Write-Host "`n✅ Deployed successfully!" -ForegroundColor Green
    Write-Host "🔗 URL: $url`n" -ForegroundColor Cyan
    
    # Update NEXT_PUBLIC_APP_URL in Vercel env vars
    Write-Host "🔧 Setting environment variables in Vercel..." -ForegroundColor Blue
    
    $envVars = @{
        "NEXT_PUBLIC_APP_URL" = $url
    }
    
    foreach ($key in $envVars.Keys) {
        $body = @{
            key = $key
            value = $envVars[$key]
            type = "plain"
            target = @("production")
        } | ConvertTo-Json
        
        npx vercel env add $key production --token $VercelToken <<< $envVars[$key] 2>$null
    }
    
    Write-Host "`n🎉 SalesForge AI is LIVE at: $url" -ForegroundColor Green
    Write-Host "`n📋 Next steps:" -ForegroundColor White
    Write-Host "   1. Go to $url and sign up for your account" -ForegroundColor Gray
    Write-Host "   2. Set your API keys in Settings → API Credentials" -ForegroundColor Gray  
    Write-Host "   3. Define your ICP in Settings → ICP Definition" -ForegroundColor Gray
    Write-Host "   4. Launch your first campaign from AI Agents" -ForegroundColor Gray
} else {
    Write-Host "`n⚠️  Deployment output doesn't contain URL. Check Vercel dashboard." -ForegroundColor Yellow
    Write-Host "   Dashboard: https://vercel.com/dashboard`n" -ForegroundColor Cyan
}
