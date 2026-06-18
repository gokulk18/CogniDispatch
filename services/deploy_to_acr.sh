#!/bin/bash
set -e

ACR_NAME="cogniregistry"

echo "Using Azure Container Registry (${ACR_NAME}) Tasks to build images..."

services=("auth-service" "vendor-service" "ai-service" "admin-service" "dispatch-service" "payment-service")

for service in "${services[@]}"; do
    echo "--------------------------------------------------"
    echo "Building $service via ACR Tasks..."
    echo "--------------------------------------------------"
    # Offload the build to ACR (we pass the context directory '.' and build file './Dockerfile')
    az acr build --registry $ACR_NAME --image cogni-${service}:v1 --image cogni-${service}:latest -f ./Dockerfile .
done

echo "--------------------------------------------------"
echo "Building custom Nginx Router via ACR Tasks..."
echo "--------------------------------------------------"

# Bake the nginx.conf into a custom image
cat <<EOF > ./nginx/Dockerfile
FROM nginx:alpine
COPY ./nginx-docker.conf /etc/nginx/nginx.conf
EOF

az acr build --registry $ACR_NAME --image cogni-nginx:v2 --image cogni-nginx:latest ./nginx

echo "=================================================="
echo "All 7 backend images successfully built on ACR!"
echo "=================================================="
