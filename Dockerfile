# Use Node.js 20 LTS (Debian slim instead of Alpine for better Prisma compatibility)
FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
RUN apt-get update && apt-get install -y openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set Node options for build (increase memory limit)
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Create a dummy DATABASE_URL for build time (Prisma needs it for PostgreSQL)
ENV DATABASE_URL="postgresql://user:password@localhost:5432/dummy"

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application (set standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install OpenSSL 3.x for Prisma runtime
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
COPY start.sh ./start.sh

# Set permissions and make start script executable
RUN chown -R nextjs:nodejs /app && chmod +x /app/start.sh

USER nextjs

EXPOSE 8080

# Run migrations and start the server
CMD ["./start.sh"]
