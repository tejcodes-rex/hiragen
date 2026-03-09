# ---- Build Stage ----
FROM node:20-slim AS builder

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for building)
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY tsconfig.json ./
COPY src ./src/

# Build TypeScript
RUN npx tsc

# ---- Production Stage ----
FROM node:20-slim AS production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install production dependencies + tsx for seeding
COPY package.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev && npm install tsx

# Generate Prisma client in production image
RUN npx prisma generate

# Copy built output from builder
COPY --from=builder /app/dist ./dist

# Create directory for deliverable files
RUN mkdir -p public/deliverables

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Run database migrations, seed, then start the server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx tsx prisma/seed.ts 2>/dev/null; node dist/index.js"]
