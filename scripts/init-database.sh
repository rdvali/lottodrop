#!/bin/bash

# Database Initialization Script for LottoDrop
# This script ensures the Docker PostgreSQL database is properly initialized

echo "🔄 Initializing LottoDrop Database..."

# Check if database exists
DB_EXISTS=$(docker exec lottodrop-postgres psql -U lottodrop_user -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='lottodrop'" 2>/dev/null)

if [ "$DB_EXISTS" != "1" ]; then
    echo "📦 Database does not exist. Creating and importing..."

    # Create database
    docker exec lottodrop-postgres psql -U lottodrop_user -d postgres -c "CREATE DATABASE lottodrop OWNER lottodrop_user"

    # Copy backup file to container
    docker cp backend/migrations/lotto_drop_complete_backup.sql lottodrop-postgres:/tmp/

    # Import database
    docker exec lottodrop-postgres psql -U lottodrop_user -d lottodrop -f /tmp/lotto_drop_complete_backup.sql

    echo "✅ Database created and imported successfully"
else
    # Check if tables exist
    TABLE_COUNT=$(docker exec lottodrop-postgres psql -U lottodrop_user -d lottodrop -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null)

    if [ "$TABLE_COUNT" -lt "10" ]; then
        echo "⚠️ Database exists but is empty. Importing schema and data..."

        # Copy backup file to container
        docker cp backend/migrations/lotto_drop_complete_backup.sql lottodrop-postgres:/tmp/

        # Import database
        docker exec lottodrop-postgres psql -U lottodrop_user -d lottodrop -f /tmp/lotto_drop_complete_backup.sql

        echo "✅ Database schema and data imported successfully"
    else
        echo "✅ Database already initialized with $(docker exec lottodrop-postgres psql -U lottodrop_user -d lottodrop -tAc "SELECT COUNT(*) FROM users") users"
    fi
fi

# Display database statistics
echo ""
echo "📊 Database Statistics:"
echo "========================"
docker exec lottodrop-postgres psql -U lottodrop_user -d lottodrop -c "
SELECT
    'Users' as entity, COUNT(*) as count FROM users
UNION ALL
SELECT 'Rooms', COUNT(*) FROM rooms
UNION ALL
SELECT 'Game Rounds', COUNT(*) FROM game_rounds
UNION ALL
SELECT 'Transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'Round Participants', COUNT(*) FROM round_participants
UNION ALL
SELECT 'Round Winners', COUNT(*) FROM round_winners;"

echo ""
echo "🎉 Database initialization complete!"