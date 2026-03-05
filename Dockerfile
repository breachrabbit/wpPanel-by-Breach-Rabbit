# =============================================================================
# wpPanel by Breach Rabbit — Production Dockerfile
# =============================================================================
# Multi-stage build for Next.js 16.1 with standalone output
# Base: node:20-alpine (matches Prisma binaryTargets: linux-musl-openssl-3.0.x)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Base — Install system dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# ---------------------------------------------------------------------------
# Stage 2: Dependencies — Install node_modules
# ---------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --ignore-scripts
RUN npx prisma generate

# ---------------------------------------------------------------------------
# Stage 3: Builder — Build the application
# ---------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js (standalone output)
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 4: Runner — Production image
# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema for migrations
COPY --from=builder /app/prisma ./prisma

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
