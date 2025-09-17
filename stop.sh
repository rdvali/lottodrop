#!/bin/bash

# LottoDrop Production-Grade Docker Services Shutdown Script
# Graceful shutdown with data integrity protection and cleanup procedures
# Author: Enterprise Solution Architect & Gaming Finance Backend
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
declare -r LOG_FILE="${LOG_DIR}/stop_$(date +%Y%m%d_%H%M%S).log"
declare -r PID_FILE="${SCRIPT_DIR}/.stop.pid"
declare -r LOCK_FILE="${SCRIPT_DIR}/.stop.lock"

# Shutdown configuration
declare -r GRACEFUL_TIMEOUT=30      # 30 seconds for graceful shutdown
declare -r FORCE_TIMEOUT=10         # 10 seconds before force kill
declare -r HEALTH_CHECK_INTERVAL=2  # 2 seconds between checks
declare -r MAX_WAIT_TIME=60         # Maximum wait time for complete shutdown

# Service shutdown order (reverse dependency order)
declare -ra SHUTDOWN_ORDER=("frontend-admin" "frontend" "backend" "redis" "postgres")
declare -ra CRITICAL_SERVICES=("postgres" "redis" "backend")

# Environment detection
NODE_ENV="${NODE_ENV:-development}"
IS_PRODUCTION=$([[ "$NODE_ENV" == "production" ]] && echo "true" || echo "false")

