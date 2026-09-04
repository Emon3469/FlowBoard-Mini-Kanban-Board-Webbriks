# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Set npm config to reduce permission issues
RUN npm config set unsafe-perm true && \
    npm config set optional false

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

ENV NODE_ENV=production

# Copy runtime dependencies
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
RUN npm ci --omit=dev

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/.next ./.next
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/next.config.ts ./next.config.ts

# Switch to non-root user
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/login').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "start"]