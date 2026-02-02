# Auth Service Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy and install shared library first
COPY shared ./shared
WORKDIR /app/shared
RUN npm install --only=production
RUN npm link

# Install service dependencies
WORKDIR /app/auth-service
COPY services/auth-service/package*.json ./
RUN npm link @cloudretail/shared
RUN npm install --only=production --legacy-peer-deps

# Copy application code
COPY services/auth-service .

# Expose port and set health check
WORKDIR /app/auth-service

# Link shared library
RUN npm link @cloudretail/shared

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the service
CMD ["node", "src/index.js"]
