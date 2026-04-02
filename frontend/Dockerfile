FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# -------- Dependencies --------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# -------- Builder --------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# ✅ Pass env variables at build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_LIBRARY_API
ARG NEXT_PUBLIC_PETROLL_PAMP_API_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_LIBRARY_API=$NEXT_PUBLIC_LIBRARY_API
ENV NEXT_PUBLIC_PETROLL_PAMP_API_URL=$NEXT_PUBLIC_PETROLL_PAMP_API_URL

# Build app
RUN npm run build

# -------- Runner --------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Create non-root user
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy build output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]