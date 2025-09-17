#!/bin/bash

# LottoDrop Production-Grade Database Restoration Script
# Safely restores database backups with atomic operations and rollback capability
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
declare -r LOG_FILE="${LOG_DIR}/restore_$(date +%Y%m%d_%H%M%S).log"
declare -r LOCK_FILE="${SCRIPT_DIR}/.restore.lock"

# Backup directories
declare -r BACKUP_DIR="${BACKUP_DIR:-/var/backups/lottodrop}"
declare -r LOCAL_BACKUP_DIR="${SCRIPT_DIR}/backups"

# Timeouts and validation
declare -r RESTORATION_TIMEOUT=1800  # 30 minutes
declare -r DB_VALIDATION_TIMEOUT=300 # 5 minutes
declare -r SERVICE_STOP_TIMEOUT=60   # 1 minute

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
    log_info "Cleaning up restoration process..."

    [[ -f "$LOCK_FILE" ]] && rm -f "$LOCK_FILE"

    if [[ $exit_code -ne 0 ]]; then
        log_error "Restoration failed with exit code $exit_code"
        log_error "Check logs at: $LOG_FILE"
        echo -e "\n${RED}❌ Restoration failed! Check logs for details.${NC}"
        echo -e "${YELLOW}Log file: $LOG_FILE${NC}"

        # Suggest rollback if in production
        if [[ "$IS_PRODUCTION" == "true" ]]; then
            echo -e "${MAGENTA}Consider rolling back to the pre-restoration backup${NC}"
        fi
    fi

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
            log_error "Another restoration process is already running (PID: $lock_pid)"
            exit 1
        else
            log_warn "Removing stale lock file"
            rm -f "$LOCK_FILE"
        fi
    fi

    echo $$ > "$LOCK_FILE"
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

    # Set defaults
    DB_NAME="${DB_NAME:-lottodrop}"
    DB_USER="${DB_USER:-lottodrop_user}"
    DB_PASSWORD="${DB_PASSWORD:-secure_password_123}"
}

# Find available backups
find_available_backups() {
    local backup_dirs=("$BACKUP_DIR" "$LOCAL_BACKUP_DIR")
    local found_backups=()

    for dir in "${backup_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            while IFS= read -r -d '' backup; do
                found_backups+=("$backup")
            done < <(find "$dir" -name "*.sql" -o -name "*.sql.gz" -print0 2>/dev/null | sort -z)
        fi
    done

    printf '%s\n' "${found_backups[@]}"
}

# Display backup information
show_backup_info() {
    local backup_file="$1"

    echo -e "\n${CYAN}Backup Information:${NC}"
    echo -e "  File: $(basename "$backup_file")"
    echo -e "  Path: $backup_file"
    echo -e "  Size: $(du -h "$backup_file" 2>/dev/null | cut -f1 || echo "Unknown")"
    echo -e "  Date: $(stat -c %y "$backup_file" 2>/dev/null | cut -d'.' -f1 || echo "Unknown")"

    # Check if compressed
    if [[ "$backup_file" == *.gz ]]; then
        echo -e "  Type: Compressed (gzip)"
        local uncompressed_size
        uncompressed_size=$(gzip -l "$backup_file" 2>/dev/null | tail -1 | awk '{print $2}' || echo "0")
        if [[ "$uncompressed_size" -gt 0 ]]; then
            echo -e "  Uncompressed: $(numfmt --to=iec "$uncompressed_size" 2>/dev/null || echo "Unknown")"
        fi
    else
        echo -e "  Type: Uncompressed"
    fi
}

# Validate backup file
validate_backup_file() {
    local backup_file="$1"

    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file does not exist: $backup_file"
        return 1
    fi

    if [[ ! -r "$backup_file" ]]; then
        log_error "Cannot read backup file: $backup_file"
        return 1
    fi

    # Check if file is not empty
    if [[ ! -s "$backup_file" ]]; then
        log_error "Backup file is empty: $backup_file"
        return 1
    fi

    # Validate compressed files
    if [[ "$backup_file" == *.gz ]]; then
        if ! gzip -t "$backup_file" 2>/dev/null; then
            log_error "Corrupted gzip backup file: $backup_file"
            return 1
        fi
    fi

    # Basic SQL validation for non-compressed files
    if [[ "$backup_file" == *.sql ]]; then
        if ! head -n 10 "$backup_file" | grep -qi "postgresql\|create\|insert\|--"; then
            log_error "File does not appear to be a valid SQL backup: $backup_file"
            return 1
        fi
    fi

    log_success "Backup file validation passed"
    return 0
}

