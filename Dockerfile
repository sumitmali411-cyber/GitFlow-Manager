# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (all, including dev for build tools)
COPY package*.json ./
RUN npm ci

# Copy source and build the React frontend
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install production deps + tsx (needed to run server.ts at runtime)
COPY package*.json ./
RUN npm ci --omit=dev && npm install tsx

# Copy built React frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy server source (tsx transpiles it at startup)
COPY server.ts ./

# Expose the app port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/init || exit 1

CMD ["node_modules/.bin/tsx", "server.ts"]
