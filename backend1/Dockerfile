FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# -------- Runtime stage --------
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dumb-init
RUN apk add --no-cache dumb-init

# Copy dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p /app/public /app/uploads && \
    chmod 755 /app/public /app/uploads

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose port (matches your .env)
EXPOSE 8080

# Use dumb-init
ENTRYPOINT ["dumb-init", "--"]

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run as non-root user (optional)
USER node

# Start app
CMD ["node", "index.js"]