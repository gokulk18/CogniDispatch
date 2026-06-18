FROM node:20-alpine
WORKDIR /app

# Copy shared library
COPY shared /app/shared

# We will mount the specific service at build time via docker-compose context, 
# but the Dockerfile needs to be able to copy it.
# Actually, since docker-compose sets context to `.`, we copy everything and run npm install in the specific working_dir.
COPY . /app/

# The working_dir is set in docker-compose.yml, so we don't run npm install here.
# Instead we'll use a script or command in docker-compose, OR run it via CMD.
# A better approach: Run npm install in all directories.
RUN cd /app/shared && npm install
RUN cd /app/auth-service && npm install
RUN cd /app/vendor-service && npm install
RUN cd /app/ai-service && npm install
RUN cd /app/admin-service && npm install
RUN cd /app/dispatch-service && npm install
RUN cd /app/payment-service && npm install

CMD ["npm", "start"]
