version: '3.8'

services:
  auth-service:
    image: ${acr_server}/cogni-auth-service:${backend_image_tag}
    restart: always
    environment:
      - PORT=5001
    ports:
      - "5001:5001"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:5001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  vendor-service:
    image: ${acr_server}/cogni-vendor-service:${backend_image_tag}
    restart: always
    environment:
      - PORT=5002
    ports:
      - "5002:5002"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:5002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  ai-service:
    image: ${acr_server}/cogni-ai-service:${backend_image_tag}
    restart: always
    environment:
      - PORT=5003
    ports:
      - "5003:5003"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:5003/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  admin-service:
    image: ${acr_server}/cogni-admin-service:${backend_image_tag}
    restart: always
    environment:
      - PORT=5004
    ports:
      - "5004:5004"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:5004/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  dispatch-service:
    image: ${acr_server}/cogni-dispatch-service:${backend_image_tag}
    restart: always
    environment:
      - PORT=5005
    ports:
      - "5005:5005"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:5005/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: ${acr_server}/cogni-nginx:${backend_image_tag}
    restart: always
    ports:
      - "5000:5000"
    depends_on:
      auth-service:
        condition: service_healthy
      vendor-service:
        condition: service_healthy
      ai-service:
        condition: service_healthy
      admin-service:
        condition: service_healthy
      dispatch-service:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
