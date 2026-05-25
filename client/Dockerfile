# ──────────────────────────────────────────────────
# CogniDispatch Frontend — Multi-Stage Dockerfile
# ──────────────────────────────────────────────────

# ── Stage 1: Build ──────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including dev, needed for Next.js build)
RUN npm install --legacy-peer-deps

# Copy all source files
COPY . .

# IMPORTANT: NEXT_PUBLIC_SERVER_IP must be set at BUILD time.
# It becomes the Application Gateway public URL visible to browsers.
# Pass via: docker build --build-arg NEXT_PUBLIC_SERVER_IP=http://<APPGW_PUBLIC_IP>
ARG NEXT_PUBLIC_SERVER_IP=http://localhost:5000
ENV NEXT_PUBLIC_SERVER_IP=$NEXT_PUBLIC_SERVER_IP

# Build the production Next.js bundle
RUN npm run build

# ── Stage 2: Runtime ─────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy only what is needed to run the built app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Expose frontend port
EXPOSE 3000

# Start Next.js production server
CMD ["npm", "start"]
