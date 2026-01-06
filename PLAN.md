# Plan: Fix Multiplayer Game Synchronization

## Problem Diagnosis

**Root Cause:** Prisma cannot connect to the database because the Docker container is missing the correct OpenSSL library.

**Error from Cloud Run logs:**
```
Unable to require(`/app/src/generated/prisma/libquery_engine-debian-openssl-1.1.x.so.node`).
Prisma cannot find the required `libssl` system library in your system.
Details: libssl.so.1.1: cannot open shared object file: No such file or directory
```

**Why this happens:**
- The Dockerfile uses `node:20-slim` (Debian Bookworm) which ships with OpenSSL 3.x
- Prisma generates a query engine for `debian-openssl-1.1.x` by default
- The container has `libssl3` installed, but Prisma needs `libssl.so.1.1`

## Solution

### Option 1: Install OpenSSL 1.1 compatibility library (Recommended)

Update Dockerfile to install the correct OpenSSL version in ALL stages:

```dockerfile
# In deps stage
FROM base AS deps
RUN apt-get update && apt-get install -y \
    openssl \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# In builder stage - need OpenSSL for Prisma generate
FROM base AS builder
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

# In runner stage - need OpenSSL for runtime
FROM base AS runner
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*
```

### Option 2: Use Node 18 with older Debian (has OpenSSL 1.1)

```dockerfile
FROM node:18-slim AS base
```

### Option 3: Force Prisma to use OpenSSL 3.x engine

Add to `prisma/schema.prisma`:
```prisma
generator client {
  provider      = "prisma-client-js"
  output        = "../src/generated/prisma"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

## Recommended Fix: Option 3 (cleanest solution)

This tells Prisma to generate the query engine for OpenSSL 3.x which matches what's installed in `node:20-slim`.

### Implementation Steps

1. **Update Prisma schema** to specify correct binary target:
   - File: `prisma/schema.prisma`
   - Add `binaryTargets = ["native", "debian-openssl-3.0.x"]`

2. **Update Dockerfile** to ensure OpenSSL 3 is installed in runner stage:
   - Install `openssl` package (not `libssl-dev`)
   - Keep the slim image for smaller size

3. **Regenerate Prisma client locally** to verify it works:
   - Run `npx prisma generate`

4. **Run database migration** to create tables in Cloud SQL:
   - Need to run `npx prisma db push` or `npx prisma migrate deploy`

5. **Rebuild and deploy** to Google Cloud

## Additional Issue: Database Tables Not Created

Even after fixing Prisma, the database tables don't exist yet. Need to either:
- Run `prisma migrate deploy` during Docker build (for production)
- Or run `prisma db push` once after deployment

### Recommended: Add migration step to Dockerfile

```dockerfile
# In runner stage, before starting the app
# Run migrations on startup (or use a separate init container)
```

Or add a startup script that runs migrations before starting the server.

## Files to Modify

1. `prisma/schema.prisma` - Add binaryTargets
2. `Dockerfile` - Ensure OpenSSL 3 is installed, add migration step
3. `package.json` - Add postinstall or migrate script (optional)

## Verification Steps

After deploying:
1. Check Cloud Run logs for Prisma errors
2. Test creating a game from the lobby
3. Test that friend can see the game in available games list
4. Test joining and playing moves
