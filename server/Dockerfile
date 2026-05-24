# ─────────────────────────────────────────────
# CogniDispatch Backend — Production Dockerfile
# ─────────────────────────────────────────────
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency manifests first (layer caching)
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production

# Copy all source files (controllers, db folder with seed data, server.js)
COPY . .

# Expose backend port
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]
