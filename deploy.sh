#!/bin/bash

# LottoDrop Deployment Script
# This script handles git operations, server authentication, and Docker deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="188.245.218.95"
SERVER_USER="root"
SERVER_PATH="/var/www/lottodrop/"

# Check if password variable is set, if not prompt for it
if [ -z "$SERVER_PASSWORD" ]; then
    echo -e "${YELLOW}🔐 Server password not set in environment variable.${NC}"
    echo -e "${BLUE}Please enter the server password:${NC}"
    read -s SERVER_PASSWORD
    echo ""  # New line after hidden input
fi

echo -e "${BLUE}🚀 Starting LottoDrop deployment...${NC}"

# Step 1: Git add all changes
echo -e "${YELLOW}📝 Adding all changes to git...${NC}"
git add .

# Step 2: Generate commit message based on recent changes
echo -e "${YELLOW}📋 Analyzing recent changes...${NC}"

# Get list of changed files
CHANGED_FILES=$(git diff --cached --name-only)
if [ -z "$CHANGED_FILES" ]; then
    echo -e "${YELLOW}No changes to commit.${NC}"
    exit 0
fi

# Generate a summary of changes
echo "Changed files:"
echo "$CHANGED_FILES"

# Create a commit message based on file changes
COMMIT_MSG=""
if echo "$CHANGED_FILES" | grep -q "frontend/"; then
    COMMIT_MSG="feat: update frontend components"
elif echo "$CHANGED_FILES" | grep -q "backend/"; then
    COMMIT_MSG="feat: update backend services"
elif echo "$CHANGED_FILES" | grep -q "frontend-admin/"; then
    COMMIT_MSG="feat: update admin panel"
elif echo "$CHANGED_FILES" | grep -q "\.md$"; then
    COMMIT_MSG="docs: update documentation"
elif echo "$CHANGED_FILES" | grep -q "docker"; then
    COMMIT_MSG="feat: update Docker configuration"
else
    COMMIT_MSG="feat: update project files"
fi

# Add timestamp to commit message
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
COMMIT_MSG="$COMMIT_MSG - $TIMESTAMP"

echo -e "${YELLOW}📝 Committing changes: $COMMIT_MSG${NC}"
git commit -m "$COMMIT_MSG"

# Step 3: Push to remote repository
echo -e "${YELLOW}📤 Pushing changes to remote repository...${NC}"
git push

echo -e "${GREEN}✅ Local git operations completed successfully!${NC}"

# Step 4: Connect to remote server and deploy
echo -e "${BLUE}🌐 Connecting to remote server ($SERVER_IP)...${NC}"

# Use sshpass for password authentication
if ! command -v sshpass &> /dev/null; then
    echo -e "${RED}Error: sshpass is not installed. Please install it first:${NC}"
    echo "  macOS: brew install hudochenkov/sshpass/sshpass"
    echo "  Ubuntu/Debian: sudo apt-get install sshpass"
    exit 1
fi

# Step 5-7: Execute commands on remote server
echo -e "${YELLOW}🔄 Deploying to production server...${NC}"

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << EOF
    set -e
    
    echo "📁 Changing to project directory..."
    cd $SERVER_PATH
    
    echo "📥 Pulling latest changes from git..."
    git pull
    
    echo "🛑 Stopping current containers..."
    docker-compose -f docker-compose.prod.yml down
    
    echo "🔨 Building new images with latest code..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    echo "🚀 Starting all services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    echo "✅ Deployment completed successfully!"
    
    # Show running containers
    echo "📊 Current running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
EOF

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}Your LottoDrop application is now live at: http://$SERVER_IP${NC}"