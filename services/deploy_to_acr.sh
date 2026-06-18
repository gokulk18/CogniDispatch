#!/bin/bash
set -e

ACR_NAME="cogniregistry"
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"

echo "Logging into Azure Container Registry (${ACR_NAME})..."
az acr login --name $ACR_NAME

services=("auth-service" "vendor-service" "ai-service" "admin-service" "dispatch-service" "payment-service")

for service in "${services[@]}"; do
    echo "Building and pushing $service..."
    docker build -t "${ACR_LOGIN_SERVER}/cogni-${service}:v1" -t "${ACR_LOGIN_SERVER}/cogni-${service}:latest" -f ./Dockerfile .
    docker push "${ACR_LOGIN_SERVER}/cogni-${service}:v1"
    docker push "${ACR_LOGIN_SERVER}/cogni-${service}:latest"
done

echo "Building and pushing custom Nginx Router..."
# Bake the nginx.conf into a custom image
cat <<EOF > ./nginx/Dockerfile
FROM nginx:alpine
COPY ./nginx-docker.conf /etc/nginx/nginx.conf
EOF

docker build -t "${ACR_LOGIN_SERVER}/cogni-nginx:v2" -t "${ACR_LOGIN_SERVER}/cogni-nginx:latest" ./nginx
docker push "${ACR_LOGIN_SERVER}/cogni-nginx:v2"
docker push "${ACR_LOGIN_SERVER}/cogni-nginx:latest"

echo "All 7 backend images successfully pushed to ACR!"
