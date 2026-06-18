#!/bin/bash
set -e

ACR_NAME="cogniregistry"
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"

read -p "Enter your Application Gateway public IP or DNS hostname (e.g. 20.20.20.20): " APPGW_IP

if [ -z "$APPGW_IP" ]; then
    echo "Error: Application Gateway IP is required."
    exit 1
fi

# Ensure IP/domain starts with http:// or https:// if not already present
if [[ ! $APPGW_IP =~ ^https?:// ]]; then
    # If the input contains letters (like a domain name), use https, otherwise use http
    if [[ $APPGW_IP =~ [a-zA-Z] ]]; then
        APPGW_IP="https://${APPGW_IP}"
    else
        APPGW_IP="http://${APPGW_IP}"
    fi
fi

echo "Logging into Azure Container Registry (${ACR_NAME})..."
az acr login --name $ACR_NAME

echo "Building frontend image with server IP ${APPGW_IP}..."
docker build --build-arg NEXT_PUBLIC_SERVER_IP=$APPGW_IP -t "${ACR_LOGIN_SERVER}/cogni-frontend:v1" -t "${ACR_LOGIN_SERVER}/cogni-frontend:latest" .

echo "Pushing frontend image to ACR..."
docker push "${ACR_LOGIN_SERVER}/cogni-frontend:v1"
docker push "${ACR_LOGIN_SERVER}/cogni-frontend:latest"

echo "Frontend image successfully pushed to ACR!"
