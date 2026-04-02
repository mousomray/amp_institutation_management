FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# Copy package.json and package-lock.json (if present)
COPY package*.json ./

# Install dependencies (use npm ci if a lockfile is present in your CI)
RUN npm install --production --silent

# Copy app source
COPY . .

# Default port (can be overridden at runtime)
ENV PORT=3004
EXPOSE 3004

# Use non-root user for better security (optional on alpine)
USER node

CMD ["node", "app.js"]
