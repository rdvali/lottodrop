#!/bin/bash

# LottoDrop Production Deployment Script
# This script prepares and deploys the application to a production server
# It automatically configures everything from local settings

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   LottoDrop Production Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to generate secure passwords
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Function to generate JWT secret
generate_jwt_secret() {
    openssl rand -base64 64 | tr -d "=+/"
}

# Check if running locally or on server
if [ "$1" == "--prepare" ]; then
    # ============================================
    # PREPARE MODE: Run this locally before upload
    # ============================================

    echo -e "${CYAN}Running in PREPARE mode...${NC}"
    echo -e "${CYAN}This will prepare everything for server deployment${NC}"
    echo ""

    # Create deployment directory
    DEPLOY_DIR="lottodrop-deploy-$(date +%Y%m%d-%H%M%S)"
    mkdir -p $DEPLOY_DIR

    echo -e "${GREEN}Creating deployment package in: $DEPLOY_DIR${NC}"

    # Copy necessary files
    echo -e "${YELLOW}Copying project files...${NC}"
    cp -r backend $DEPLOY_DIR/
    cp -r frontend $DEPLOY_DIR/
    cp -r frontend-admin $DEPLOY_DIR/
    cp docker-compose.prod.yml $DEPLOY_DIR/
    cp -r scripts $DEPLOY_DIR/ 2>/dev/null || true

    # Remove node_modules and other unnecessary files
    echo -e "${YELLOW}Cleaning up unnecessary files...${NC}"
    find $DEPLOY_DIR -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
    find $DEPLOY_DIR -name ".git" -type d -exec rm -rf {} + 2>/dev/null || true
    find $DEPLOY_DIR -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
    find $DEPLOY_DIR -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
    find $DEPLOY_DIR -name "*.log" -type f -delete 2>/dev/null || true

    # Generate production .env file
    echo -e "${YELLOW}Generating production configuration...${NC}"

    # Read local database config if available
    if [ -f .env ]; then
        source .env
    fi

    # Generate secure passwords if not set
    PROD_DB_PASSWORD=${DB_PASSWORD:-$(generate_password)}
    PROD_REDIS_PASSWORD=$(generate_password)
    PROD_JWT_SECRET=$(generate_jwt_secret)
    PROD_SESSION_SECRET=$(generate_jwt_secret)
    PROD_ADMIN_PASSWORD=${ADMIN_PASSWORD:-$(generate_password)}

    # Create production .env file
    cat > $DEPLOY_DIR/.env.production << EOF
# LottoDrop Production Configuration
# Generated on $(date)

# ============ DATABASE CONFIGURATION ============
DB_HOST=postgres
DB_PORT=5432
DB_NAME=${DB_NAME:-lottodrop}
DB_USER=${DB_USER:-lottodrop_user}
DB_PASSWORD=$PROD_DB_PASSWORD

# ============ REDIS CONFIGURATION ============
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$PROD_REDIS_PASSWORD
REDIS_DB=0

# ============ BACKEND CONFIGURATION ============
NODE_ENV=production
PORT=3001
BACKEND_PORT=3001

# ============ SECURITY ============
JWT_SECRET=$PROD_JWT_SECRET
SESSION_SECRET=$PROD_SESSION_SECRET
BCRYPT_ROUNDS=12

# ============ ADMIN ACCOUNT ============
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@lottodrop.com}
ADMIN_PASSWORD=$PROD_ADMIN_PASSWORD

# ============ FRONTEND CONFIGURATION ============
# Update these with your actual domain
DOMAIN=yourdomain.com
VITE_API_URL=https://yourdomain.com/api
VITE_SOCKET_URL=https://yourdomain.com
REACT_APP_API_URL=https://yourdomain.com/api

# ============ CORS CONFIGURATION ============
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# ============ APPLICATION ============
VITE_APP_NAME=LottoDrop
VITE_APP_VERSION=2.0.0
PLATFORM_COMMISSION=0.10

# ============ RATE LIMITING ============
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ============ SSL (Optional - for Nginx) ============
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
EOF

    # Copy this deploy script to the package
    cp $0 $DEPLOY_DIR/deploy.sh
    chmod +x $DEPLOY_DIR/deploy.sh

    # Create nginx configuration
    cat > $DEPLOY_DIR/nginx.conf << 'EOF'
# Nginx configuration for LottoDrop
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Admin Panel
    location /admin {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # API and WebSocket
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

    # Create setup script
    cat > $DEPLOY_DIR/setup.sh << 'EOF'
#!/bin/bash
# Initial server setup script

set -e

echo "Installing Docker and Docker Compose..."

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Install Nginx
apt-get install -y nginx certbot python3-certbot-nginx

# Create docker network
docker network create lottodrop-network 2>/dev/null || true

echo "Setup complete!"
echo "Next steps:"
echo "1. Update .env.production with your domain"
echo "2. Run: ./deploy.sh --server"
echo "3. Setup SSL: certbot --nginx -d yourdomain.com -d www.yourdomain.com"
EOF
    chmod +x $DEPLOY_DIR/setup.sh

    # Create backup script
    cat > $DEPLOY_DIR/backup.sh << 'EOF'
#!/bin/bash
# Database backup script

source .env.production

BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/lottodrop_backup_$TIMESTAMP.sql"

echo "Creating backup: $BACKUP_FILE"
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U $DB_USER -d $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "Backup successful!"
    gzip $BACKUP_FILE
    echo "Compressed to: ${BACKUP_FILE}.gz"

    # Keep only last 7 days of backups
    find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
else
    echo "Backup failed!"
    exit 1
fi
EOF
    chmod +x $DEPLOY_DIR/backup.sh

    # Create restore script
    cat > $DEPLOY_DIR/restore.sh << 'EOF'
#!/bin/bash
# Database restore script

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup-file.sql.gz>"
    exit 1
fi

source .env.production

echo "Restoring from: $1"
gunzip -c $1 | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $DB_USER -d $DB_NAME

if [ $? -eq 0 ]; then
    echo "Restore successful!"
else
    echo "Restore failed!"
    exit 1
fi
EOF
    chmod +x $DEPLOY_DIR/restore.sh

    # Create monitoring script
    cat > $DEPLOY_DIR/monitor.sh << 'EOF'
#!/bin/bash
# Service monitoring script

while true; do
    clear
    echo "LottoDrop Service Monitor - $(date)"
    echo "================================"

    docker-compose -f docker-compose.prod.yml ps

    echo ""
    echo "Container Stats:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

    sleep 5
done
EOF
    chmod +x $DEPLOY_DIR/monitor.sh

    # Create tarball for easy transfer
    echo -e "${YELLOW}Creating deployment package...${NC}"
    tar -czf ${DEPLOY_DIR}.tar.gz $DEPLOY_DIR

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ Deployment package created successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${CYAN}Package created: ${DEPLOY_DIR}.tar.gz${NC}"
    echo ""
    echo -e "${YELLOW}Important credentials (save these!)${NC}"
    echo "Database Password: $PROD_DB_PASSWORD"
    echo "Redis Password: $PROD_REDIS_PASSWORD"
    echo "Admin Email: ${ADMIN_EMAIL:-admin@lottodrop.com}"
    echo "Admin Password: $PROD_ADMIN_PASSWORD"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Upload ${DEPLOY_DIR}.tar.gz to your server"
    echo "2. Extract: tar -xzf ${DEPLOY_DIR}.tar.gz"
    echo "3. cd ${DEPLOY_DIR}"
    echo "4. Update .env.production with your domain"
    echo "5. Run: ./setup.sh (first time only)"
    echo "6. Run: ./deploy.sh --server"

elif [ "$1" == "--server" ]; then
    # ============================================
    # SERVER MODE: Run this on the production server
    # ============================================

    echo -e "${CYAN}Running in SERVER mode...${NC}"
    echo ""

    # Check for .env.production file
    if [ ! -f .env.production ]; then
        echo -e "${RED}Error: .env.production file not found!${NC}"
        echo "Please run './deploy.sh --prepare' locally first"
        exit 1
    fi

    # Use production env file
    cp .env.production .env
    source .env

    # Check if docker-compose.prod.yml exists
    if [ ! -f docker-compose.prod.yml ]; then
        echo -e "${RED}Error: docker-compose.prod.yml not found!${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Starting deployment...${NC}"

    # Step 1: Stop existing containers
    echo -e "${GREEN}Step 1: Stopping existing containers...${NC}"
    docker-compose -f docker-compose.prod.yml down || true

    # Step 2: Remove old images
    echo -e "${GREEN}Step 2: Cleaning up old images...${NC}"
    docker system prune -af --volumes || true

    # Step 3: Build images
    echo -e "${GREEN}Step 3: Building Docker images...${NC}"
    docker-compose -f docker-compose.prod.yml build --no-cache

    # Step 4: Start database first
    echo -e "${GREEN}Step 4: Starting database...${NC}"
    docker-compose -f docker-compose.prod.yml up -d postgres redis

    # Wait for database
    echo "Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U ${DB_USER} > /dev/null 2>&1; then
            echo -e "${GREEN}PostgreSQL is ready!${NC}"
            break
        fi
        echo "Waiting... ($i/30)"
        sleep 2
    done

    # Step 5: Initialize database
    echo -e "${GREEN}Step 5: Initializing database...${NC}"
    if [ -f backend/migrations/complete_schema.sql ]; then
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U ${DB_USER} -d ${DB_NAME} < backend/migrations/complete_schema.sql 2>/dev/null || {
            echo "Schema already exists, continuing..."
        }
    fi

    # Step 6: Start all services
    echo -e "${GREEN}Step 6: Starting all services...${NC}"
    docker-compose -f docker-compose.prod.yml up -d

    # Wait for services to be healthy
    echo -e "${GREEN}Waiting for services to be healthy...${NC}"
    sleep 15

    # Step 7: Create admin user
    echo -e "${GREEN}Step 7: Creating admin user...${NC}"
    docker-compose -f docker-compose.prod.yml exec backend npm run seed:admin 2>/dev/null || {
        echo "Admin user might already exist, continuing..."
    }

    # Step 8: Check service status
    echo ""
    echo -e "${GREEN}Step 8: Service Status${NC}"
    docker-compose -f docker-compose.prod.yml ps

    # Step 9: Test endpoints
    echo ""
    echo -e "${GREEN}Step 9: Testing endpoints...${NC}"

    # Test backend
    echo -n "Backend API: "
    if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Healthy${NC}"
    else
        echo -e "${RED}✗ Not responding${NC}"
    fi

    # Test frontend
    echo -n "Frontend: "
    if curl -f -s http://localhost:8080 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Running${NC}"
    else
        echo -e "${RED}✗ Not accessible${NC}"
    fi

    # Test admin
    echo -n "Admin Panel: "
    if curl -f -s http://localhost:8081 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Running${NC}"
    else
        echo -e "${RED}✗ Not accessible${NC}"
    fi

    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}✅ Deployment Complete!${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Service URLs:${NC}"
    echo "Frontend: https://${DOMAIN}"
    echo "Admin Panel: https://${DOMAIN}/admin"
    echo "API: https://${DOMAIN}/api"
    echo ""
    echo -e "${YELLOW}Useful commands:${NC}"
    echo "View logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "Monitor: ./monitor.sh"
    echo "Backup: ./backup.sh"
    echo "Restart: docker-compose -f docker-compose.prod.yml restart"

else
    # Show usage
    echo -e "${YELLOW}Usage:${NC}"
    echo ""
    echo -e "${CYAN}Local preparation (run on your machine):${NC}"
    echo "  ./deploy.sh --prepare"
    echo "  This creates a deployment package with all configurations"
    echo ""
    echo -e "${CYAN}Server deployment (run on production server):${NC}"
    echo "  ./deploy.sh --server"
    echo "  This deploys the application using the prepared package"
    echo ""
    echo -e "${YELLOW}Workflow:${NC}"
    echo "1. Run './deploy.sh --prepare' locally"
    echo "2. Upload the generated .tar.gz file to your server"
    echo "3. Extract and run './deploy.sh --server' on the server"
fi