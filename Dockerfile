# Stage 1: Build Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
RUN apk add --no-cache python3 make g++
COPY client/package.json ./
RUN yarn install
COPY client/ ./
# Tailwind and other build steps happen here
RUN npm run build

# Stage 2: Build Server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
RUN apk add --no-cache python3 make g++ openssl libc6-compat
COPY server/package.json ./
RUN yarn install
COPY server/prisma ./prisma/
# Generate Prisma Client
RUN npx prisma generate
COPY server/ ./
RUN npm run build

# Stage 3: Production Runtime
FROM node:20-alpine
WORKDIR /app

# Copy package.json to context
COPY server/package*.json ./

# Copy node_modules from builder to include generated prisma client and dependencies
# Using full node_modules ensures we have 'prisma' CLI if needed for migrations, 
# and avoids 'module not found' issues with platform-specific binaries.
COPY --from=server-builder /app/server/node_modules ./node_modules

# Copy built server files
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/prisma ./prisma

# Copy built client files to 'public' directory
# The Fastify server is configured to serve static files from 'public' in the CWD
COPY --from=client-builder /app/client/dist ./public

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/server.js"]
