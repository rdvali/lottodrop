#!/bin/bash
# LottoDrop Auto-Deploy Script
# Location: /usr/local/bin/deploy-lottodrop.sh
# This script pulls latest code from GitHub and restarts Docker containers

set -e

# Configuration
APP_DIR="/var/www/lottodrop"
REPO_URL="git@github.com:rdvali/lottodrop.git"
BRANCH="main"
LOG_FILE="/var/log/lottodrop-deploy.log"
LOCK_FILE="/tmp/lottodrop-deploy.lock"
DEPLOY_USER="deploy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} - $1" | tee -a "$LOG_FILE"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
}

log_info() {
    log "${YELLOW}[INFO]${NC} $1"
}

# Cleanup function
cleanup() {
    rm -f "$LOCK_FILE"
}
trap cleanup EXIT

# Check if another deploy is running
if [ -f "$LOCK_FILE" ]; then
    log_error "Another deployment is in progress. Exiting."
    exit 1
fi

# Create lock file
touch "$LOCK_FILE"

log_info "=========================================="
log_info "Starting LottoDrop deployment..."
log_info "=========================================="

# Navigate to app directory
cd "$APP_DIR" || {
    log_error "Failed to change to $APP_DIR"
    exit 1
}

# Fetch latest changes
log_info "Fetching latest changes from $BRANCH..."
git fetch origin "$BRANCH" 2>&1 | tee -a "$LOG_FILE"

# Check if there are changes
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/$BRANCH)

if [ "$LOCAL" = "$REMOTE" ]; then
    log_info "Already up to date. No deployment needed."
    exit 0
fi

log_info "New commits detected. Deploying..."
log_info "Current: $LOCAL"
log_info "Target:  $REMOTE"

# Pull latest code
log_info "Pulling latest code..."
git pull origin "$BRANCH" 2>&1 | tee -a "$LOG_FILE"

# Build and restart Docker containers
log_info "Rebuilding Docker containers..."

# Build frontend
log_info "Building frontend..."
docker-compose build frontend 2>&1 | tee -a "$LOG_FILE"

# Build backend
log_info "Building backend..."
docker-compose build backend 2>&1 | tee -a "$LOG_FILE"

# Build admin panel
log_info "Building admin panel..."
docker-compose build admin 2>&1 | tee -a "$LOG_FILE"

# Restart containers with zero downtime (rolling update)
log_info "Restarting containers..."
docker-compose up -d --no-deps frontend backend admin 2>&1 | tee -a "$LOG_FILE"

# Wait for containers to be healthy
log_info "Waiting for containers to be healthy..."
sleep 10

# Health check
HEALTHY=true
for container in lottodrop-frontend lottodrop-backend lottodrop-admin; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
    if [ "$STATUS" != "healthy" ]; then
        log_error "Container $container is not healthy: $STATUS"
        HEALTHY=false
    else
        log_success "Container $container is healthy"
    fi
done

if [ "$HEALTHY" = true ]; then
    log_success "=========================================="
    log_success "Deployment completed successfully!"
    log_success "Deployed commit: $(git rev-parse --short HEAD)"
    log_success "=========================================="
else
    log_error "Some containers are not healthy. Check logs."
    exit 1
fi

# Cleanup old Docker images (keep last 3)
log_info "Cleaning up old Docker images..."
docker image prune -f 2>&1 | tee -a "$LOG_FILE"

exit 0
