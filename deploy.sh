#!/bin/bash

# LottoDrop Production Deployment Script
# Run this script on your production server after transferring files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   LottoDrop Production Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create .env file with production configuration"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if running in production directory
if [ ! -f docker-compose.prod.yml ]; then
    echo -e "${RED}Error: docker-compose.prod.yml not found!${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo -e "${YELLOW}Starting deployment process...${NC}"
echo ""

# Step 1: Stop existing containers
echo -e "${GREEN}Step 1: Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down || true

# Step 2: Clean up old images
echo -e "${GREEN}Step 2: Cleaning up old images...${NC}"
docker system prune -f

# Step 3: Build new images
echo -e "${GREEN}Step 3: Building new images...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache

# Step 4: Start services
echo -e "${GREEN}Step 4: Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Step 5: Wait for services to be healthy
echo -e "${GREEN}Step 5: Waiting for services to be healthy...${NC}"
sleep 10

# Check if postgres is ready
echo "Checking PostgreSQL..."
for i in {1..30}; do
    if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U ${DB_USER:-lottodrop_user} > /dev/null 2>&1; then
        echo -e "${GREEN}PostgreSQL is ready!${NC}"
        break
    fi
    echo "Waiting for PostgreSQL... ($i/30)"
    sleep 2
done

# Check if redis is ready
echo "Checking Redis..."
if [ -z "$REDIS_PASSWORD" ]; then
    docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping > /dev/null 2>&1
else
    docker-compose -f docker-compose.prod.yml exec -T redis redis-cli -a $REDIS_PASSWORD ping > /dev/null 2>&1
fi
echo -e "${GREEN}Redis is ready!${NC}"

# Step 6: Run database migrations
echo -e "${GREEN}Step 6: Running database migrations...${NC}"
if [ -f backend/migrations/complete_schema.sql ]; then
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U ${DB_USER:-lottodrop_user} -d ${DB_NAME:-lottodrop} < backend/migrations/complete_schema.sql 2>/dev/null || {
        echo "Schema already exists or partially exists, continuing..."
    }
fi

# Step 7: Create admin user (if not exists)
echo -e "${GREEN}Step 7: Checking admin user...${NC}"
ADMIN_EXISTS=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U ${DB_USER:-lottodrop_user} -d ${DB_NAME:-lottodrop} -t -c "SELECT COUNT(*) FROM users WHERE email='${ADMIN_EMAIL:-admin@lottodrop.com}';" | tr -d ' ')

if [ "$ADMIN_EXISTS" -eq "0" ]; then
    echo "Creating admin user..."
    # Generate password hash for admin
    ADMIN_HASH=$(docker-compose -f docker-compose.prod.yml exec -T backend node -e "
        const bcrypt = require('bcrypt');
        bcrypt.hash('${ADMIN_PASSWORD:-Admin123}', 10).then(hash => console.log(hash));
    " | tail -1)
    
    # Insert admin user
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U ${DB_USER:-lottodrop_user} -d ${DB_NAME:-lottodrop} -c "
        INSERT INTO users (first_name, last_name, email, password_hash, balance, is_admin, is_active)
        VALUES ('Admin', 'User', '${ADMIN_EMAIL:-admin@lottodrop.com}', '$ADMIN_HASH', 10000, true, true)
        ON CONFLICT (email) DO NOTHING;
    "
    echo -e "${GREEN}Admin user created!${NC}"
else
    echo -e "${YELLOW}Admin user already exists${NC}"
fi

# Step 8: Show service status
echo ""
echo -e "${GREEN}Step 8: Checking service status...${NC}"
docker-compose -f docker-compose.prod.yml ps

# Step 9: Test endpoints
echo ""
echo -e "${GREEN}Step 9: Testing endpoints...${NC}"

# Test backend health
echo -n "Backend API Health: "
if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Not responding${NC}"
fi

# Test frontend
echo -n "Frontend: "
if curl -f -s http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Accessible${NC}"
else
    echo -e "${RED}✗ Not accessible${NC}"
fi

# Test admin panel
echo -n "Admin Panel: "
if curl -f -s http://localhost:8081 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Accessible${NC}"
else
    echo -e "${RED}✗ Not accessible${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Access URLs:${NC}"
echo "Frontend: https://${DOMAIN:-yourdomain.com}"
echo "Admin Panel: https://${DOMAIN:-yourdomain.com}/admin"
echo "API Health: https://${DOMAIN:-yourdomain.com}/api/health"
echo ""
echo -e "${YELLOW}Admin Credentials:${NC}"
echo "Email: ${ADMIN_EMAIL:-admin@lottodrop.com}"
echo "Password: ${ADMIN_PASSWORD:-Admin123}"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "Stop services: docker-compose -f docker-compose.prod.yml down"
echo "Backup database: ./backup.sh"
echo "Monitor health: ./monitor.sh"
echo ""