# Command line options
REMOVE_VOLUMES=false
REMOVE_ORPHANS=true
FULL_CLEANUP=false
FORCE_SHUTDOWN=false
BACKUP_BEFORE_STOP=false

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
    log_info "Cleaning up shutdown process..."

    [[ -f "$PID_FILE" ]] && rm -f "$PID_FILE"
    [[ -f "$LOCK_FILE" ]] && rm -f "$LOCK_FILE"

    if [[ $exit_code -ne 0 ]]; then
        log_error "Shutdown failed with exit code $exit_code"
        log_error "Check logs at: $LOG_FILE"
        echo -e "\n${RED}❌ Shutdown failed! Check logs for details.${NC}"
        echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
    fi

    exit $exit_code
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Lock mechanism to prevent concurrent shutdowns
acquire_lock() {
    if [[ -f "$LOCK_FILE" ]]; then
        local lock_pid
        lock_pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
        if [[ -n "$lock_pid" ]] && kill -0 "$lock_pid" 2>/dev/null; then
            log_error "Another shutdown process is already running (PID: $lock_pid)"
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

# Load environment variables
load_environment() {
    if [[ -f "${SCRIPT_DIR}/.env" ]]; then
        set -a
        # shellcheck source=/dev/null
        source "${SCRIPT_DIR}/.env"
        set +a
        log_info "Loaded environment variables from .env"
    else
        log_warn "No .env file found, using defaults"
    fi
}

# Check if services are running
check_services_status() {
    local dc="$1"

    log_info "Checking current service status..."

    local running_services=()
    local stopped_services=()

    for service in "${SHUTDOWN_ORDER[@]}"; do
        if $dc ps -q "$service" >/dev/null 2>&1; then
            local status
            status=$($dc ps --format "{{.Status}}" "$service" 2>/dev/null)
            if [[ "$status" == *"Up"* ]]; then
                running_services+=("$service")
            else
                stopped_services+=("$service")
            fi
        else
            stopped_services+=("$service")
        fi
    done

    if [[ ${#running_services[@]} -eq 0 ]]; then
        log_info "No services are currently running"
        return 1
    fi

    log_info "Running services: ${running_services[*]}"
    if [[ ${#stopped_services[@]} -gt 0 ]]; then
        log_info "Already stopped: ${stopped_services[*]}"
    fi

    return 0
}

# Create pre-shutdown backup for production
create_pre_shutdown_backup() {
    if [[ "$IS_PRODUCTION" == "true" && "$BACKUP_BEFORE_STOP" == "true" ]]; then
        log_info "Creating pre-shutdown backup for production..."
        local backup_script="${SCRIPT_DIR}/backup.sh"

        if [[ -x "$backup_script" ]]; then
            if "$backup_script" --quick; then
                log_success "Pre-shutdown backup completed"
            else
                log_warn "Pre-shutdown backup failed, continuing with shutdown"
            fi
        else
            log_warn "Backup script not found or not executable, skipping backup"
        fi
    fi
}

# Wait for service to stop
wait_for_service_stop() {
    local service="$1"
    local dc="$2"
    local timeout="$3"
    local start_time
    start_time=$(date +%s)

    log_info "Waiting for $service to stop gracefully..."

    while true; do
        # Check if container is still running
        if ! $dc ps -q "$service" >/dev/null 2>&1; then
            log_success "$service stopped successfully"
            return 0
        fi

        # Check if container is in stopping state
        local status
        status=$($dc ps --format "{{.Status}}" "$service" 2>/dev/null || echo "")
        if [[ "$status" != *"Up"* ]]; then
            log_success "$service is stopping"
            return 0
        fi

        local current_time
        current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [[ $elapsed -ge $timeout ]]; then
            log_warn "$service did not stop gracefully within ${timeout}s"
            return 1
        fi

        echo -n "."
        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Flush database connections for PostgreSQL
flush_database_connections() {
    local dc="$1"

    if $dc ps -q postgres >/dev/null 2>&1; then
        log_info "Flushing PostgreSQL connections..."

        # Terminate active connections
        $dc exec -T postgres psql -U "${DB_USER:-lottodrop_user}" -c "
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = '${DB_NAME:-lottodrop}'
              AND pid <> pg_backend_pid()
              AND state = 'active';
        " 2>/dev/null || log_warn "Could not flush all database connections"

        log_success "Database connections flushed"
    fi
}

# Graceful service shutdown
graceful_service_shutdown() {
    local service="$1"
    local dc="$2"

    log_info "Gracefully shutting down $service..."

    # Special handling for critical services
    case "$service" in
        "postgres")
            # Flush connections before stopping PostgreSQL
            flush_database_connections "$dc"
            ;;
        "redis")
            # Force Redis to save data before shutdown
            if $dc exec -T redis redis-cli ping >/dev/null 2>&1; then
                log_info "Triggering Redis data persistence..."
                $dc exec -T redis redis-cli bgsave >/dev/null 2>&1 || true
                sleep 2  # Give Redis time to save
            fi
            ;;
        "backend")
            # Give backend time to finish processing requests
            log_info "Allowing backend to finish processing requests..."
            sleep 3
            ;;
    esac

    # Send SIGTERM to allow graceful shutdown
    if ! $dc stop "$service" --timeout "$GRACEFUL_TIMEOUT"; then
        log_warn "Graceful shutdown timeout for $service, attempting force stop..."

        # Force stop if graceful shutdown fails
        if ! $dc kill "$service"; then
            log_error "Failed to force stop $service"
            return 1
        fi
    fi

    # Wait for service to actually stop
    if wait_for_service_stop "$service" "$dc" "$FORCE_TIMEOUT"; then
        log_success "$service shutdown completed"
        return 0
    else
        log_error "$service did not stop properly"
        return 1
    fi
}

# Perform full shutdown sequence
perform_shutdown_sequence() {
    local dc="$1"

    log_info "Starting graceful shutdown sequence..."

    local failed_shutdowns=()
    local successful_shutdowns=()

    # Shutdown services in reverse dependency order
    for service in "${SHUTDOWN_ORDER[@]}"; do
        # Check if service is running
        if ! $dc ps -q "$service" >/dev/null 2>&1; then
            log_info "$service is not running, skipping..."
            continue
        fi

        local status
        status=$($dc ps --format "{{.Status}}" "$service" 2>/dev/null)
        if [[ "$status" != *"Up"* ]]; then
            log_info "$service is already stopping, skipping..."
            continue
        fi

        # Attempt graceful shutdown
        if graceful_service_shutdown "$service" "$dc"; then
            successful_shutdowns+=("$service")
        else
            failed_shutdowns+=("$service")
        fi

        # Add delay between shutdowns for stability
        if [[ "$service" != "${SHUTDOWN_ORDER[-1]}" ]]; then
            log_info "Waiting before shutting down next service..."
            sleep 3
        fi
    done

    # Report results
    if [[ ${#failed_shutdowns[@]} -eq 0 ]]; then
        log_success "All services shut down gracefully"
        log_success "Successfully stopped: ${successful_shutdowns[*]}"
        return 0
    else
        log_error "Some services failed to shut down properly: ${failed_shutdowns[*]}"
        log_info "Successfully stopped: ${successful_shutdowns[*]}"
        return 1
    fi
}

# Force shutdown all services
force_shutdown_all() {
    local dc="$1"

    log_warn "Performing force shutdown of all services..."

    # Use docker-compose down with force
    if $dc down --timeout "$FORCE_TIMEOUT"; then
        log_success "Force shutdown completed"
    else
        log_error "Force shutdown failed, attempting direct Docker commands..."

        # Get all LottoDrop containers
        local containers
        containers=$(docker ps -q --filter "name=lottodrop" 2>/dev/null || echo "")

        if [[ -n "$containers" ]]; then
            log_info "Force stopping containers directly..."
            echo "$containers" | xargs docker stop --time "$FORCE_TIMEOUT" 2>/dev/null || true
            echo "$containers" | xargs docker kill 2>/dev/null || true
        fi
    fi
}

# Clean up resources
cleanup_resources() {
    local dc="$1"

    log_info "Cleaning up Docker resources..."

    # Remove orphaned containers
    if [[ "$REMOVE_ORPHANS" == "true" ]]; then
        log_info "Removing orphaned containers..."
        docker container prune -f >/dev/null 2>&1 || true
    fi

    # Remove volumes if requested
    if [[ "$REMOVE_VOLUMES" == "true" ]]; then
        log_warn "Removing data volumes..."
        $dc down -v >/dev/null 2>&1 || true
        log_success "Data volumes removed"
    fi

    # Full cleanup if requested
    if [[ "$FULL_CLEANUP" == "true" ]]; then
        log_warn "Performing full cleanup..."

        # Remove containers, networks, images, volumes
        $dc down -v --rmi all --remove-orphans >/dev/null 2>&1 || true

        # System-wide cleanup
        docker system prune -f >/dev/null 2>&1 || true

        log_success "Full cleanup completed"
    fi

    # Clean up unused networks
    docker network prune -f >/dev/null 2>&1 || true
}

# Verify complete shutdown
verify_shutdown() {
    local dc="$1"

    log_info "Verifying complete shutdown..."

    local still_running=()
    for service in "${SHUTDOWN_ORDER[@]}"; do
        if $dc ps -q "$service" >/dev/null 2>&1; then
            local status
            status=$($dc ps --format "{{.Status}}" "$service" 2>/dev/null)
            if [[ "$status" == *"Up"* ]]; then
                still_running+=("$service")
            fi
        fi
    done

    if [[ ${#still_running[@]} -eq 0 ]]; then
        log_success "All services have been shut down successfully"
        return 0
    else
        log_error "The following services are still running: ${still_running[*]}"
        return 1
    fi
}

# Show shutdown summary
show_shutdown_summary() {
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}   Shutdown Summary${NC}"
    echo -e "${CYAN}========================================${NC}"

    if [[ "$REMOVE_VOLUMES" == "true" ]]; then
        echo -e "${YELLOW}⚠️  Data volumes have been removed${NC}"
    else
        echo -e "${GREEN}✅ Data volumes preserved${NC}"
    fi

    if [[ "$FULL_CLEANUP" == "true" ]]; then
        echo -e "${YELLOW}⚠️  Full cleanup performed (images, networks, etc.)${NC}"
    fi

    echo -e "\n${BLUE}To restart services:${NC}"
    echo -e "  ${CYAN}./start.sh${NC}"

    if [[ "$IS_PRODUCTION" == "true" ]]; then
        echo -e "\n${YELLOW}Production Notes:${NC}"
        echo -e "  • All data has been preserved (unless --volumes used)"
        echo -e "  • Check logs before restart: ${LOG_FILE}"
        echo -e "  • Consider backup verification before restart"
    fi

    echo -e "\n${GREEN}Shutdown completed at: $(date +'%Y-%m-%d %H:%M:%S')${NC}"
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --volumes|-v)
                REMOVE_VOLUMES=true
                log_warn "Volume removal enabled"
                shift
                ;;
            --clean|-c)
                FULL_CLEANUP=true
                log_warn "Full cleanup enabled"
                shift
                ;;
            --force|-f)
                FORCE_SHUTDOWN=true
                log_warn "Force shutdown enabled"
                shift
                ;;
            --backup|-b)
                BACKUP_BEFORE_STOP=true
                log_info "Pre-shutdown backup enabled"
                shift
                ;;
            --no-orphans)
                REMOVE_ORPHANS=false
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Show usage information
show_usage() {
    echo -e "${BLUE}LottoDrop Services Shutdown Script${NC}"
    echo ""
    echo -e "${BLUE}Usage:${NC}"
    echo "  $0 [options]"
    echo ""
    echo -e "${BLUE}Options:${NC}"
    echo "  --volumes, -v     Remove data volumes (⚠️  DESTRUCTIVE)"
    echo "  --clean, -c       Perform full cleanup (⚠️  DESTRUCTIVE)"
    echo "  --force, -f       Force immediate shutdown"
    echo "  --backup, -b      Create backup before shutdown (production)"
    echo "  --no-orphans      Skip orphaned container cleanup"
    echo "  --help, -h        Show this help message"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  $0                # Graceful shutdown"
    echo "  $0 --backup       # Backup then shutdown"
    echo "  $0 --volumes      # Shutdown and remove all data"
    echo "  $0 --force        # Force immediate shutdown"
    echo ""
    echo -e "${YELLOW}⚠️  Warning:${NC} --volumes and --clean options will permanently delete data!"
}

# Production safety checks
production_safety_checks() {
    if [[ "$IS_PRODUCTION" == "true" ]]; then
        echo -e "${MAGENTA}========================================${NC}"
        echo -e "${MAGENTA}   PRODUCTION ENVIRONMENT DETECTED${NC}"
        echo -e "${MAGENTA}========================================${NC}"

        if [[ "$REMOVE_VOLUMES" == "true" || "$FULL_CLEANUP" == "true" ]]; then
            echo -e "\n${RED}⚠️  WARNING: Destructive operations requested in PRODUCTION!${NC}"
            echo ""
            echo -e "${YELLOW}This will permanently delete:${NC}"
            [[ "$REMOVE_VOLUMES" == "true" ]] && echo "  • All database data"
            [[ "$REMOVE_VOLUMES" == "true" ]] && echo "  • All Redis cache data"
            [[ "$REMOVE_VOLUMES" == "true" ]] && echo "  • All uploaded files"
            [[ "$FULL_CLEANUP" == "true" ]] && echo "  • All Docker images and networks"
            echo ""

            local confirm
            read -p "Type 'DELETE' to confirm you want to proceed: " confirm
            if [[ "$confirm" != "DELETE" ]]; then
                log_info "Destructive operation cancelled by user"
                exit 0
            fi

            # Additional confirmation for double safety
            read -p "Are you absolutely sure? Type 'YES' to continue: " confirm
            if [[ "$confirm" != "YES" ]]; then
                log_info "Destructive operation cancelled by user"
                exit 0
            fi

            echo ""
            log_security "Production destructive operation confirmed by user"
        fi
    fi
}

# Main shutdown function
perform_shutdown() {
    local dc
    dc=$(detect_docker_compose)

    log_info "Starting LottoDrop services shutdown using: $dc"
    log_info "Environment: $NODE_ENV"
    log_info "Production mode: $IS_PRODUCTION"

    # Load environment
    load_environment

    # Check current service status
    if ! check_services_status "$dc"; then
        log_info "No services to shut down"
        return 0
    fi

    # Production safety checks
    production_safety_checks

    # Create pre-shutdown backup if requested
    create_pre_shutdown_backup

    # Perform shutdown
    if [[ "$FORCE_SHUTDOWN" == "true" ]]; then
        force_shutdown_all "$dc"
    else
        if ! perform_shutdown_sequence "$dc"; then
            log_warn "Graceful shutdown had issues, but continuing..."
        fi
    fi

    # Clean up resources
    cleanup_resources "$dc"

    # Verify shutdown
    if verify_shutdown "$dc"; then
        log_success "Shutdown completed successfully"
        return 0
    else
        log_error "Shutdown verification failed"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}   LottoDrop Platform Shutdown${NC}"
    echo -e "${RED}   $(date +'%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${RED}========================================${NC}"

    setup_logging
    acquire_lock

    # Parse command line arguments
    parse_arguments "$@"

    log_info "Starting shutdown process..."

    local shutdown_start_time
    shutdown_start_time=$(date +%s)

    if perform_shutdown; then
        local shutdown_end_time
        shutdown_end_time=$(date +%s)
        local total_duration=$((shutdown_end_time - shutdown_start_time))

        show_shutdown_summary
        echo -e "\n${GREEN}✅ All services shut down successfully in ${total_duration}s!${NC}"
        log_success "Shutdown process completed successfully"
    else
        log_error "Shutdown process failed"
        echo -e "\n${RED}❌ Shutdown failed! Check logs for details.${NC}"
        exit 1
    fi
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi