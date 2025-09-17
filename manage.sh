#!/bin/bash

# LottoDrop Docker Services Management Script
# Main management script for all Docker operations

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# ASCII Art Logo
show_logo() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════╗"
    echo "║         LottoDrop Platform Manager        ║"
    echo "╚═══════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function to show main menu
show_main_menu() {
    echo -e "${YELLOW}Main Menu:${NC}"
    echo ""
    echo -e "${GREEN}Service Management:${NC}"
    echo "  1) Start all services"
    echo "  2) Stop all services"
    echo "  3) Restart all services"
    echo "  4) Check service status"
    echo ""
    echo -e "${BLUE}Development Tools:${NC}"
    echo "  5) View logs"
    echo "  6) Rebuild services"
    echo "  7) Access database shell"
    echo "  8) Run database migrations"
    echo ""
    echo -e "${MAGENTA}Maintenance:${NC}"
    echo "  9) Clean up (remove containers/volumes)"
    echo "  10) Backup database"
    echo "  11) Restore database"
    echo ""
    echo -e "${RED}  0) Exit${NC}"
    echo ""
}

# Check Docker status
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}Error: Docker is not running!${NC}"
        echo "Please start Docker Desktop and try again."
        exit 1
    fi
}

# Start services
start_services() {
    echo -e "${GREEN}Starting all services...${NC}"
    ./start.sh
}

# Stop services
stop_services() {
    echo -e "${RED}Stopping all services...${NC}"
    ./stop.sh
}

# Restart services
restart_services() {
    echo -e "${YELLOW}Restarting all services...${NC}"
    ./restart.sh
}

# Check status
check_status() {
    ./status.sh
}

# View logs
view_logs() {
    ./logs.sh
}

# Rebuild services
rebuild_services() {
    echo -e "${YELLOW}Rebuilding services...${NC}"
    read -p "Rebuild all services? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        echo -e "${GREEN}Services rebuilt successfully!${NC}"
    fi
}

# Access database shell
db_shell() {
    echo -e "${BLUE}Accessing PostgreSQL shell...${NC}"
    echo -e "${YELLOW}Type \\q to exit${NC}"
    docker exec -it lottodrop-postgres psql -U lottodrop_user -d lottodrop
}

# Run migrations
run_migrations() {
    echo -e "${YELLOW}Running database migrations...${NC}"
    
    # Check if migrations exist
    if [ -d "backend/src/database" ]; then
        for migration in backend/src/database/migration_*.sql; do
            if [ -f "$migration" ]; then
                echo "Running: $(basename $migration)"
                docker exec -i lottodrop-postgres psql -U lottodrop_user -d lottodrop < "$migration"
            fi
        done
        echo -e "${GREEN}Migrations completed!${NC}"
    else
        echo -e "${RED}No migrations found!${NC}"
    fi
}

# Clean up
cleanup() {
    echo -e "${RED}Warning: This will remove all containers and volumes!${NC}"
    read -p "Are you sure? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v
        docker system prune -f
        echo -e "${GREEN}Cleanup completed!${NC}"
    fi
}

# Backup database
backup_db() {
    echo -e "${BLUE}Creating database backup...${NC}"
    
    # Create backups directory if it doesn't exist
    mkdir -p backups
    
    # Generate timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="backups/lottodrop_backup_${TIMESTAMP}.sql"
    
    # Create backup
    docker exec lottodrop-postgres pg_dump -U lottodrop_user lottodrop > "$BACKUP_FILE"
    
    if [ -f "$BACKUP_FILE" ]; then
        echo -e "${GREEN}Backup created: $BACKUP_FILE${NC}"
        ls -lh "$BACKUP_FILE"
    else
        echo -e "${RED}Backup failed!${NC}"
    fi
}

# Restore database
restore_db() {
    echo -e "${BLUE}Available backups:${NC}"
    
    if [ ! -d "backups" ] || [ -z "$(ls -A backups/*.sql 2>/dev/null)" ]; then
        echo -e "${RED}No backups found!${NC}"
        return
    fi
    
    # List backups
    select backup in backups/*.sql; do
        if [ -n "$backup" ]; then
            echo -e "${YELLOW}Restoring from: $backup${NC}"
            read -p "This will overwrite the current database. Continue? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                docker exec -i lottodrop-postgres psql -U lottodrop_user -d lottodrop < "$backup"
                echo -e "${GREEN}Database restored!${NC}"
            fi
            break
        fi
    done
}

# Main script
clear
show_logo
check_docker

while true; do
    show_main_menu
    read -p "Enter your choice [0-11]: " choice
    
    case $choice in
        1)
            start_services
            ;;
        2)
            stop_services
            ;;
        3)
            restart_services
            ;;
        4)
            check_status
            ;;
        5)
            view_logs
            ;;
        6)
            rebuild_services
            ;;
        7)
            db_shell
            ;;
        8)
            run_migrations
            ;;
        9)
            cleanup
            ;;
        10)
            backup_db
            ;;
        11)
            restore_db
            ;;
        0)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please try again.${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    clear
    show_logo
done