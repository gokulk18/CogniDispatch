$acrName = "cogniregistry"
$acrLoginServer = "$acrName.azurecr.io"

$appGwIp = Read-Host -Prompt "Enter your Application Gateway public IP or DNS hostname (e.g. 20.20.20.20)"
if (-not $appGwIp) {
    Write-Host "Error: Application Gateway IP is required." -ForegroundColor Red
    exit 1
}

# Ensure IP starts with http:// if not already present
if (-not $appGwIp.StartsWith("http://") -and -not $appGwIp.StartsWith("https://")) {
    $appGwIp = "http://$appGwIp"
}

Write-Host "Logging into Azure Container Registry ($acrName)..." -ForegroundColor Cyan
az acr login --name $acrName

Write-Host "Building frontend image with server IP $appGwIp..." -ForegroundColor Yellow
docker build --build-arg NEXT_PUBLIC_SERVER_IP=$appGwIp -t "$acrLoginServer/cogni-frontend:v1" -t "$acrLoginServer/cogni-frontend:latest" .

Write-Host "Pushing frontend image to ACR..." -ForegroundColor Yellow
docker push "$acrLoginServer/cogni-frontend:v1"
docker push "$acrLoginServer/cogni-frontend:latest"

Write-Host "Frontend image successfully pushed to ACR!" -ForegroundColor Green
