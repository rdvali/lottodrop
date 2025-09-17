#!/bin/bash

# LottoDrop Production Environment Setup Script
# Securely configures production environment with cryptographic secret generation
# Author: Gaming Finance Backend & Enterprise Solution Architect
# Version: 2.0.0

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
declare -r RED='\033[0;31m'
declare -r GREEN='\033[0;32m'
declare -r YELLOW='\033[1;33m'
declare -r BLUE='\033[0;34m'
declare -r CYAN='\033[0;36m'
declare -r MAGENTA='\033[0;35m'
declare -r NC='\033[0m' # No Color

# Configuration
declare -r SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
declare -r LOG_DIR="${SCRIPT_DIR}/logs"
declare -r LOG_FILE="${LOG_DIR}/setup_production_$(date +%Y%m%d_%H%M%S).log"
declare -r LOCK_FILE="${SCRIPT_DIR}/.setup.lock"

# Security requirements
declare -r MIN_PASSWORD_LENGTH=16
declare -r REQUIRED_ENTROPY_BITS=256

# Environment files
declare -r ENV_FILE="${SCRIPT_DIR}/.env"
declare -r ENV_PRODUCTION_FILE="${SCRIPT_DIR}/.env.production"
declare -r ENV_BACKUP_FILE="${SCRIPT_DIR}/.env.backup.$(date +%Y%m%d_%H%M%S)"

# Logging functions
setup_logging() {
    mkdir -p "$LOG_DIR"
    exec 1> >(tee -a "$LOG_FILE")
    exec 2> >(tee -a "$LOG_FILE" >&2)
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $*" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARN:${NC} $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $*" | tee -a "$LOG_FILE"
}

log_security() {
    echo -e "${MAGENTA}[$(date +'%Y-%m-%d %H:%M:%S')] SECURITY:${NC} $*" | tee -a "$LOG_FILE"
}

