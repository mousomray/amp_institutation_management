FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --production --silent

# Copy app source
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=3004

# Expose port
EXPOSE 3004

# Use non-root user for better security
USER node

# Use dumb-init
ENTRYPOINT ["dumb-init", "--"]

# Start app
CMD ["node", "app.js"]