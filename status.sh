#!/bin/bash

# LottoDrop Production-Grade Service Status and Monitoring Script
# Comprehensive health monitoring with performance metrics and diagnostics
# Author: Manual QA Tester & Enterprise Solution Architect
# Version: 2.0.0

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
declare -r RED='\033[0;31m'
declare -r GREEN='\033[0;32m'
declare -r YELLOW='\033[1;33m'
declare -r BLUE='\033[0;34m'
declare -r CYAN='\033[0;36m'
declare -r MAGENTA='\033[0;35m'
declare -r WHITE='\033[1;37m'
declare -r NC='\033[0m' # No Color

# Configuration
declare -r SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
declare -r LOG_DIR="${SCRIPT_DIR}/logs"

# Service configuration
declare -ra SERVICES=("postgres" "redis" "backend" "frontend" "frontend-admin")
declare -ra CRITICAL_SERVICES=("postgres" "redis" "backend")

# Service endpoints and ports (using functions for compatibility)
get_service_endpoint() {
    case "$1" in
        postgres) echo "localhost:5432" ;;
        redis) echo "localhost:6379" ;;
        backend) echo "http://localhost:3001" ;;
        frontend) echo "http://localhost:80" ;;
        frontend-admin) echo "http://localhost:81" ;;
        *) echo "" ;;
    esac
}

get_health_endpoint() {
    case "$1" in
        backend) echo "http://localhost:3001/health" ;;
        frontend) echo "http://localhost:80/health" ;;
        frontend-admin) echo "http://localhost:81/health" ;;
        *) echo "" ;;
    esac
}

# Environment detection
NODE_ENV="${NODE_ENV:-development}"
IS_PRODUCTION=$([[ "$NODE_ENV" == "production" ]] && echo "true" || echo "false")

# Status check timeouts
declare -r HEALTH_CHECK_TIMEOUT=10
declare -r CONNECTION_TIMEOUT=5

# Docker command detection
detect_docker_compose() {
    if command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    elif docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    else
        echo "docker-compose-not-found"
    fi
}

# Load environment if available
load_environment() {
    if [[ -f "${SCRIPT_DIR}/.env" ]]; then
        set -a
        # shellcheck source=/dev/null
        source "${SCRIPT_DIR}/.env"
        set +a
    fi
}

# Check if Docker is running
check_docker_daemon() {
    if ! docker info >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

# Enhanced service health checks
check_service_health() {
    local service="$1"
    local dc="$2"

    case "$service" in
        "postgres")
            # Check if container is running
            if ! $dc ps -q postgres >/dev/null 2>&1; then
                return 1
            fi
            # Check PostgreSQL health
            $dc exec -T postgres pg_isready -U "${DB_USER:-lottodrop_user}" -d "${DB_NAME:-lottodrop}" >/dev/null 2>&1
            ;;
        "redis")
            # Check if container is running
            if ! $dc ps -q redis >/dev/null 2>&1; then
                return 1
            fi
            # Check Redis health
            $dc exec -T redis redis-cli ping >/dev/null 2>&1
            ;;
        "backend")
            # Check container and health endpoint
            if ! $dc ps -q backend >/dev/null 2>&1; then
                return 1
            fi
            local health_endpoint="$(get_health_endpoint "$service")"
            if [[ -n "$health_endpoint" ]]; then
                curl -f -s --max-time "$HEALTH_CHECK_TIMEOUT" "$health_endpoint" >/dev/null 2>&1
            else
                return 1
            fi
            ;;
        "frontend"|"frontend-admin")
            # Check container
            if ! $dc ps -q "$service" >/dev/null 2>&1; then
                return 1
            fi
            # Try health endpoint first, fallback to main endpoint
            local health_endpoint="$(get_health_endpoint "$service")"
            if [[ -n "$health_endpoint" ]] && curl -f -s --max-time "$HEALTH_CHECK_TIMEOUT" "$health_endpoint" >/dev/null 2>&1; then
                return 0
            else
                local service_endpoint="$(get_service_endpoint "$service")"
                curl -f -s --max-time "$HEALTH_CHECK_TIMEOUT" "${service_endpoint}/" >/dev/null 2>&1
            fi
            ;;
        *)
            return 1
            ;;
    esac
}

# Get service response time
get_service_response_time() {
    local service="$1"
    local health_endpoint="$(get_health_endpoint "$service")"
    local service_endpoint="$(get_service_endpoint "$service")"
    local endpoint="${health_endpoint:-$service_endpoint}"

    if [[ "$service" == "postgres" || "$service" == "redis" ]]; then
        echo "N/A"
        return
    fi

    local response_time
    response_time=$(curl -o /dev/null -s -w '%{time_total}' --max-time "$HEALTH_CHECK_TIMEOUT" "$endpoint" 2>/dev/null || echo "timeout")

    if [[ "$response_time" == "timeout" ]]; then
        echo "timeout"
    else
        # Convert to milliseconds
        echo "$(awk "BEGIN {printf \"%.0f\", $response_time * 1000}")ms"
    fi
}

# Get container resource usage
get_container_stats() {
    local container_name="$1"

    if ! docker stats --no-stream --format "{{.CPUPerc}},{{.MemUsage}},{{.NetIO}},{{.BlockIO}}" "$container_name" 2>/dev/null; then
        echo "N/A,N/A,N/A,N/A"
    fi
}

# Get service uptime
get_service_uptime() {
    local service="$1"
    local dc="$2"

    local started_at
    started_at=$($dc ps --format "{{.RunningFor}}" "$service" 2>/dev/null | head -1)

    if [[ -n "$started_at" ]]; then
        echo "$started_at"
    else
        echo "N/A"
    fi
}

