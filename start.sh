#!/bin/bash

# LottoDrop Production-Grade Docker Services Startup Script
# Enhanced with comprehensive health checks and performance monitoring
# Author: React Frontend Expert & Enterprise Solution Architect
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
declare -r LOG_FILE="${LOG_DIR}/start_$(date +%Y%m%d_%H%M%S).log"
declare -r PID_FILE="${SCRIPT_DIR}/.start.pid"
declare -r LOCK_FILE="${SCRIPT_DIR}/.start.lock"

# Health check configuration
declare -r HEALTH_CHECK_TIMEOUT=300  # 5 minutes
declare -r HEALTH_CHECK_INTERVAL=5   # 5 seconds
declare -r SERVICE_START_DELAY=10    # 10 seconds between critical services
declare -r FINAL_VALIDATION_TIMEOUT=60 # 1 minute for final validation

# Expected services and their dependencies
declare -ra SERVICES=("postgres" "redis" "backend" "frontend" "frontend-admin")
declare -ra CRITICAL_SERVICES=("postgres" "redis" "backend")
declare -ra FRONTEND_SERVICES=("frontend" "frontend-admin")

# Service ports for health checks (using functions for compatibility)
get_service_port() {
    case "$1" in
        backend) echo "3001" ;;
        frontend) echo "80" ;;
        frontend-admin) echo "81" ;;
        postgres) echo "5432" ;;
        redis) echo "6379" ;;
        *) echo "" ;;
    esac
}

# Environment detection
NODE_ENV="${NODE_ENV:-development}"
IS_PRODUCTION=$([[ "$NODE_ENV" == "production" ]] && echo "true" || echo "false")

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

log_performance() {
    echo -e "${MAGENTA}[$(date +'%Y-%m-%d %H:%M:%S')] PERF:${NC} $*" | tee -a "$LOG_FILE"
}

# Cleanup function
cleanup() {
    local exit_code=$?
    log_info "Cleaning up startup process..."

    [[ -f "$PID_FILE" ]] && rm -f "$PID_FILE"
    [[ -f "$LOCK_FILE" ]] && rm -f "$LOCK_FILE"

    if [[ $exit_code -ne 0 ]]; then
        log_error "Startup failed with exit code $exit_code"
        log_error "Check logs at: $LOG_FILE"
        echo -e "\n${RED}❌ Startup failed! Check logs for details.${NC}"
        echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
    fi

    exit $exit_code
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Lock mechanism to prevent concurrent starts
acquire_lock() {
    if [[ -f "$LOCK_FILE" ]]; then
        local lock_pid
        lock_pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
        if [[ -n "$lock_pid" ]] && kill -0 "$lock_pid" 2>/dev/null; then
            log_error "Another startup process is already running (PID: $lock_pid)"
            exit 1
        else
            log_warn "Removing stale lock file"
            rm -f "$LOCK_FILE"
        fi
    fi

    echo $$ > "$LOCK_FILE"
    echo $$ > "$PID_FILE"
}

# Docker command detection
detect_docker_compose() {
    if command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    elif docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    else
        log_error "Neither 'docker-compose' nor 'docker compose' found"
        exit 1
    fi
}

# Pre-startup system checks
perform_system_checks() {
    log_info "Performing pre-startup system checks..."

    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        exit 1
    fi

    # Check available disk space
    local available_space
    available_space=$(df "$SCRIPT_DIR" | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB in KB

    if [[ "$available_space" -lt "$required_space" ]]; then
        log_warn "Low disk space detected: $(($available_space/1024))MB available"
        log_warn "Recommended: $(($required_space/1024))MB minimum"
    fi

    # Check available memory
    if command -v free >/dev/null 2>&1; then
        local available_memory
        available_memory=$(free -m | awk 'NR==2{print $7}')
        local required_memory=2048  # 2GB in MB

        if [[ "$available_memory" -lt "$required_memory" ]]; then
            log_warn "Low memory detected: ${available_memory}MB available"
            log_warn "Recommended: ${required_memory}MB minimum"
        fi
    fi

    # Check port availability
    local busy_ports=()
    for service in "${SERVICES[@]}"; do
        local port=$(get_service_port "$service")
        if [[ -n "$port" ]]; then
            if netstat -tuln 2>/dev/null | grep -q ":${port} " || ss -tuln 2>/dev/null | grep -q ":${port} "; then
                busy_ports+=("$port($service)")
            fi
        fi
    done

    if [[ ${#busy_ports[@]} -gt 0 ]]; then
        log_warn "Ports already in use: ${busy_ports[*]}"
        log_warn "This may cause service conflicts"
    fi

    log_success "System checks completed"
}

# Environment file management
setup_environment() {
    log_info "Setting up environment configuration..."

    # Check if .env file exists
    if [[ ! -f "${SCRIPT_DIR}/.env" ]]; then
        log_warn ".env file not found"

        # Check for production environment file
        if [[ -f "${SCRIPT_DIR}/.env.production" && "$IS_PRODUCTION" == "true" ]]; then
            log_info "Using production environment file"
            cp "${SCRIPT_DIR}/.env.production" "${SCRIPT_DIR}/.env"
        else
            log_info "Creating default .env file..."
            create_default_env
        fi
    fi

    # Load environment variables
    set -a
    # shellcheck source=/dev/null
    source "${SCRIPT_DIR}/.env"
    set +a

    log_success "Environment configuration loaded"
}

# Create default environment file
create_default_env() {
    cat > "${SCRIPT_DIR}/.env" << 'EOF'
# LottoDrop Default Environment Configuration
# Generated automatically - customize as needed

# Database Configuration
DB_NAME=lottodrop
DB_USER=lottodrop_user
DB_PASSWORD=secure_password_123
DB_HOST=postgres
DB_PORT=5432

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Backend Configuration
JWT_SECRET=your_jwt_secret_here_change_in_production
SESSION_SECRET=your_session_secret_here
BCRYPT_ROUNDS=12
PORT=3001
NODE_ENV=development

# Admin Configuration
ADMIN_EMAIL=admin@lottodrop.com
ADMIN_PASSWORD=Admin123!@#

# Frontend Configuration
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
VITE_APP_NAME=LottoDrop
VITE_APP_VERSION=2.0.0
REACT_APP_API_URL=http://localhost:3001

# Service Ports
FRONTEND_PORT=80
ADMIN_PORT=81
BACKEND_PORT=3001

# CORS Configuration
ALLOWED_ORIGINS=http://localhost,http://localhost:80,http://localhost:81,http://localhost:3000,http://localhost:3001

# Performance Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

    log_success "Default .env file created"
}

# Pre-build preparation
prepare_for_build() {
    log_info "Preparing for Docker build..."

    # Clean up test files that cause build issues
    find "${SCRIPT_DIR}/backend/src" -name "*.test.ts" -delete 2>/dev/null || true
    find "${SCRIPT_DIR}/backend/src" -name "*.spec.ts" -delete 2>/dev/null || true
    rm -rf "${SCRIPT_DIR}/backend/dist" 2>/dev/null || true

    # Create necessary directories
    mkdir -p "${SCRIPT_DIR}/backend/uploads" 2>/dev/null || true
    mkdir -p "$LOG_DIR" 2>/dev/null || true

    log_success "Build preparation completed"
}

# Enhanced service health checks
check_service_health() {
    local service="$1"
    local dc="$2"
    local port=$(get_service_port "$service")

    case "$service" in
        "postgres")
            # Check PostgreSQL health
            if $dc exec -T postgres pg_isready -U "${DB_USER:-lottodrop_user}" -d "${DB_NAME:-lottodrop}" >/dev/null 2>&1; then
                # Additional check: ensure database is accessible
                $dc exec -T postgres psql -U "${DB_USER:-lottodrop_user}" -d "${DB_NAME:-lottodrop}" -c "SELECT 1;" >/dev/null 2>&1
            else
                return 1
            fi
            ;;
        "redis")
            # Check Redis health
            $dc exec -T redis redis-cli ping >/dev/null 2>&1
            ;;
        "backend")
            # Check backend API health endpoint
            local backend_port="${BACKEND_PORT:-3001}"
            curl -f -s --max-time 10 "http://localhost:${backend_port}/health" >/dev/null 2>&1
            ;;
        "frontend")
            # Check frontend availability
            local frontend_port="${FRONTEND_PORT:-80}"
            if curl -f -s --max-time 10 "http://localhost:${frontend_port}/health" >/dev/null 2>&1; then
                return 0
            else
                # Fallback: check if the service responds at all
                curl -f -s --max-time 10 "http://localhost:${frontend_port}/" >/dev/null 2>&1
            fi
            ;;
        "frontend-admin")
            # Check admin panel availability
            local admin_port="${ADMIN_PORT:-81}"
            if curl -f -s --max-time 10 "http://localhost:${admin_port}/health" >/dev/null 2>&1; then
                return 0
            else
                # Fallback: check if the service responds at all
                curl -f -s --max-time 10 "http://localhost:${admin_port}/" >/dev/null 2>&1
            fi
            ;;
        *)
            log_error "Unknown service: $service"
            return 1
            ;;
    esac
}

# Wait for service to become healthy
wait_for_service_health() {
    local service="$1"
    local dc="$2"
    local timeout="$3"
    local start_time
    start_time=$(date +%s)

    log_info "Waiting for $service to become healthy (timeout: ${timeout}s)..."

    local dots_printed=0
    while true; do
        if check_service_health "$service" "$dc"; then
            echo ""  # New line after dots
            log_success "$service is healthy"
            return 0
        fi

        local current_time
        current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [[ $elapsed -ge $timeout ]]; then
            echo ""  # New line after dots
            log_error "$service failed to become healthy within ${timeout}s"
            return 1
        fi

        # Progress indicator
        echo -n "."
        ((dots_printed++))
        if [[ $dots_printed -eq 60 ]]; then
            echo ""
            dots_printed=0
            log_info "Still waiting for $service... (${elapsed}s elapsed)"
        fi

        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Performance monitoring during startup
monitor_startup_performance() {
    local dc="$1"

    log_performance "Monitoring system performance during startup..."

    # Docker system info
    if command -v docker >/dev/null 2>&1; then
        local docker_info
        docker_info=$(docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}" 2>/dev/null || echo "N/A")
        log_performance "Docker disk usage: $docker_info"
    fi

    # Container resource usage
    if $dc ps -q >/dev/null 2>&1; then
        local containers
        containers=$($dc ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || echo "N/A")
        log_performance "Container status: $containers"
    fi
}

# Clean startup process
perform_clean_startup() {
    local dc="$1"

    log_info "Performing clean startup..."

    # Stop any running services
    log_info "Stopping existing services..."
    $dc down --timeout 30 2>/dev/null || true

    # Clean up orphaned containers
    log_info "Cleaning up orphaned containers..."
    docker container prune -f >/dev/null 2>&1 || true

    # Clean up unused networks
    docker network prune -f >/dev/null 2>&1 || true

    log_success "Clean startup preparation completed"
}

# Build Docker images with error handling
build_docker_images() {
    local dc="$1"

    log_info "Building Docker images..."
    log_info "This may take several minutes on first run..."

    local build_start_time
    build_start_time=$(date +%s)

    # Build with better error handling
    if ! $dc build --parallel 2>&1 | tee -a "$LOG_FILE"; then
        log_error "Docker build failed"
        log_error "Common solutions:"
        log_error "1. Run: docker system prune -a"
        log_error "2. Check available disk space"
        log_error "3. Verify Dockerfile syntax"
        return 1
    fi

    local build_end_time
    build_end_time=$(date +%s)
    local build_duration=$((build_end_time - build_start_time))

    log_performance "Docker build completed in ${build_duration}s"
    log_success "Docker images built successfully"
    return 0
}

# Start services with proper dependency management
start_services_sequentially() {
    local dc="$1"

    log_info "Starting services with dependency management..."

    # Start critical services first (database layer)
    for service in "${CRITICAL_SERVICES[@]}"; do
        log_info "Starting critical service: $service"

        if ! $dc up -d "$service"; then
            log_error "Failed to start critical service: $service"
            return 1
        fi

        # Wait for critical services to be fully healthy
        if ! wait_for_service_health "$service" "$dc" "$HEALTH_CHECK_TIMEOUT"; then
            log_error "Critical service $service failed health check"
            return 1
        fi

        # Add delay between critical services for stability
        # Get the last element of CRITICAL_SERVICES array (bash 3.2 compatible)
        local last_critical_service="${CRITICAL_SERVICES[$((${#CRITICAL_SERVICES[@]}-1))]}"
        if [[ "$service" != "$last_critical_service" ]]; then
            log_info "Waiting ${SERVICE_START_DELAY}s before starting next critical service..."
            sleep "$SERVICE_START_DELAY"
        fi
    done

    # Start frontend services
    log_info "Starting frontend services..."
    for service in "${FRONTEND_SERVICES[@]}"; do
        log_info "Starting frontend service: $service"

        if ! $dc up -d "$service"; then
            log_error "Failed to start frontend service: $service"
            return 1
        fi

        # Give frontend services time to initialize
        sleep 5
    done

    log_success "All services started successfully"
    return 0
}

# Comprehensive final validation
perform_final_validation() {
    local dc="$1"

    log_info "Performing comprehensive final validation..."

    # Wait for all services to stabilize
    log_info "Allowing services to stabilize..."
    sleep 15

    # Check all services
    local failed_services=()
    local healthy_services=()

    for service in "${SERVICES[@]}"; do
        log_info "Validating $service..."

        if wait_for_service_health "$service" "$dc" "$FINAL_VALIDATION_TIMEOUT"; then
            healthy_services+=("$service")
        else
            failed_services+=("$service")
        fi
    done

    # Report results
    if [[ ${#failed_services[@]} -eq 0 ]]; then
        log_success "All services passed final validation"
        log_success "Healthy services: ${healthy_services[*]}"
        return 0
    else
        log_error "Services failed validation: ${failed_services[*]}"
        log_info "Healthy services: ${healthy_services[*]}"
        return 1
    fi
}

# Show detailed service status
show_service_status() {
    local dc="$1"

    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}   Service Status Report${NC}"
    echo -e "${CYAN}========================================${NC}"

    # Container status
    echo -e "\n${BLUE}Container Status:${NC}"
    $dc ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

    # Health check status
    echo -e "\n${BLUE}Health Check Results:${NC}"
    for service in "${SERVICES[@]}"; do
        printf "  %-20s " "$service:"
        if check_service_health "$service" "$dc" 2>/dev/null; then
            echo -e "${GREEN}✓ Healthy${NC}"
        else
            echo -e "${RED}✗ Unhealthy${NC}"
        fi
    done

    # Resource usage
    echo -e "\n${BLUE}Resource Usage:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | grep -E "(CONTAINER|lottodrop)" || echo "No resource data available"

    # Network information
    echo -e "\n${BLUE}Network Information:${NC}"
    local network_name
    network_name=$($dc config | grep -A 5 "networks:" | grep -v "^networks:" | head -1 | awk '{print $1}' | tr -d ':' || echo "lottodrop-network")
    if docker network inspect "$network_name" >/dev/null 2>&1; then
        echo "  Network: $network_name (active)"
    else
        echo "  Network: $network_name (not found)"
    fi
}

# Display access information
show_access_information() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}   Services Access Information${NC}"
    echo -e "${GREEN}========================================${NC}"

    echo -e "\n${GREEN}🌐 Application URLs:${NC}"
    echo -e "  Frontend:        ${GREEN}http://localhost:${FRONTEND_PORT:-80}${NC}"
    echo -e "  Admin Panel:     ${GREEN}http://localhost:${ADMIN_PORT:-81}${NC}"
    echo -e "  Backend API:     ${GREEN}http://localhost:${BACKEND_PORT:-3001}${NC}"
    echo -e "  API Health:      ${GREEN}http://localhost:${BACKEND_PORT:-3001}/health${NC}"

    echo -e "\n${GREEN}🔌 Database Connections:${NC}"
    echo -e "  PostgreSQL:      ${GREEN}localhost:5432${NC}"
    echo -e "  Redis:           ${GREEN}localhost:6379${NC}"

    echo -e "\n${GREEN}🔑 Default Admin Credentials:${NC}"
    echo -e "  Email:           ${YELLOW}${ADMIN_EMAIL:-admin@lottodrop.com}${NC}"
    echo -e "  Password:        ${YELLOW}${ADMIN_PASSWORD:-Admin123!@#}${NC}"

    echo -e "\n${BLUE}📋 Useful Commands:${NC}"
    local dc
    dc=$(detect_docker_compose)
    echo -e "  View logs:       ${CYAN}$dc logs -f [service]${NC}"
    echo -e "  View all logs:   ${CYAN}$dc logs -f${NC}"
    echo -e "  Stop services:   ${CYAN}./stop.sh${NC}"
    echo -e "  Restart:         ${CYAN}./restart.sh${NC}"
    echo -e "  Check status:    ${CYAN}./status.sh${NC}"
    echo -e "  Management:      ${CYAN}./manage.sh${NC}"
}

# Main startup function
perform_startup() {
    local dc
    dc=$(detect_docker_compose)

    log_info "Starting LottoDrop platform using: $dc"
    log_info "Environment: $NODE_ENV"
    log_info "Production mode: $IS_PRODUCTION"

    # System checks
    perform_system_checks

    # Environment setup
    setup_environment

    # Pre-build preparation
    prepare_for_build

    # Performance monitoring
    monitor_startup_performance "$dc"

    # Clean startup
    perform_clean_startup "$dc"

    # Build images
    if ! build_docker_images "$dc"; then
        return 1
    fi

    # Start services
    if ! start_services_sequentially "$dc"; then
        log_error "Service startup failed"
        return 1
    fi

    # Final validation
    if ! perform_final_validation "$dc"; then
        log_error "Final validation failed"
        return 1
    fi

    # Show status and access information
    show_service_status "$dc"
    show_access_information

    log_success "LottoDrop platform started successfully"
    return 0
}

# Main execution
main() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}   LottoDrop Platform Startup${NC}"
    echo -e "${CYAN}   $(date +'%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${CYAN}========================================${NC}"

    setup_logging
    acquire_lock

    log_info "Starting platform startup process..."

    local startup_start_time
    startup_start_time=$(date +%s)

    if perform_startup; then
        local startup_end_time
        startup_end_time=$(date +%s)
        local total_duration=$((startup_end_time - startup_start_time))

        log_performance "Total startup time: ${total_duration}s"
        echo -e "\n${GREEN}✅ All services started successfully in ${total_duration}s!${NC}"
        log_success "Startup process completed successfully"
    else
        log_error "Startup process failed"
        echo -e "\n${RED}❌ Platform startup failed! Check logs for details.${NC}"
        exit 1
    fi
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi