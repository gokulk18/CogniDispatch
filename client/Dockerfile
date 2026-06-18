# ──────────────────────────────────────────────────
# CogniDispatch Frontend — Multi-Stage Dockerfile
# ──────────────────────────────────────────────────

# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install --legacy-peer-deps

# Copy all source files
COPY . .

# Environment variables must be set at build time for Next.js compilation
ARG NEXT_PUBLIC_SERVER_IP
ENV NEXT_PUBLIC_SERVER_IP=$NEXT_PUBLIC_SERVER_IP

ARG NEXT_PUBLIC_SOCKET_IP
ENV NEXT_PUBLIC_SOCKET_IP=$NEXT_PUBLIC_SOCKET_IP

# Build the production Next.js bundle (outputs standalone version if configured in next.config.js)
RUN npm run build

# Stage 2: Clean and light production runner
FROM node:20-alpine AS runner

WORKDIR /app

# Upgrade OS packages to patch vulnerabilities
RUN apk update && apk upgrade --no-cache

ENV NODE_ENV=production
ENV PORT=3000

# Copy the standalone build from the builder stage
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Remove global npm and npx to eliminate npm-bundled vulnerabilities
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Expose frontend port
EXPOSE 3000

# Start the standalone Next.js production server
CMD ["node", "server.js"]
