#!/bin/bash

# LottoDrop Docker Services Logs Script
# This script helps view logs from Docker services

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   LottoDrop Platform Logs Viewer${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running!${NC}"
    exit 1
fi

# Function to show menu
show_menu() {
    echo -e "${YELLOW}Select a service to view logs:${NC}"
    echo "  1) All services"
    echo "  2) Backend"
    echo "  3) Frontend"
    echo "  4) Admin Panel"
    echo "  5) Database"
    echo "  6) Exit"
    echo ""
}

# Main loop
while true; do
    show_menu
    read -p "Enter your choice [1-6]: " choice
    
    case $choice in
        1)
            echo -e "${GREEN}Showing logs for all services (Ctrl+C to stop)...${NC}"
            docker-compose logs -f
            ;;
        2)
            echo -e "${GREEN}Showing Backend logs (Ctrl+C to stop)...${NC}"
            docker-compose logs -f backend
            ;;
        3)
            echo -e "${GREEN}Showing Frontend logs (Ctrl+C to stop)...${NC}"
            docker-compose logs -f frontend
            ;;
        4)
            echo -e "${GREEN}Showing Admin Panel logs (Ctrl+C to stop)...${NC}"
            docker-compose logs -f frontend-admin
            ;;
        5)
            echo -e "${GREEN}Showing Database logs (Ctrl+C to stop)...${NC}"
            docker-compose logs -f postgres
            ;;
        6)
            echo -e "${GREEN}Exiting...${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please try again.${NC}"
            ;;
    esac
    echo ""
done