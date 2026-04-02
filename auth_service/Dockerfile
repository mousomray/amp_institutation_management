# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Runtime stage
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install security updates
RUN apk update && apk add --no-cache dumb-init

# Copy node modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create uploads directory with proper permissions
RUN mkdir -p /app/public /app/uploads && \
    chmod 755 /app/public /app/uploads

# Set NODE_ENV to production
ENV NODE_ENV=production

# Expose the application port
EXPOSE 8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/sbin/dumb-init", "--"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080', (r) => {if (r.statusCode !== 404) throw new Error(r.statusCode)})" || exit 1

# Start the application
CMD ["node", "index.js"]