# Cleanup function
cleanup() {
    local exit_code=$?
    log_info "Cleaning up setup process..."

    [[ -f "$LOCK_FILE" ]] && rm -f "$LOCK_FILE"

    if [[ $exit_code -ne 0 ]]; then
        log_error "Production setup failed with exit code $exit_code"
        log_error "Check logs at: $LOG_FILE"
        echo -e "\n${RED}❌ Production setup failed! Check logs for details.${NC}"
        echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
    fi

    # Secure cleanup of temporary files
    find /tmp -name "lottodrop_temp_*" -type f -delete 2>/dev/null || true

    exit $exit_code
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Lock mechanism
acquire_lock() {
    if [[ -f "$LOCK_FILE" ]]; then
        local lock_pid
        lock_pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
        if [[ -n "$lock_pid" ]] && kill -0 "$lock_pid" 2>/dev/null; then
            log_error "Another setup process is already running (PID: $lock_pid)"
            exit 1
        else
            log_warn "Removing stale lock file"
            rm -f "$LOCK_FILE"
        fi
    fi

    echo $$ > "$LOCK_FILE"
}

# Check system requirements
check_system_requirements() {
    log_info "Checking system requirements..."

    # Check for required commands
    local required_commands=("docker" "openssl" "curl" "grep" "awk" "sed")
    local missing_commands=()

    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            missing_commands+=("$cmd")
        fi
    done

    if [[ ${#missing_commands[@]} -gt 0 ]]; then
        log_error "Missing required commands: ${missing_commands[*]}"
        echo -e "${RED}Please install the missing commands and try again.${NC}"
        return 1
    fi

    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        echo -e "${RED}Please start Docker and try again.${NC}"
        return 1
    fi

    # Check Docker Compose
    local compose_cmd=""
    if command -v docker-compose >/dev/null 2>&1; then
        compose_cmd="docker-compose"
    elif docker compose version >/dev/null 2>&1; then
        compose_cmd="docker compose"
    else
        log_error "Neither 'docker-compose' nor 'docker compose' found"
        return 1
    fi

    log_success "System requirements check passed"
    log_info "Docker Compose command: $compose_cmd"
    return 0
}

# Generate cryptographically secure secrets
generate_secure_secret() {
    local purpose="$1"
    local length="${2:-64}"

    log_security "Generating secure secret for: $purpose"

    # Use OpenSSL to generate cryptographically secure random bytes
    local secret
    secret=$(openssl rand -base64 "$length" | tr -d '\n' | head -c "$length")

    # Validate the generated secret
    if [[ ${#secret} -lt "$length" ]]; then
        log_error "Generated secret is too short for $purpose"
        return 1
    fi

    # Basic entropy check (ensure it's not all the same character)
    local unique_chars
    unique_chars=$(echo "$secret" | fold -w1 | sort -u | wc -l)
    if [[ "$unique_chars" -lt 10 ]]; then
        log_warn "Low entropy detected for $purpose, regenerating..."
        generate_secure_secret "$purpose" "$length"
        return $?
    fi

    echo "$secret"
}

# Generate secure database password
generate_db_password() {
    log_security "Generating secure database password..."

    # Generate a 32-character password with mixed case, numbers, and symbols
    local password
    password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

    # Ensure minimum complexity
    if [[ ${#password} -lt $MIN_PASSWORD_LENGTH ]]; then
        log_error "Generated password is too short"
        return 1
    fi

    echo "$password"
}

# Generate admin password
generate_admin_password() {
    log_security "Generating secure admin password..."

    # Generate a human-readable but secure password
    local words=("Secure" "Gaming" "Lotto" "Drop" "Admin" "Finance" "Crypto" "Platform")
    local numbers
    numbers=$(openssl rand -hex 4)
    local symbols="!@#$%"
    local symbol=${symbols:$((RANDOM % ${#symbols})):1}

    local password="${words[$((RANDOM % ${#words[@]}))]}${words[$((RANDOM % ${#words[@]}))]}${numbers}${symbol}"

    echo "$password"
}

# Validate domain configuration
validate_domain() {
    local domain="$1"

    if [[ -z "$domain" ]]; then
        log_error "Domain cannot be empty"
        return 1
    fi

    # Basic domain validation
    if [[ ! "$domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        log_error "Invalid domain format: $domain"
        return 1
    fi

    log_success "Domain validation passed: $domain"
    return 0
}

# Create secure environment file
create_production_env() {
    local domain="${1:-localhost}"
    local use_ssl="${2:-false}"

    log_info "Creating production environment configuration..."

    # Generate all secrets
    local jwt_secret db_password redis_password session_secret admin_password
    jwt_secret=$(generate_secure_secret "JWT" 64)
    db_password=$(generate_db_password)
    redis_password=$(generate_db_password)
    session_secret=$(generate_secure_secret "Session" 32)
    admin_password=$(generate_admin_password)

    # Determine URL scheme
    local scheme="http"
    [[ "$use_ssl" == "true" ]] && scheme="https"

    # Create production environment file
    cat > "$ENV_PRODUCTION_FILE" << EOF
# LottoDrop Production Environment Configuration
# Generated on: $(date +'%Y-%m-%d %H:%M:%S')
# SECURITY WARNING: This file contains sensitive data. Protect accordingly.

# ===== DATABASE CONFIGURATION =====
DB_HOST=postgres
DB_PORT=5432
DB_NAME=lottodrop
DB_USER=lottodrop_user
DB_PASSWORD=${db_password}

# ===== REDIS CONFIGURATION =====
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${redis_password}
REDIS_DB=0

# ===== SECURITY SECRETS =====
# JWT Configuration
JWT_SECRET=${jwt_secret}
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRY=30d

# Session Configuration
SESSION_SECRET=${session_secret}
SESSION_EXPIRES_IN=86400000

# Password Hashing
BCRYPT_ROUNDS=12

# ===== ADMIN CONFIGURATION =====
ADMIN_EMAIL=admin@${domain}
ADMIN_PASSWORD=${admin_password}

# ===== APPLICATION CONFIGURATION =====
NODE_ENV=production
DOMAIN=${domain}

# URLs
FRONTEND_URL=${scheme}://${domain}
BACKEND_URL=${scheme}://${domain}
ADMIN_URL=${scheme}://${domain}/admin

# API URLs (for frontend builds)
VITE_API_URL=${scheme}://${domain}/api
VITE_SOCKET_URL=${scheme}://${domain}
REACT_APP_API_URL=${scheme}://${domain}

# Application Metadata
VITE_APP_NAME=LottoDrop
VITE_APP_VERSION=2.0.0

# ===== NETWORK CONFIGURATION =====
# Service Ports
BACKEND_PORT=3001
FRONTEND_PORT=80
ADMIN_PORT=81

# CORS Configuration
ALLOWED_ORIGINS=${scheme}://${domain},${scheme}://www.${domain}

# ===== RATE LIMITING =====
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===== FILE UPLOAD =====
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# ===== LOGGING =====
LOG_LEVEL=info
LOG_DIR=./logs

# ===== PERFORMANCE =====
MAX_POOL_SIZE=20
CONNECTION_TIMEOUT=30000

# ===== SECURITY HEADERS =====
CORS_ENABLED=true
HELMET_ENABLED=true

# ===== MONITORING =====
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true

# ===== EXTERNAL SERVICES =====
# Uncomment and configure as needed
# STRIPE_API_KEY=
# SENDGRID_API_KEY=
# SENTRY_DSN=
# CLOUDFLARE_API_TOKEN=

# ===== GAMING CONFIGURATION =====
# House Edge (percentage)
HOUSE_EDGE=2.5

# Minimum bet amounts (in cents)
MIN_BET_AMOUNT=100

# Maximum bet amounts (in cents)
MAX_BET_AMOUNT=100000

# VRF Configuration
VRF_ENABLED=true
VRF_SECRET_KEY=${jwt_secret}

# ===== COMPLIANCE =====
# Age verification
MINIMUM_AGE=18
AGE_VERIFICATION_REQUIRED=true

# Responsible gaming
SELF_EXCLUSION_ENABLED=true
LOSS_LIMITS_ENABLED=true
SESSION_LIMITS_ENABLED=true

# Audit logging
AUDIT_LOG_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=2555  # 7 years

EOF

    # Set secure permissions
    chmod 600 "$ENV_PRODUCTION_FILE"

    log_success "Production environment file created: $ENV_PRODUCTION_FILE"
    log_security "Environment file permissions set to 600 (owner read/write only)"

    return 0
}

# Backup existing environment
backup_existing_env() {
    if [[ -f "$ENV_FILE" ]]; then
        log_info "Backing up existing environment file..."
        cp "$ENV_FILE" "$ENV_BACKUP_FILE"
        chmod 600 "$ENV_BACKUP_FILE"
        log_success "Existing environment backed up to: $ENV_BACKUP_FILE"
    fi
}

# Validate environment file
validate_env_file() {
    local env_file="$1"

    log_info "Validating environment file..."

    # Check required variables
    local required_vars=("DB_PASSWORD" "JWT_SECRET" "SESSION_SECRET" "ADMIN_PASSWORD")
    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$env_file"; then
            missing_vars+=("$var")
        fi
    done

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        return 1
    fi

    # Check secret lengths
    local jwt_secret
    jwt_secret=$(grep "^JWT_SECRET=" "$env_file" | cut -d'=' -f2-)
    if [[ ${#jwt_secret} -lt 32 ]]; then
        log_error "JWT_SECRET is too short (minimum 32 characters)"
        return 1
    fi

    log_success "Environment file validation passed"
    return 0
}

# Setup SSL certificates
setup_ssl_certificates() {
    local domain="$1"

    log_info "Setting up SSL certificate configuration for: $domain"

    # Create nginx configuration directory
    mkdir -p "${SCRIPT_DIR}/nginx/ssl"

    # Create SSL setup script
    cat > "${SCRIPT_DIR}/setup-ssl.sh" << 'EOF'
#!/bin/bash

# SSL Certificate Setup Script
# Run this script after DNS is properly configured

set -e

DOMAIN="$1"
EMAIL="admin@$DOMAIN"

if [[ -z "$DOMAIN" ]]; then
    echo "Usage: $0 <domain>"
    exit 1
fi

echo "Setting up SSL certificates for: $DOMAIN"

# Install certbot if not available
if ! command -v certbot >/dev/null 2>&1; then
    echo "Installing certbot..."
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y certbot python3-certbot-nginx
    else
        echo "Please install certbot manually"
        exit 1
    fi
fi

# Obtain SSL certificate
sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive

echo "SSL certificate obtained successfully!"
echo "Certificates are automatically renewed by certbot."
EOF

    chmod +x "${SCRIPT_DIR}/setup-ssl.sh"

    log_success "SSL setup script created: ${SCRIPT_DIR}/setup-ssl.sh"
    log_info "Run './setup-ssl.sh $domain' after configuring DNS"
}

# Create production docker-compose override
create_production_override() {
    log_info "Creating production Docker Compose override..."

    cat > "${SCRIPT_DIR}/docker-compose.prod.yml" << 'EOF'
version: '3.8'

services:
  # Production PostgreSQL with performance tuning
  postgres:
    environment:
      # Performance tuning
      - POSTGRES_SHARED_PRELOAD_LIBRARIES=pg_stat_statements
      - POSTGRES_MAX_CONNECTIONS=200
      - POSTGRES_SHARED_BUFFERS=256MB
      - POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
      - POSTGRES_WORK_MEM=4MB
      - POSTGRES_MAINTENANCE_WORK_MEM=64MB
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/postgresql.conf:/etc/postgresql/postgresql.conf:ro
    command: postgres -c config_file=/etc/postgresql/postgresql.conf

  # Production Redis with persistence
  redis:
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD} --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf:ro

  # Production Backend with health checks
  backend:
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # Production Frontend with nginx
  frontend:
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Production Admin Panel
  frontend-admin:
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx Reverse Proxy (uncomment for production)
  # nginx:
  #   image: nginx:alpine
  #   container_name: lottodrop-nginx
  #   restart: unless-stopped
  #   ports:
  #     - "80:80"
  #     - "443:443"
  #   volumes:
  #     - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  #     - ./nginx/ssl:/etc/nginx/ssl:ro
  #     - /etc/letsencrypt:/etc/letsencrypt:ro
  #   depends_on:
  #     - backend
  #     - frontend
  #     - frontend-admin
  #   networks:
  #     - lottodrop-network

EOF

    log_success "Production Docker Compose override created"
}

# Create nginx configuration
create_nginx_config() {
    local domain="$1"

    log_info "Creating nginx configuration..."

    mkdir -p "${SCRIPT_DIR}/nginx"

    cat > "${SCRIPT_DIR}/nginx/nginx.conf" << EOF
# LottoDrop Production Nginx Configuration
# Optimized for gaming platform requirements

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging format
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # Performance optimizations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=auth:10m rate=5r/s;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";

    # Upstream backends
    upstream backend {
        server backend:3001;
        keepalive 32;
    }

    upstream frontend {
        server frontend:8080;
        keepalive 32;
    }

    upstream admin {
        server frontend-admin:80;
        keepalive 32;
    }

    # Main server block
    server {
        listen 80;
        server_name ${domain} www.${domain};

        # Redirect to HTTPS in production
        # return 301 https://\$server_name\$request_uri;

        # For development/testing without SSL
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }

        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }

        # Socket.IO endpoints
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        # Admin panel
        location /admin/ {
            auth_basic "Admin Area";
            auth_basic_user_file /etc/nginx/.htpasswd;
            proxy_pass http://admin/;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        # Health check endpoint
        location /health {
            access_log off;
            proxy_pass http://backend/health;
        }
    }

    # HTTPS server block (uncomment for production with SSL)
    # server {
    #     listen 443 ssl http2;
    #     server_name ${domain} www.${domain};
    #
    #     ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
    #     ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;
    #
    #     ssl_protocols TLSv1.2 TLSv1.3;
    #     ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    #     ssl_prefer_server_ciphers off;
    #     ssl_session_cache shared:SSL:10m;
    #     ssl_session_timeout 10m;
    #
    #     # Include location blocks from above
    # }
}
EOF

    log_success "Nginx configuration created"
}

# Create deployment scripts
create_deployment_scripts() {
    log_info "Creating deployment helper scripts..."

    # Create production deployment script
    cat > "${SCRIPT_DIR}/deploy-production.sh" << 'EOF'
#!/bin/bash

# LottoDrop Production Deployment Script
set -e

echo "Starting production deployment..."

# Load environment
if [[ -f .env ]]; then
    source .env
fi

# Build and deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo "Waiting for services to start..."
sleep 30

# Health check
if curl -f http://localhost:3001/health >/dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi

echo "✅ Production deployment completed successfully!"
EOF

    chmod +x "${SCRIPT_DIR}/deploy-production.sh"

    # Create environment switcher
    cat > "${SCRIPT_DIR}/switch-env.sh" << 'EOF'
#!/bin/bash

# Environment Switcher Script
set -e

ENV="${1:-production}"

case "$ENV" in
    "production")
        if [[ -f .env.production ]]; then
            cp .env.production .env
            echo "Switched to production environment"
        else
            echo "Error: .env.production not found"
            exit 1
        fi
        ;;
    "development")
        if [[ -f .env.development ]]; then
            cp .env.development .env
            echo "Switched to development environment"
        else
            echo "Error: .env.development not found"
            exit 1
        fi
        ;;
    *)
        echo "Usage: $0 [production|development]"
        exit 1
        ;;
esac
EOF

    chmod +x "${SCRIPT_DIR}/switch-env.sh"

    log_success "Deployment scripts created"
}

# Show security summary
show_security_summary() {
    local admin_password
    admin_password=$(grep "^ADMIN_PASSWORD=" "$ENV_PRODUCTION_FILE" | cut -d'=' -f2-)

    echo -e "\n${MAGENTA}========================================${NC}"
    echo -e "${MAGENTA}   SECURITY CONFIGURATION SUMMARY${NC}"
    echo -e "${MAGENTA}========================================${NC}"

    echo -e "\n${GREEN}✅ Secrets Generated:${NC}"
    echo "  • JWT Secret (64 chars)"
    echo "  • Database Password (32 chars)"
    echo "  • Redis Password (32 chars)"
    echo "  • Session Secret (32 chars)"
    echo "  • Admin Password (human-readable)"

    echo -e "\n${GREEN}✅ Security Features Enabled:${NC}"
    echo "  • BCrypt password hashing (12 rounds)"
    echo "  • Rate limiting configured"
    echo "  • CORS protection enabled"
    echo "  • Security headers configured"
    echo "  • File upload size limits"
    echo "  • Audit logging enabled"

    echo -e "\n${YELLOW}🔐 Admin Credentials:${NC}"
    echo "  Email: admin@$(grep "^DOMAIN=" "$ENV_PRODUCTION_FILE" | cut -d'=' -f2-)"
    echo "  Password: $admin_password"

    echo -e "\n${YELLOW}⚠️  Important Security Notes:${NC}"
    echo "  • Environment file permissions set to 600"
    echo "  • Backup your .env files securely"
    echo "  • Change admin password after first login"
    echo "  • Configure SSL certificates for production"
    echo "  • Set up monitoring and alerting"

    echo -e "\n${CYAN}📁 Files Created:${NC}"
    echo "  • $ENV_PRODUCTION_FILE"
    echo "  • ${SCRIPT_DIR}/docker-compose.prod.yml"
    echo "  • ${SCRIPT_DIR}/nginx/nginx.conf"
    echo "  • ${SCRIPT_DIR}/setup-ssl.sh"
    echo "  • ${SCRIPT_DIR}/deploy-production.sh"
    echo "  • ${SCRIPT_DIR}/switch-env.sh"

    if [[ -f "$ENV_BACKUP_FILE" ]]; then
        echo "  • $ENV_BACKUP_FILE (backup)"
    fi
}

# Main setup function
perform_setup() {
    local domain="${1:-localhost}"
    local use_ssl="${2:-false}"

    log_info "Starting production environment setup"
    log_info "Domain: $domain"
    log_info "SSL: $use_ssl"

    # System requirements check
    if ! check_system_requirements; then
        return 1
    fi

    # Validate domain
    if [[ "$domain" != "localhost" ]]; then
        if ! validate_domain "$domain"; then
            return 1
        fi
    fi

    # Backup existing environment
    backup_existing_env

    # Create production environment
    if ! create_production_env "$domain" "$use_ssl"; then
        return 1
    fi

    # Validate the created environment
    if ! validate_env_file "$ENV_PRODUCTION_FILE"; then
        return 1
    fi

    # Copy to active environment
    cp "$ENV_PRODUCTION_FILE" "$ENV_FILE"
    chmod 600 "$ENV_FILE"

    # Create production configurations
    create_production_override
    create_nginx_config "$domain"
    create_deployment_scripts

    # Setup SSL if requested
    if [[ "$use_ssl" == "true" ]]; then
        setup_ssl_certificates "$domain"
    fi

    log_success "Production environment setup completed successfully"
    return 0
}

# Show usage
show_usage() {
    echo -e "${BLUE}Usage:${NC}"
    echo "  $0 [domain] [--ssl]"
    echo "  $0 --help"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  $0                          # Setup for localhost"
    echo "  $0 example.com              # Setup for domain"
    echo "  $0 example.com --ssl        # Setup with SSL support"
    echo ""
    echo -e "${BLUE}Options:${NC}"
    echo "  --ssl                       Enable SSL certificate setup"
    echo "  --help                      Show this help message"
}

# Main execution
main() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}   LottoDrop Production Setup${NC}"
    echo -e "${CYAN}   $(date +'%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${CYAN}========================================${NC}"

    setup_logging
    acquire_lock

    # Parse command line arguments
    local domain="localhost"
    local use_ssl="false"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_usage
                exit 0
                ;;
            --ssl)
                use_ssl="true"
                shift
                ;;
            *)
                if [[ -z "$domain" || "$domain" == "localhost" ]]; then
                    domain="$1"
                fi
                shift
                ;;
        esac
    done

    log_info "Starting production setup process..."

    if perform_setup "$domain" "$use_ssl"; then
        show_security_summary
        echo -e "\n${GREEN}✅ Production environment setup completed successfully!${NC}"
        log_success "Setup process completed"

        echo -e "\n${YELLOW}Next Steps:${NC}"
        echo "1. Review and customize .env file if needed"
        echo "2. Configure DNS for your domain (if not localhost)"
        echo "3. Run SSL setup: ./setup-ssl.sh $domain (if using SSL)"
        echo "4. Deploy: ./deploy-production.sh"
        echo "5. Configure monitoring and backup systems"
    else
        echo -e "\n${RED}❌ Production setup failed!${NC}"
        log_error "Setup process failed"
        exit 1
    fi
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi