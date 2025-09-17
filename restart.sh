#!/bin/bash

# LottoDrop Production-Grade Docker Restart Script
# Gracefully restarts all services with comprehensive health checks
# Author: Enterprise Solution Architect & Gaming Finance Backend
# Version: 2.0.0

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
declare -r RED='\033[0;31m'
declare -r GREEN='\033[0;32m'
declare -r YELLOW='\033[1;33m'
declare -r BLUE='\033[0;34m'
declare -r CYAN='\033[0;36m'
declare -r NC='\033[0m' # No Color

# Configuration
declare -r SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
declare -r LOG_DIR="${SCRIPT_DIR}/logs"
declare -r LOG_FILE="${LOG_DIR}/restart_$(date +%Y%m%d_%H%M%S).log"
declare -r PID_FILE="${SCRIPT_DIR}/.restart.pid"
declare -r LOCK_FILE="${SCRIPT_DIR}/.restart.lock"

# Timeouts and retries
declare -r HEALTH_CHECK_TIMEOUT=300  # 5 minutes
declare -r HEALTH_CHECK_INTERVAL=5   # 5 seconds
declare -r GRACEFUL_STOP_TIMEOUT=30  # 30 seconds
declare -r SERVICE_STARTUP_DELAY=10  # 10 seconds between service starts

# Expected services
declare -ra SERVICES=("postgres" "redis" "backend" "frontend" "frontend-admin")
declare -ra CRITICAL_SERVICES=("postgres" "redis" "backend")

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

# Cleanup function
cleanup() {
    local exit_code=$?
    log_info "Cleaning up..."
    [[ -f "$PID_FILE" ]] && rm -f "$PID_FILE"
    [[ -f "$LOCK_FILE" ]] && rm -f "$LOCK_FILE"

    if [[ $exit_code -ne 0 ]]; then
        log_error "Restart failed with exit code $exit_code"
        log_error "Check logs at: $LOG_FILE"
        echo -e "\n${RED}❌ Restart failed! Check logs for details.${NC}"
        echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
    fi

    exit $exit_code
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Lock mechanism to prevent concurrent restarts
acquire_lock() {
    if [[ -f "$LOCK_FILE" ]]; then
        local lock_pid
        lock_pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
        if [[ -n "$lock_pid" ]] && kill -0 "$lock_pid" 2>/dev/null; then
            log_error "Another restart process is already running (PID: $lock_pid)"
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

# Health check functions
check_docker_daemon() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        exit 1
    fi
}

check_service_health() {
    local service="$1"
    local dc="$2"

    case "$service" in
        "postgres")
            $dc exec -T postgres pg_isready -U "${DB_USER:-lottodrop_user}" -d "${DB_NAME:-lottodrop}" >/dev/null 2>&1
            ;;
        "redis")
            $dc exec -T redis redis-cli ping >/dev/null 2>&1
            ;;
        "backend")
            curl -f -s "http://localhost:${BACKEND_PORT:-3001}/health" >/dev/null 2>&1
            ;;
        "frontend")
            curl -f -s "http://localhost:${FRONTEND_PORT:-80}/health" >/dev/null 2>&1 || \
            curl -f -s "http://localhost:${FRONTEND_PORT:-80}/" >/dev/null 2>&1
            ;;
        "frontend-admin")
            curl -f -s "http://localhost:${ADMIN_PORT:-81}/health" >/dev/null 2>&1 || \
            curl -f -s "http://localhost:${ADMIN_PORT:-81}/" >/dev/null 2>&1
            ;;
        *)
            return 1
            ;;
    esac
}

wait_for_service_health() {
    local service="$1"
    local dc="$2"
    local timeout="$3"
    local start_time
    start_time=$(date +%s)

    log_info "Waiting for $service to become healthy..."

    while true; do
        if check_service_health "$service" "$dc"; then
            log_success "$service is healthy"
            return 0
        fi

        local current_time
        current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [[ $elapsed -ge $timeout ]]; then
            log_error "$service failed to become healthy within ${timeout}s"
            return 1
        fi

        echo -n "."
        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Pre-restart backup for production
create_pre_restart_backup() {
    if [[ "$IS_PRODUCTION" == "true" ]]; then
        log_info "Creating pre-restart backup..."
        local backup_script="${SCRIPT_DIR}/backup.sh"

        if [[ -x "$backup_script" ]]; then
            if "$backup_script" --quick; then
                log_success "Pre-restart backup completed"
            else
                log_warn "Pre-restart backup failed, continuing with restart"
            fi
        else
            log_warn "Backup script not found or not executable, skipping backup"
        fi
    fi
}

# Graceful service shutdown
graceful_stop_services() {
    local dc="$1"

    log_info "Initiating graceful shutdown of services..."

    # Stop in reverse dependency order
    local reverse_services=("frontend-admin" "frontend" "backend" "redis" "postgres")

    for service in "${reverse_services[@]}"; do
        if $dc ps --services | grep -q "^${service}$"; then
            log_info "Stopping $service..."

            # Send SIGTERM first
            $dc stop "$service" --timeout "$GRACEFUL_STOP_TIMEOUT" || {
                log_warn "Graceful stop timeout for $service, forcing stop..."
                $dc kill "$service"
            }

            log_success "$service stopped"
        fi
    done

    # Clean up any orphaned containers
    log_info "Cleaning up orphaned containers..."
    docker container prune -f >/dev/null 2>&1 || true
}

# Service startup with health checks
start_services_with_health_checks() {
    local dc="$1"

    log_info "Starting services with health checks..."

    # Start services in dependency order
    for service in "${SERVICES[@]}"; do
        log_info "Starting $service..."

        if ! $dc up -d "$service"; then
            log_error "Failed to start $service"
            return 1
        fi

        # Wait for critical services to be healthy before continuing
        if [[ " ${CRITICAL_SERVICES[*]} " =~ " ${service} " ]]; then
            if ! wait_for_service_health "$service" "$dc" "$HEALTH_CHECK_TIMEOUT"; then
                log_error "Critical service $service failed health check"
                return 1
            fi

            # Add delay between critical services
            # Get the last element of CRITICAL_SERVICES array (bash 3.2 compatible)
            local last_critical_service="${CRITICAL_SERVICES[$((${#CRITICAL_SERVICES[@]}-1))]}"
            if [[ "$service" != "$last_critical_service" ]]; then
                log_info "Waiting ${SERVICE_STARTUP_DELAY}s before starting next service..."
                sleep "$SERVICE_STARTUP_DELAY"
            fi
        fi
    done

    # Final health check for all services
    log_info "Performing final health checks..."
    local failed_services=()

    for service in "${SERVICES[@]}"; do
        if ! wait_for_service_health "$service" "$dc" 60; then
            failed_services+=("$service")
        fi
    done

    if [[ ${#failed_services[@]} -gt 0 ]]; then
        log_error "The following services failed health checks: ${failed_services[*]}"
        return 1
    fi

    log_success "All services are healthy"
    return 0
}

# Rollback function
perform_rollback() {
    local dc="$1"

    log_warn "Performing rollback due to restart failure..."

    # Stop all services
    $dc down --timeout "$GRACEFUL_STOP_TIMEOUT" || $dc kill

    # If we have a backup, suggest restoration
    if [[ "$IS_PRODUCTION" == "true" ]]; then
        log_warn "Consider restoring from the pre-restart backup if issues persist"
        log_warn "Use: ./restore.sh <backup_timestamp>"
    fi

    return 1
}

# Main restart function
perform_restart() {
    local dc
    dc=$(detect_docker_compose)

    log_info "Starting LottoDrop services restart using: $dc"
    log_info "Environment: $NODE_ENV"
    log_info "Production mode: $IS_PRODUCTION"

    # Pre-restart checks
    check_docker_daemon

    # Load environment variables
    if [[ -f "${SCRIPT_DIR}/.env" ]]; then
        set -a
        # shellcheck source=/dev/null
        source "${SCRIPT_DIR}/.env"
        set +a
        log_info "Loaded environment variables from .env"
    fi

    # Create pre-restart backup
    create_pre_restart_backup

    # Graceful shutdown
    graceful_stop_services "$dc"

    # Small delay to ensure complete shutdown
    log_info "Waiting for complete shutdown..."
    sleep 5

    # Start services with health checks
    if start_services_with_health_checks "$dc"; then
        log_success "All services restarted successfully"
        return 0
    else
        log_error "Service restart failed"
        if [[ "$IS_PRODUCTION" == "true" ]]; then
            perform_rollback "$dc"
        fi
        return 1
    fi
}

# Display service status
show_final_status() {
    local dc
    dc=$(detect_docker_compose)

    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}   Final Service Status${NC}"
    echo -e "${CYAN}========================================${NC}"

    $dc ps

    echo -e "\n${GREEN}Access URLs:${NC}"
    echo -e "  Frontend:     http://localhost:${FRONTEND_PORT:-80}"
    echo -e "  Admin Panel:  http://localhost:${ADMIN_PORT:-81}"
    echo -e "  Backend API:  http://localhost:${BACKEND_PORT:-3001}"
    echo -e "  Health Check: http://localhost:${BACKEND_PORT:-3001}/health"

    echo -e "\n${YELLOW}Log file: $LOG_FILE${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   LottoDrop Production Restart${NC}"
    echo -e "${BLUE}   $(date +'%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${BLUE}========================================${NC}"

    setup_logging
    acquire_lock

    log_info "Starting restart process..."

    if perform_restart; then
        show_final_status
        log_success "Restart completed successfully"
        echo -e "\n${GREEN}✅ All services restarted successfully!${NC}"
    else
        log_error "Restart failed"
        echo -e "\n${RED}❌ Restart failed! Check logs for details.${NC}"
        exit 1
    fi
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi