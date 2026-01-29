# Multi-stage Dockerfile for LottoDrop Frontend
# Production-ready with security optimizations

# Stage 1: Build
FROM node:20-alpine AS builder

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies for build stage
# Using legacy-peer-deps due to React 19 compatibility
RUN npm ci --legacy-peer-deps && \
    npm cache clean --force

# Copy source code
COPY . .

# Set build arguments (use relative URLs for nginx proxy)
ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=
ARG VITE_SENTRY_DSN
ARG VITE_APP_VERSION
ARG VITE_APP_NAME=LottoDrop
ARG VITE_SEO_PAGES_ENABLED=true
ARG VITE_SEO_LANDING_PAGES_ENABLED=true

# Set environment variables
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_SEO_PAGES_ENABLED=$VITE_SEO_PAGES_ENABLED
ENV VITE_SEO_LANDING_PAGES_ENABLED=$VITE_SEO_LANDING_PAGES_ENABLED
ENV NODE_ENV=production

# Build the application (skip TypeScript checking for Docker build)
RUN npx vite build --mode production

# Stage 2: Production
FROM nginx:alpine AS production

# Security: Install security updates and curl for healthcheck
RUN apk update && apk upgrade && \
    apk add --no-cache ca-certificates curl && \
    rm -rf /var/cache/apk/*

# nginx user already exists in nginx:alpine image
# Just ensure proper permissions

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-site.conf /etc/nginx/conf.d/default.conf

# Security: Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Security: Keep curl for healthcheck, remove only ca-certificates
RUN apk del ca-certificates

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]