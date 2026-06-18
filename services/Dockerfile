# ──────────────────────────────────────────────────
# CogniDispatch Backend — Multi-Stage Dockerfile
# ──────────────────────────────────────────────────

# Stage 1: Install dependencies and build shared library + service
FROM node:20-alpine AS builder
WORKDIR /app

# Define build argument for the service to compile/install
ARG SERVICE_NAME

# Copy shared library
COPY shared /app/shared
RUN cd /app/shared && npm install --omit=dev

# Copy specific service
COPY ${SERVICE_NAME} /app/${SERVICE_NAME}
RUN cd /app/${SERVICE_NAME} && npm install --omit=dev

# Stage 2: Clean production runner
FROM node:20-alpine AS runner
WORKDIR /app

ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}
ENV PORT=5000

# Copy only the installed dependencies and code from builder
COPY --from=builder /app/shared /app/shared
COPY --from=builder /app/${SERVICE_NAME} /app/${SERVICE_NAME}

WORKDIR /app/${SERVICE_NAME}

# Set node user for security
USER node

# Expose port (can be overridden, default is PORT)
EXPOSE ${PORT}

# Start the specific microservice
CMD ["npm", "start"]