# Create pre-restoration backup
create_pre_restoration_backup() {
    local dc="$1"
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${LOCAL_BACKUP_DIR}/pre_restore_backup_${timestamp}.sql.gz"

    log_info "Creating pre-restoration backup..."
    mkdir -p "$LOCAL_BACKUP_DIR"

    # Check if database exists and has data
    local table_count
    table_count=$($dc exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")

    if [[ "$table_count" -gt 0 ]]; then
        if $dc exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --verbose 2>/dev/null | gzip > "$backup_file"; then
            log_success "Pre-restoration backup created: $backup_file"
            echo "$backup_file"
        else
            log_error "Failed to create pre-restoration backup"
            return 1
        fi
    else
        log_info "Database is empty, skipping pre-restoration backup"
        echo ""
    fi
}

# Stop services gracefully
stop_services() {
    local dc="$1"

    log_info "Stopping services for restoration..."

    # Stop non-database services first
    local services_to_stop=("frontend-admin" "frontend" "backend")

    for service in "${services_to_stop[@]}"; do
        if $dc ps --services | grep -q "^${service}$"; then
            log_info "Stopping $service..."
            $dc stop "$service" --timeout "$SERVICE_STOP_TIMEOUT" || {
                log_warn "Force stopping $service..."
                $dc kill "$service"
            }
        fi
    done

    log_success "Services stopped successfully"
}

# Start services after restoration
start_services() {
    local dc="$1"

    log_info "Starting services after restoration..."

    # Start services in dependency order
    local services_to_start=("backend" "frontend" "frontend-admin")

    for service in "${services_to_start[@]}"; do
        log_info "Starting $service..."
        if ! $dc up -d "$service"; then
            log_error "Failed to start $service"
            return 1
        fi

        # Give time for service to initialize
        sleep 5
    done

    log_success "Services started successfully"
}

# Perform atomic database restoration
restore_database_atomic() {
    local dc="$1"
    local backup_file="$2"
    local restore_db_name="${DB_NAME}_restore_$(date +%s)"
    local original_db_name="$DB_NAME"
    local backup_db_name="${DB_NAME}_backup_$(date +%s)"

    log_info "Starting atomic database restoration..."
    log_info "Restore database: $restore_db_name"
    log_info "Original database: $original_db_name"

    # Step 1: Create restoration database
    log_info "Creating restoration database..."
    if ! $dc exec -T postgres psql -U "$DB_USER" -c "CREATE DATABASE \"$restore_db_name\";" 2>/dev/null; then
        log_error "Failed to create restoration database"
        return 1
    fi

    # Step 2: Restore backup to new database
    log_info "Restoring backup to new database..."
    local restore_cmd
    if [[ "$backup_file" == *.gz ]]; then
        restore_cmd="gunzip -c \"$backup_file\" | $dc exec -T postgres psql -U \"$DB_USER\" -d \"$restore_db_name\""
    else
        restore_cmd="$dc exec -T postgres psql -U \"$DB_USER\" -d \"$restore_db_name\" < \"$backup_file\""
    fi

    if ! eval "$restore_cmd"; then
        log_error "Failed to restore backup to new database"
        $dc exec -T postgres psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS \"$restore_db_name\";" 2>/dev/null || true
        return 1
    fi

    # Step 3: Validate restored database
    log_info "Validating restored database..."
    local table_count
    table_count=$($dc exec -T postgres psql -U "$DB_USER" -d "$restore_db_name" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")

    if [[ "$table_count" -eq 0 ]]; then
        log_error "Restored database has no tables"
        $dc exec -T postgres psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS \"$restore_db_name\";" 2>/dev/null || true
        return 1
    fi

    log_success "Database restoration validated ($table_count tables found)"

    # Step 4: Atomic swap
    log_info "Performing atomic database swap..."

    # Terminate connections to original database
    $dc exec -T postgres psql -U "$DB_USER" -c "
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '$original_db_name' AND pid <> pg_backend_pid();
    " 2>/dev/null || true

    # Rename databases atomically
    if ! $dc exec -T postgres psql -U "$DB_USER" -c "
        ALTER DATABASE \"$original_db_name\" RENAME TO \"$backup_db_name\";
        ALTER DATABASE \"$restore_db_name\" RENAME TO \"$original_db_name\";
    " 2>/dev/null; then
        log_error "Failed to perform atomic database swap"

        # Try to restore original name
        $dc exec -T postgres psql -U "$DB_USER" -c "
            ALTER DATABASE \"$backup_db_name\" RENAME TO \"$original_db_name\";
        " 2>/dev/null || true

        return 1
    fi

    log_success "Atomic database swap completed successfully"
    log_info "Original database backed up as: $backup_db_name"

    # Store backup database name for cleanup
    echo "$backup_db_name" > "${SCRIPT_DIR}/.last_restore_backup"

    return 0
}

# Validate restoration
validate_restoration() {
    local dc="$1"

    log_info "Validating restoration..."

    # Check database connectivity
    if ! $dc exec -T postgres pg_isready -U "$DB_USER" >/dev/null 2>&1; then
        log_error "Database is not ready"
        return 1
    fi

    # Check database exists and is accessible
    if ! $dc exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        log_error "Cannot access restored database"
        return 1
    fi

    # Get table counts
    local table_count user_count room_count
    table_count=$($dc exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")
    user_count=$($dc exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
    room_count=$($dc exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM rooms;" 2>/dev/null | tr -d ' ' || echo "0")

    echo -e "\n${CYAN}Restoration Statistics:${NC}"
    echo -e "  Tables: $table_count"
    echo -e "  Users: $user_count"
    echo -e "  Rooms: $room_count"

    if [[ "$table_count" -eq 0 ]]; then
        log_error "No tables found in restored database"
        return 1
    fi

    log_success "Database restoration validation passed"
    return 0
}

# Verify service health
verify_service_health() {
    local dc="$1"
    local max_attempts=30
    local attempt=0

    log_info "Verifying service health..."

    while [[ $attempt -lt $max_attempts ]]; do
        local healthy_services=0

        # Check backend
        if curl -f -s "http://localhost:${BACKEND_PORT:-3001}/health" >/dev/null 2>&1; then
            ((healthy_services++))
        fi

        # Check frontend
        if curl -f -s "http://localhost:${FRONTEND_PORT:-80}/" >/dev/null 2>&1; then
            ((healthy_services++))
        fi

        # Check admin
        if curl -f -s "http://localhost:${ADMIN_PORT:-81}/" >/dev/null 2>&1; then
            ((healthy_services++))
        fi

        if [[ $healthy_services -eq 3 ]]; then
            log_success "All services are healthy"
            return 0
        fi

        ((attempt++))
        echo -n "."
        sleep 5
    done

    log_warn "Not all services are healthy, but restoration completed"
    return 0
}

# Display usage
show_usage() {
    echo -e "${BLUE}Usage:${NC}"
    echo "  $0 <backup_file>"
    echo "  $0 --list-backups"
    echo "  $0 --help"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  $0 /path/to/backup.sql"
    echo "  $0 /path/to/backup.sql.gz"
    echo "  $0 --list-backups"
    echo ""
    echo -e "${BLUE}Options:${NC}"
    echo "  --list-backups    List available backup files"
    echo "  --help           Show this help message"
}

# List available backups
list_backups() {
    echo -e "${CYAN}Available Backup Files:${NC}"
    echo ""

    local backups
    readarray -t backups < <(find_available_backups)

    if [[ ${#backups[@]} -eq 0 ]]; then
        echo -e "${YELLOW}No backup files found in:${NC}"
        echo "  - $BACKUP_DIR"
        echo "  - $LOCAL_BACKUP_DIR"
        return 0
    fi

    local count=0
    for backup in "${backups[@]}"; do
        ((count++))
        echo -e "${GREEN}[$count]${NC} $(basename "$backup")"
        echo "     Path: $backup"
        echo "     Size: $(du -h "$backup" 2>/dev/null | cut -f1 || echo "Unknown")"
        echo "     Date: $(stat -c %y "$backup" 2>/dev/null | cut -d'.' -f1 || echo "Unknown")"
        echo ""
    done
}

# Production safety checks
perform_production_safety_checks() {
    if [[ "$IS_PRODUCTION" == "true" ]]; then
        echo -e "${MAGENTA}========================================${NC}"
        echo -e "${MAGENTA}   PRODUCTION ENVIRONMENT DETECTED${NC}"
        echo -e "${MAGENTA}========================================${NC}"
        echo ""
        echo -e "${RED}⚠️  WARNING: You are about to restore a database in PRODUCTION!${NC}"
        echo ""
        echo -e "${YELLOW}This operation will:${NC}"
        echo "  • Replace ALL current data"
        echo "  • Stop all services during restoration"
        echo "  • Create a backup of current data"
        echo "  • Restore from the specified backup file"
        echo ""

        local confirm
        read -p "Type 'RESTORE' to confirm you want to proceed: " confirm
        if [[ "$confirm" != "RESTORE" ]]; then
            log_info "Production restoration cancelled by user"
            exit 0
        fi

        # Additional confirmation
        read -p "Are you absolutely sure? Type 'YES' to continue: " confirm
        if [[ "$confirm" != "YES" ]]; then
            log_info "Production restoration cancelled by user"
            exit 0
        fi

        echo ""
        log_info "Production restoration confirmed by user"
    fi
}

# Main restoration function
perform_restoration() {
    local backup_file="$1"
    local dc
    dc=$(detect_docker_compose)

    log_info "Starting database restoration process"
    log_info "Backup file: $backup_file"
    log_info "Environment: $NODE_ENV"

    # Validate backup file
    if ! validate_backup_file "$backup_file"; then
        return 1
    fi

    show_backup_info "$backup_file"

    # Production safety checks
    perform_production_safety_checks

    # Load environment
    load_environment

    # Create pre-restoration backup
    local pre_backup
    pre_backup=$(create_pre_restoration_backup "$dc")

    # Stop services
    stop_services "$dc"

    # Perform atomic restoration
    if ! restore_database_atomic "$dc" "$backup_file"; then
        log_error "Database restoration failed"

        # Restart services even on failure
        start_services "$dc" || true
        return 1
    fi

    # Start services
    start_services "$dc"

    # Validate restoration
    if ! validate_restoration "$dc"; then
        log_error "Restoration validation failed"
        return 1
    fi

    # Verify service health
    verify_service_health "$dc"

    log_success "Database restoration completed successfully"

    # Cleanup information
    echo -e "\n${CYAN}Post-Restoration Information:${NC}"
    if [[ -n "$pre_backup" ]]; then
        echo -e "  Pre-restoration backup: $pre_backup"
    fi

    if [[ -f "${SCRIPT_DIR}/.last_restore_backup" ]]; then
        local backup_db
        backup_db=$(cat "${SCRIPT_DIR}/.last_restore_backup")
        echo -e "  Original database backup: $backup_db"
        echo -e "\n${YELLOW}To remove the original database backup after verification:${NC}"
        echo -e "  $dc exec postgres psql -U $DB_USER -c 'DROP DATABASE \"$backup_db\";'"
    fi

    return 0
}

# Main execution
main() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}   LottoDrop Database Restoration${NC}"
    echo -e "${CYAN}   $(date +'%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${CYAN}========================================${NC}"

    setup_logging
    acquire_lock

    # Handle command line arguments
    case "${1:-}" in
        "")
            echo -e "${RED}Error: No backup file specified${NC}"
            echo ""
            show_usage
            exit 1
            ;;
        "--list-backups"|"-l")
            list_backups
            exit 0
            ;;
        "--help"|"-h")
            show_usage
            exit 0
            ;;
        *)
            local backup_file="$1"
            if perform_restoration "$backup_file"; then
                echo -e "\n${GREEN}✅ Database restoration completed successfully!${NC}"
                log_success "Restoration process completed"
            else
                echo -e "\n${RED}❌ Database restoration failed!${NC}"
                log_error "Restoration process failed"
                exit 1
            fi
            ;;
    esac
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi