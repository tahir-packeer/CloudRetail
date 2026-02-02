# Order Service Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy shared library
COPY ../../shared /app/shared
WORKDIR /app/shared
RUN npm ci --only=production
RUN npm link

# Copy application code
WORKDIR /app
COPY . .

# Link shared library
RUN npm link @cloudretail/shared

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the service
CMD ["node", "src/index.js"]