# Get database statistics
get_database_stats() {
    local dc="$1"

    if ! check_service_health "postgres" "$dc" >/dev/null 2>&1; then
        echo "Database unavailable"
        return
    fi

    echo -e "\n${BLUE}Database Statistics:${NC}"

    # Database size
    local db_size
    db_size=$($dc exec -T postgres psql -U "${DB_USER:-lottodrop_user}" -d "${DB_NAME:-lottodrop}" -t -c "SELECT pg_size_pretty(pg_database_size('${DB_NAME:-lottodrop}'));" 2>/dev/null | tr -d ' ' || echo "N/A")
    echo "  Database Size: $db_size"

    # Connection count
    local connections
    connections=$($dc exec -T postgres psql -U "${DB_USER:-lottodrop_user}" -d "${DB_NAME:-lottodrop}" -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ' || echo "N/A")
    echo "  Active Connections: $connections"

    # Table count
    local tables
    tables=$($dc exec -T postgres psql -U "${DB_USER:-lottodrop_user}" -d "${DB_NAME:-lottodrop}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "N/A")
    echo "  Tables: $tables"

    # User count (if users table exists)
    local users
    users=$($dc exec -T postgres psql -U "${DB_USER:-lottodrop_user}" -d "${DB_NAME:-lottodrop}" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "N/A")
    if [[ "$users" != "N/A" ]]; then
        echo "  Users: $users"
    fi

    # Room count (if rooms table exists)
    local rooms
    rooms=$($dc exec -T postgres psql -U "${DB_USER:-lottodrop_user}" -d "${DB_NAME:-lottodrop}" -t -c "SELECT COUNT(*) FROM rooms;" 2>/dev/null | tr -d ' ' || echo "N/A")
    if [[ "$rooms" != "N/A" ]]; then
        echo "  Rooms: $rooms"
    fi
}

# Get Redis statistics
get_redis_stats() {
    local dc="$1"

    if ! check_service_health "redis" "$dc" >/dev/null 2>&1; then
        echo "Redis unavailable"
        return
    fi

    echo -e "\n${BLUE}Redis Statistics:${NC}"

    # Redis info
    local redis_info
    redis_info=$($dc exec -T redis redis-cli info memory 2>/dev/null || echo "")

    if [[ -n "$redis_info" ]]; then
        local used_memory
        used_memory=$(echo "$redis_info" | grep "used_memory_human:" | cut -d':' -f2 | tr -d '\r' || echo "N/A")
        echo "  Used Memory: $used_memory"

        local keys
        keys=$($dc exec -T redis redis-cli dbsize 2>/dev/null || echo "N/A")
        echo "  Keys: $keys"

        local connections
        connections=$($dc exec -T redis redis-cli info clients 2>/dev/null | grep "connected_clients:" | cut -d':' -f2 | tr -d '\r' || echo "N/A")
        echo "  Connected Clients: $connections"
    else
        echo "  Unable to retrieve Redis statistics"
    fi
}

# Get performance metrics
get_performance_metrics() {
    echo -e "\n${BLUE}System Performance:${NC}"

    # System load
    if command -v uptime >/dev/null 2>&1; then
        local load_avg
        load_avg=$(uptime | awk -F'load average:' '{print $2}' | tr -d ' ')
        echo "  Load Average: $load_avg"
    fi

    # Memory usage
    if command -v free >/dev/null 2>&1; then
        local mem_info
        mem_info=$(free -h | grep "Mem:" | awk '{print $3 "/" $2 " (" int($3/$2 * 100) "%)"}')
        echo "  Memory Usage: $mem_info"
    fi

    # Disk usage
    local disk_usage
    disk_usage=$(df -h "$SCRIPT_DIR" | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')
    echo "  Disk Usage: $disk_usage"

    # Docker disk usage
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        local docker_disk
        docker_disk=$(docker system df --format "table {{.Size}}" 2>/dev/null | tail -n +2 | head -1 || echo "N/A")
        echo "  Docker Usage: $docker_disk"
    fi
}

# Get log information
get_log_info() {
    echo -e "\n${BLUE}Log Information:${NC}"

    # Check log directory
    if [[ -d "$LOG_DIR" ]]; then
        local log_count
        log_count=$(find "$LOG_DIR" -name "*.log" -type f | wc -l)
        echo "  Log Files: $log_count"

        if [[ $log_count -gt 0 ]]; then
            local latest_log
            latest_log=$(find "$LOG_DIR" -name "*.log" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2- || echo "N/A")
            if [[ "$latest_log" != "N/A" ]]; then
                local log_size
                log_size=$(du -h "$latest_log" | cut -f1)
                echo "  Latest Log: $(basename "$latest_log") (${log_size})"
            fi
        fi
    else
        echo "  Log Directory: Not found"
    fi

    # Check for error logs
    if command -v docker >/dev/null 2>&1; then
        local error_count
        error_count=$(docker logs lottodrop-backend 2>&1 | grep -i error | wc -l 2>/dev/null || echo "0")
        if [[ $error_count -gt 0 ]]; then
            echo -e "  ${YELLOW}Recent Errors: $error_count${NC}"
        fi
    fi
}

# Display network status
get_network_status() {
    local dc="$1"

    echo -e "\n${BLUE}Network Status:${NC}"

    # Check Docker network
    local network_name
    network_name=$($dc config 2>/dev/null | grep -A 5 "networks:" | grep -v "^networks:" | head -1 | awk '{print $1}' | tr -d ':' || echo "lottodrop-network")

    if docker network inspect "$network_name" >/dev/null 2>&1; then
        local network_subnet
        network_subnet=$(docker network inspect "$network_name" --format='{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null || echo "N/A")
        echo "  Network: $network_name (Subnet: $network_subnet)"

        # Connected containers
        local connected_containers
        connected_containers=$(docker network inspect "$network_name" --format='{{len .Containers}}' 2>/dev/null || echo "0")
        echo "  Connected Containers: $connected_containers"
    else
        echo -e "  ${YELLOW}Network: $network_name (not found)${NC}"
    fi

    # Port availability
    echo "  Port Status:"
    for service in "${SERVICES[@]}"; do
        local endpoint="$(get_service_endpoint "$service")"
        local port
        port=$(echo "$endpoint" | grep -o ':[0-9]*' | tr -d ':' || echo "")

        if [[ -n "$port" ]]; then
            if netstat -tuln 2>/dev/null | grep -q ":${port} " || ss -tuln 2>/dev/null | grep -q ":${port} "; then
                echo -e "    ${service} (${port}): ${GREEN}✓ Open${NC}"
            else
                echo -e "    ${service} (${port}): ${RED}✗ Closed${NC}"
            fi
        fi
    done
}

# Security status check
get_security_status() {
    echo -e "\n${BLUE}Security Status:${NC}"

    # Environment file permissions
    if [[ -f "${SCRIPT_DIR}/.env" ]]; then
        local env_perms
        env_perms=$(stat -c "%a" "${SCRIPT_DIR}/.env" 2>/dev/null || echo "N/A")
        if [[ "$env_perms" == "600" ]]; then
            echo -e "  .env Permissions: ${GREEN}✓ Secure (600)${NC}"
        else
            echo -e "  .env Permissions: ${YELLOW}⚠ $env_perms (recommend 600)${NC}"
        fi
    else
        echo -e "  .env File: ${YELLOW}⚠ Not found${NC}"
    fi

    # SSL/TLS status (if applicable)
    if [[ "$IS_PRODUCTION" == "true" ]]; then
        echo "  SSL/TLS: Check domain configuration"
    fi

    # Check for default passwords
    if [[ -f "${SCRIPT_DIR}/.env" ]]; then
        if grep -q "secure_password_123\|Admin123" "${SCRIPT_DIR}/.env" 2>/dev/null; then
            echo -e "  ${RED}⚠ Default passwords detected in .env${NC}"
        else
            echo -e "  Password Security: ${GREEN}✓ Custom passwords${NC}"
        fi
    fi
}

# Display container status table
show_container_status() {
    local dc="$1"

    echo -e "\n${WHITE}============================================================${NC}"
    echo -e "${WHITE}                    CONTAINER STATUS                        ${NC}"
    echo -e "${WHITE}============================================================${NC}"

    printf "%-20s %-10s %-12s %-10s %-15s\n" "Service" "Status" "Health" "Response" "Uptime"
    printf "%-20s %-10s %-12s %-10s %-15s\n" "--------" "--------" "--------" "--------" "--------"

    for service in "${SERVICES[@]}"; do
        local status="Unknown"
        local health="Unknown"
        local response_time="N/A"
        local uptime="N/A"

        # Check if container exists and is running
        if $dc ps -q "$service" >/dev/null 2>&1; then
            local container_status
            container_status=$($dc ps --format "{{.Status}}" "$service" 2>/dev/null)

            if [[ "$container_status" == *"Up"* ]]; then
                status="${GREEN}Running${NC}"
                uptime=$(get_service_uptime "$service" "$dc")

                # Check health
                if check_service_health "$service" "$dc"; then
                    health="${GREEN}Healthy${NC}"
                    response_time=$(get_service_response_time "$service")
                else
                    health="${RED}Unhealthy${NC}"
                fi
            else
                status="${RED}Stopped${NC}"
                health="${RED}Down${NC}"
            fi
        else
            status="${RED}Not Found${NC}"
            health="${RED}Down${NC}"
        fi

        printf "%-30s %-20s %-20s %-15s %-15s\n" "$service" "$status" "$health" "$response_time" "$uptime"
    done
}

# Display resource usage table
show_resource_usage() {
    echo -e "\n${WHITE}============================================================${NC}"
    echo -e "${WHITE}                    RESOURCE USAGE                         ${NC}"
    echo -e "${WHITE}============================================================${NC}"

    printf "%-20s %-10s %-15s %-15s %-15s\n" "Container" "CPU %" "Memory" "Network I/O" "Block I/O"
    printf "%-20s %-10s %-15s %-15s %-15s\n" "--------" "------" "--------" "-----------" "---------"

    for service in "${SERVICES[@]}"; do
        local container_name="lottodrop-${service}"
        local stats
        stats=$(get_container_stats "$container_name")

        IFS=',' read -r cpu memory network block <<< "$stats"

        printf "%-20s %-10s %-15s %-15s %-15s\n" "$service" "$cpu" "$memory" "$network" "$block"
    done
}

# Display access URLs
show_access_urls() {
    echo -e "\n${WHITE}============================================================${NC}"
    echo -e "${WHITE}                    ACCESS INFORMATION                     ${NC}"
    echo -e "${WHITE}============================================================${NC}"

    echo -e "\n${GREEN}🌐 Application URLs:${NC}"
    for service in "${SERVICES[@]}"; do
        local endpoint="$(get_service_endpoint "$service")"
        local health_endpoint="$(get_health_endpoint "$service")"

        if [[ "$service" != "postgres" && "$service" != "redis" ]]; then
            echo -e "  ${service^}: ${CYAN}$endpoint${NC}"
            if [[ -n "$health_endpoint" ]]; then
                echo -e "    Health: ${CYAN}$health_endpoint${NC}"
            fi
        fi
    done

    echo -e "\n${GREEN}🔌 Database Connections:${NC}"
    echo -e "  PostgreSQL: ${CYAN}$(get_service_endpoint "postgres")${NC}"
    echo -e "  Redis: ${CYAN}$(get_service_endpoint "redis")${NC}"

    if [[ -n "${ADMIN_EMAIL:-}" ]]; then
        echo -e "\n${GREEN}🔑 Admin Credentials:${NC}"
        echo -e "  Email: ${YELLOW}${ADMIN_EMAIL}${NC}"
        echo -e "  Password: ${YELLOW}[configured]${NC}"
    fi
}

# Show useful commands
show_useful_commands() {
    local dc="$1"

    echo -e "\n${WHITE}============================================================${NC}"
    echo -e "${WHITE}                    USEFUL COMMANDS                        ${NC}"
    echo -e "${WHITE}============================================================${NC}"

    echo -e "\n${BLUE}🔧 Management Commands:${NC}"
    echo -e "  Start services:     ${CYAN}./start.sh${NC}"
    echo -e "  Stop services:      ${CYAN}./stop.sh${NC}"
    echo -e "  Restart services:   ${CYAN}./restart.sh${NC}"
    echo -e "  View this status:   ${CYAN}./status.sh${NC}"

    echo -e "\n${BLUE}📊 Monitoring Commands:${NC}"
    echo -e "  View all logs:      ${CYAN}$dc logs -f${NC}"
    echo -e "  View service logs:  ${CYAN}$dc logs -f [service]${NC}"
    echo -e "  Live resource usage:${CYAN}docker stats${NC}"
    echo -e "  Container shell:    ${CYAN}$dc exec [service] bash${NC}"

    echo -e "\n${BLUE}🗄️ Database Commands:${NC}"
    echo -e "  PostgreSQL shell:   ${CYAN}$dc exec postgres psql -U ${DB_USER:-lottodrop_user} -d ${DB_NAME:-lottodrop}${NC}"
    echo -e "  Redis shell:        ${CYAN}$dc exec redis redis-cli${NC}"

    if [[ "$IS_PRODUCTION" == "true" ]]; then
        echo -e "\n${BLUE}🔒 Production Commands:${NC}"
        echo -e "  Create backup:      ${CYAN}./backup.sh${NC}"
        echo -e "  Restore backup:     ${CYAN}./restore.sh [backup_file]${NC}"
    fi
}

# Quick health summary
show_health_summary() {
    local dc="$1"

    local total_services=${#SERVICES[@]}
    local healthy_services=0
    local critical_unhealthy=()

    for service in "${SERVICES[@]}"; do
        if check_service_health "$service" "$dc"; then
            ((healthy_services++))
        else
            # Check if it's a critical service
            if [[ " ${CRITICAL_SERVICES[*]} " =~ " ${service} " ]]; then
                critical_unhealthy+=("$service")
            fi
        fi
    done

    echo -e "\n${WHITE}============================================================${NC}"
    echo -e "${WHITE}                    HEALTH SUMMARY                         ${NC}"
    echo -e "${WHITE}============================================================${NC}"

    echo -e "\n${BLUE}Overall Status:${NC}"
    echo -e "  Services Running: ${healthy_services}/${total_services}"

    if [[ $healthy_services -eq $total_services ]]; then
        echo -e "  Platform Status: ${GREEN}✅ All Systems Operational${NC}"
    elif [[ ${#critical_unhealthy[@]} -eq 0 ]]; then
        echo -e "  Platform Status: ${YELLOW}⚠️ Non-Critical Issues${NC}"
    else
        echo -e "  Platform Status: ${RED}❌ Critical Issues Detected${NC}"
        echo -e "  Critical Services Down: ${critical_unhealthy[*]}"
    fi

    echo -e "  Environment: ${NODE_ENV}"
    echo -e "  Docker Compose: $(detect_docker_compose)"
}

# Main status function
main() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}   LottoDrop Platform Status Monitor${NC}"
    echo -e "${CYAN}   $(date +'%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${CYAN}========================================${NC}"

    # Load environment
    load_environment

    # Check Docker
    if ! check_docker_daemon; then
        echo -e "\n${RED}❌ Docker daemon is not running!${NC}"
        echo "Please start Docker and try again."
        exit 1
    fi

    local dc
    dc=$(detect_docker_compose)

    if [[ "$dc" == "docker-compose-not-found" ]]; then
        echo -e "\n${RED}❌ Docker Compose not found!${NC}"
        exit 1
    fi

    # Display all status information
    show_health_summary "$dc"
    show_container_status "$dc"
    show_resource_usage "$dc"
    get_performance_metrics
    get_database_stats "$dc"
    get_redis_stats "$dc"
    get_network_status "$dc"
    get_security_status
    get_log_info
    show_access_urls
    show_useful_commands "$dc"

    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}    Status check completed$(printf '%16s' '')${NC}"
    echo -e "${CYAN}========================================${NC}"
}

# Handle command line arguments
case "${1:-}" in
    "--help"|"-h")
        echo "LottoDrop Status Monitor"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h    Show this help message"
        echo "  --json        Output status in JSON format (future feature)"
        echo "  --quiet       Minimal output"
        echo ""
        echo "This script provides comprehensive status information for all"
        echo "LottoDrop services including health checks, resource usage,"
        echo "performance metrics, and security status."
        exit 0
        ;;
    "--quiet"|"-q")
        # Quick status check
        load_environment
        if ! check_docker_daemon; then
            echo "Docker: DOWN"
            exit 1
        fi

        dc=$(detect_docker_compose)
        healthy_count=0
        for service in "${SERVICES[@]}"; do
            if check_service_health "$service" "$dc"; then
                ((healthy_count++))
            fi
        done

        echo "Services: $healthy_count/${#SERVICES[@]} healthy"
        exit 0
        ;;
    *)
        main
        ;;
esac