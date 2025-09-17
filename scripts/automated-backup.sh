#!/bin/bash

# LottoDrop Automated Backup Script with Remote Storage
# Backs up database, uploads, and configs to local and remote storage

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="/var/backups/lottodrop"
DATE=$(date +%Y%m%d_%H%M%S)
KEEP_LOCAL_DAYS=7
KEEP_REMOTE_DAYS=30
S3_BUCKET="s3://lottodrop-backups"  # Configure your S3 bucket

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   LottoDrop Automated Backup${NC}"
echo -e "${BLUE}   $(date)${NC}"
echo -e "${BLUE}========================================${NC}"

# Create backup directory
mkdir -p $BACKUP_DIR
mkdir -p $BACKUP_DIR/daily
mkdir -p $BACKUP_DIR/weekly
mkdir -p $BACKUP_DIR/monthly

# Determine backup type based on date
DAY_OF_WEEK=$(date +%u)
DAY_OF_MONTH=$(date +%d)

if [ "$DAY_OF_MONTH" -eq 1 ]; then
    BACKUP_TYPE="monthly"
    BACKUP_SUBDIR="$BACKUP_DIR/monthly"
elif [ "$DAY_OF_WEEK" -eq 7 ]; then
    BACKUP_TYPE="weekly"
    BACKUP_SUBDIR="$BACKUP_DIR/weekly"
else
    BACKUP_TYPE="daily"
    BACKUP_SUBDIR="$BACKUP_DIR/daily"
fi

echo -e "${YELLOW}Backup Type: $BACKUP_TYPE${NC}"

# 1. Database Backup
echo -e "${GREEN}Step 1: Backing up database...${NC}"
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump \
    -U ${DB_USER:-lottodrop_user} \
    -d ${DB_NAME:-lottodrop} \
    --verbose \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl | gzip -9 > $BACKUP_SUBDIR/db_backup_$DATE.sql.gz

DB_SIZE=$(du -sh $BACKUP_SUBDIR/db_backup_$DATE.sql.gz | cut -f1)
echo -e "${GREEN}✓ Database backed up (Size: $DB_SIZE)${NC}"

# 2. Redis Backup
echo -e "${GREEN}Step 2: Backing up Redis...${NC}"
docker-compose -f docker-compose.prod.yml exec -T redis redis-cli \
    ${REDIS_PASSWORD:+-a $REDIS_PASSWORD} \
    --rdb /data/dump.rdb BGSAVE

sleep 5  # Wait for background save

docker-compose -f docker-compose.prod.yml exec -T redis cat /data/dump.rdb | \
    gzip -9 > $BACKUP_SUBDIR/redis_backup_$DATE.rdb.gz

REDIS_SIZE=$(du -sh $BACKUP_SUBDIR/redis_backup_$DATE.rdb.gz | cut -f1)
echo -e "${GREEN}✓ Redis backed up (Size: $REDIS_SIZE)${NC}"

# 3. Uploads Backup
if [ -d "backend/uploads" ] && [ "$(ls -A backend/uploads)" ]; then
    echo -e "${GREEN}Step 3: Backing up uploads...${NC}"
    tar -czf $BACKUP_SUBDIR/uploads_backup_$DATE.tar.gz backend/uploads/
    UPLOADS_SIZE=$(du -sh $BACKUP_SUBDIR/uploads_backup_$DATE.tar.gz | cut -f1)
    echo -e "${GREEN}✓ Uploads backed up (Size: $UPLOADS_SIZE)${NC}"
else
    echo -e "${YELLOW}No uploads to backup${NC}"
fi

# 4. Configuration Backup
echo -e "${GREEN}Step 4: Backing up configuration...${NC}"
tar -czf $BACKUP_SUBDIR/config_backup_$DATE.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    .env \
    backend/.env \
    docker-compose.prod.yml \
    docker-compose.override.yml \
    nginx.conf \
    2>/dev/null || true

CONFIG_SIZE=$(du -sh $BACKUP_SUBDIR/config_backup_$DATE.tar.gz | cut -f1)
echo -e "${GREEN}✓ Configuration backed up (Size: $CONFIG_SIZE)${NC}"

