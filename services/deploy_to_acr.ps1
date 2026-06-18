$acrName = "acrcogniutrawi"
$acrLoginServer = "$acrName.azurecr.io"

Write-Host "Logging into Azure Container Registry ($acrName)..." -ForegroundColor Cyan
az acr login --name $acrName

$services = @("auth-service", "vendor-service", "ai-service", "admin-service", "dispatch-service")

foreach ($service in $services) {
    Write-Host "Building and pushing $service..." -ForegroundColor Yellow
    docker build -t "$acrLoginServer/cogni-$service:v1" -t "$acrLoginServer/cogni-$service:latest" -f .\Dockerfile .
    docker push "$acrLoginServer/cogni-$service:v1"
    docker push "$acrLoginServer/cogni-$service:latest"
}

Write-Host "Building and pushing custom Nginx Router..." -ForegroundColor Yellow
# Azure App Service does not allow local file volume mounts, so we MUST bake the nginx.conf into a custom image!
$nginxDockerfile = @"
FROM nginx:alpine
COPY ./nginx-docker.conf /etc/nginx/nginx.conf
"@
Set-Content -Path ".\nginx\Dockerfile" -Value $nginxDockerfile
docker build -t "$acrLoginServer/cogni-nginx:v2" -t "$acrLoginServer/cogni-nginx:latest" ".\nginx"
docker push "$acrLoginServer/cogni-nginx:v2"
docker push "$acrLoginServer/cogni-nginx:latest"

Write-Host "All 6 backend images successfully pushed to ACR!" -ForegroundColor Green
