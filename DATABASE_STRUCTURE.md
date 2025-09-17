# LottoDrop Database Structure

## Database Configuration
- **Database Name**: lottodrop
- **Owner**: lottodrop_user
- **Port**: 5432
- **Container**: lottodrop-postgres

## Tables Overview

### 1. users
Main user accounts table storing player information.

### 2. admin_users
Administrative users with backend access privileges.

### 3. rooms
Game rooms where players join to participate in lottery drops.

### 4. game_rounds
Individual game rounds within rooms, tracking game state and results.

### 5. round_participants
Junction table linking users to specific game rounds they're participating in.

### 6. round_winners
Records of winners for each completed game round.

### 7. transactions
Financial transactions including deposits, withdrawals, entry fees, and winnings.

### 8. chat_messages
In-game chat messages between players in rooms.

### 9. audit_logs
System audit trail for important actions and changes.

### 10. vrf_verifications
Verifiable Random Function records for provably fair gaming.

## Current Data Statistics
- **Users**: 3 registered users
- **Rooms**: 6 game rooms configured
- **Transactions**: 1,105 transaction records
- **Game Rounds**: 289 rounds played
- **Round Participants**: 579 participation records
- **Round Winners**: 104 winner records

## Database Backup Location
The complete database backup with schema and data is stored at:
- Container: `/tmp/lotto_drop_complete_backup.sql`
- Local: `backend/migrations/lotto_drop_complete_backup.sql`

## Docker Configuration
The database runs in Docker with the following configuration:
```yaml
postgres:
  image: postgres:15-alpine
  container_name: lottodrop-postgres
  environment:
    POSTGRES_DB: lottodrop
    POSTGRES_USER: lottodrop_user
    POSTGRES_PASSWORD: secure_password_123
  ports:
    - "5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./backend/migrations:/docker-entrypoint-initdb.d:ro
```

## Connection String
```
postgresql://lottodrop_user:secure_password_123@localhost:5432/lottodrop
```

## Important Notes
1. The database has been migrated from local PostgreSQL to Docker
2. All data and schema have been preserved during migration
3. The database includes triggers for updated_at timestamps
4. UUID extension is enabled for unique identifiers
5. Proper indexes are in place for performance optimization

## Maintenance Commands

### Backup Database
```bash
docker exec lottodrop-postgres pg_dump -U lottodrop_user -d lottodrop > backup.sql
```

### Restore Database
```bash
docker exec -i lottodrop-postgres psql -U lottodrop_user -d lottodrop < backup.sql
```

### Access Database Shell
```bash
docker exec -it lottodrop-postgres psql -U lottodrop_user -d lottodrop
```

## Migration History
- **2025-09-15**: Migrated from local PostgreSQL (postgres@localhost:5432/lotto_drop) to Docker container
- Original database preserved with all data and schema intact
- Successfully imported 1,105 transactions, 3 users, 6 rooms, 289 game rounds