# 5. Create backup manifest
echo -e "${GREEN}Step 5: Creating backup manifest...${NC}"
cat > $BACKUP_SUBDIR/manifest_$DATE.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "type": "$BACKUP_TYPE",
  "version": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "files": {
    "database": "db_backup_$DATE.sql.gz",
    "redis": "redis_backup_$DATE.rdb.gz",
    "uploads": "uploads_backup_$DATE.tar.gz",
    "config": "config_backup_$DATE.tar.gz"
  },
  "sizes": {
    "database": "$DB_SIZE",
    "redis": "$REDIS_SIZE",
    "uploads": "${UPLOADS_SIZE:-N/A}",
    "config": "$CONFIG_SIZE"
  },
  "environment": {
    "domain": "${DOMAIN:-lottodrop.net}",
    "node_env": "${NODE_ENV:-production}"
  }
}
EOF

# 6. Create consolidated backup archive
echo -e "${GREEN}Step 6: Creating consolidated backup...${NC}"
cd $BACKUP_SUBDIR
tar -czf lottodrop_${BACKUP_TYPE}_$DATE.tar.gz \
    db_backup_$DATE.sql.gz \
    redis_backup_$DATE.rdb.gz \
    config_backup_$DATE.tar.gz \
    manifest_$DATE.json \
    $(ls uploads_backup_$DATE.tar.gz 2>/dev/null || true)

TOTAL_SIZE=$(du -sh lottodrop_${BACKUP_TYPE}_$DATE.tar.gz | cut -f1)
echo -e "${GREEN}✓ Consolidated backup created (Size: $TOTAL_SIZE)${NC}"

# 7. Upload to remote storage (S3/Google Cloud/Azure)
if command -v aws &> /dev/null; then
    echo -e "${GREEN}Step 7: Uploading to S3...${NC}"
    aws s3 cp lottodrop_${BACKUP_TYPE}_$DATE.tar.gz $S3_BUCKET/$BACKUP_TYPE/ \
        --storage-class STANDARD_IA \
        --metadata "type=$BACKUP_TYPE,date=$DATE" || {
        echo -e "${YELLOW}S3 upload failed, keeping local backup${NC}"
    }
else
    echo -e "${YELLOW}AWS CLI not installed, skipping remote backup${NC}"
fi

# 8. Clean old local backups
echo -e "${GREEN}Step 8: Cleaning old backups...${NC}"

# Clean daily backups older than 7 days
find $BACKUP_DIR/daily -type f -mtime +7 -delete 2>/dev/null || true

# Clean weekly backups older than 30 days
find $BACKUP_DIR/weekly -type f -mtime +30 -delete 2>/dev/null || true

# Clean monthly backups older than 365 days
find $BACKUP_DIR/monthly -type f -mtime +365 -delete 2>/dev/null || true

# 9. Verify backup integrity
echo -e "${GREEN}Step 9: Verifying backup integrity...${NC}"

# Test database backup
gunzip -t $BACKUP_SUBDIR/db_backup_$DATE.sql.gz && \
    echo -e "${GREEN}✓ Database backup verified${NC}" || \
    echo -e "${RED}✗ Database backup corrupted!${NC}"

# Test Redis backup
gunzip -t $BACKUP_SUBDIR/redis_backup_$DATE.rdb.gz && \
    echo -e "${GREEN}✓ Redis backup verified${NC}" || \
    echo -e "${RED}✗ Redis backup corrupted!${NC}"

# 10. Send notification
echo -e "${GREEN}Step 10: Sending notification...${NC}"

# Create summary
SUMMARY="LottoDrop Backup Complete
Type: $BACKUP_TYPE
Date: $(date)
Total Size: $TOTAL_SIZE
Database: $DB_SIZE
Redis: $REDIS_SIZE
Uploads: ${UPLOADS_SIZE:-N/A}
Config: $CONFIG_SIZE"

# Send to monitoring webhook (if configured)
if [ -n "$MONITORING_WEBHOOK" ]; then
    curl -X POST $MONITORING_WEBHOOK \
        -H "Content-Type: application/json" \
        -d "{\"text\": \"$SUMMARY\"}" 2>/dev/null || true
fi

# Log to syslog
logger -t lottodrop-backup "$BACKUP_TYPE backup completed successfully"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Backup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Type: $BACKUP_TYPE"
echo "Location: $BACKUP_SUBDIR"
echo "Total Size: $TOTAL_SIZE"
echo ""

# Exit with success
exit 0