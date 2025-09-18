# 🚀 LottoDrop Production Deployment Guide v2.0
## Latest Updates: September 18, 2025

This guide covers deploying the latest LottoDrop updates including:
- ✅ Results page improvements with name masking
- ✅ Mobile UI optimizations for game animations
- ✅ New "How To Play" page (replacing Leaderboard)
- ✅ Backend improvements for better data handling

---

## 📋 Pre-Deployment Checklist

Before starting the deployment:
- [ ] Ensure you have SSH access to the production server
- [ ] Have database backup ready (automated in the scripts)
- [ ] Confirm Docker and Docker Compose are installed on the server
- [ ] Have at least 30 minutes for the deployment window

---

## 🔄 Step-by-Step Deployment Process

### Step 1: Connect to Production Server

```bash
ssh your-user@your-production-server
cd /path/to/lottodrop
```

### Step 2: Backup Current Production

```bash
# Create backup directory if it doesn't exist
mkdir -p backups/$(date +%Y%m%d)

# Backup database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U lottodrop_user -d lottodrop > backups/$(date +%Y%m%d)/database_backup_$(date +%H%M%S).sql

# Backup current code (optional but recommended)
cp -r . ../lottodrop_backup_$(date +%Y%m%d_%H%M%S)
```

### Step 3: Pull Latest Changes from Git

```bash
# Stash any local changes (if any)
git stash

# Pull the latest changes
git pull origin main

# Check the latest commit
git log -1 --oneline
```

### Step 4: Update Environment Files

No environment changes required for this update. Your existing `.env` files should work as-is.

### Step 5: Build and Deploy with Docker Compose

```bash
# Stop current containers
docker-compose -f docker-compose.prod.yml down

# Build new images with latest code
docker-compose -f docker-compose.prod.yml build --no-cache

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check if all containers are running
docker-compose -f docker-compose.prod.yml ps
```

### Step 6: Database Updates

No database schema changes are required for this deployment. The system will use existing tables.

### Step 7: Verify Deployment

```bash
# Check container health
docker-compose -f docker-compose.prod.yml ps

# Check backend logs
docker-compose -f docker-compose.prod.yml logs -f backend --tail=50

# Check frontend logs
docker-compose -f docker-compose.prod.yml logs -f frontend --tail=50

# Test the application
curl -I https://your-domain.com
```

---

## 🎯 What's New in This Deployment

### Frontend Changes:
1. **How To Play Page** (`/how-to-play`)
   - Comprehensive 6-step tutorial
   - Mobile-responsive design
   - Interactive expandable sections
   - Replaces the Leaderboard in navigation

2. **Mobile UI Improvements**
   - Better countdown visibility on mobile
   - Optimized VRF winner animation for mobile
   - Floating countdown that transitions to full-screen

3. **Results Page**
   - Player names now masked for privacy (e.g., "John D" instead of "John Doe")
   - Fixed data fetching from correct database tables
   - Improved visual layout with icons

### Backend Changes:
1. **Name Masking** (`backend/src/controllers/resultsController.ts`)
   - Industry-standard "First Name + Last Initial" format
   - Applied to all results endpoints
   - Privacy protection for all players

2. **Data Fetching Improvements**
   - Results now pulled from `game_rounds` table
   - Better JOIN operations for accurate data
   - Consistent ordering (newest first)

---

## 🔍 Testing After Deployment

### 1. Test New Features:

```bash
# Test How To Play page
curl -s https://your-domain.com/how-to-play | grep -o "<title>.*</title>"

# Test Results API with name masking
curl -s https://your-domain.com/api/results | jq '.results[0].playerName'
# Should see format like "John D" not "John Doe"

# Test room status
curl -s https://your-domain.com/api/rooms | jq '.[].status'
```

### 2. Mobile Testing:
- Open the site on a mobile device
- Join a game room
- Verify countdown is clearly visible
- Check that animations work smoothly

### 3. Functional Testing:
- Navigate to "How To Play" in the header
- Verify all sections expand/collapse properly
- Join a game and complete a full round
- Check Results page shows masked names

---

## 🚨 Rollback Procedure (If Needed)

If issues arise, follow these steps to rollback:

```bash
# Stop current containers
docker-compose -f docker-compose.prod.yml down

# Restore previous code
git reset --hard HEAD~1

# Rebuild with previous version
docker-compose -f docker-compose.prod.yml build --no-cache

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Restore database if needed
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U lottodrop_user -d lottodrop < backups/$(date +%Y%m%d)/database_backup_XXXXXX.sql
```

---

## 📊 Post-Deployment Monitoring

Monitor these metrics for the first hour:
- CPU and memory usage
- Response times
- Error rates in logs
- User activity

```bash
# Monitor all logs
docker-compose -f docker-compose.prod.yml logs -f

# Check resource usage
docker stats

# Monitor nginx access logs
docker-compose -f docker-compose.prod.yml exec frontend tail -f /var/log/nginx/access.log
```

---

## ✅ Deployment Verification Checklist

After deployment, verify:
- [ ] Website loads without errors
- [ ] Users can login/register
- [ ] How To Play page is accessible
- [ ] Navigation shows "How To Play" instead of "Leaderboard"
- [ ] Games can be joined and completed
- [ ] Results page shows masked names (e.g., "Admin U")
- [ ] Mobile experience is smooth
- [ ] WebSocket connections work (real-time updates)

---

## 🆘 Troubleshooting

### Issue: Containers won't start
```bash
# Check logs for specific container
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend

# Check port availability
netstat -tlnp | grep -E '3000|3001|5173'
```

### Issue: Database connection errors
```bash
# Test database connection
docker-compose -f docker-compose.prod.yml exec postgres psql -U lottodrop_user -d lottodrop -c "SELECT 1;"

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres
```

### Issue: Frontend not updating
```bash
# Clear browser cache or append version query
# Force rebuild frontend
docker-compose -f docker-compose.prod.yml build --no-cache frontend
docker-compose -f docker-compose.prod.yml up -d frontend
```

---

## 📞 Support Contact

If you encounter issues during deployment:
1. Check container logs first
2. Verify all environment variables are set
3. Ensure sufficient disk space (df -h)
4. Contact development team with error logs

---

## 🎉 Deployment Complete!

Once all checks pass, your production environment is successfully updated with:
- New How To Play tutorial page
- Improved mobile user experience
- Enhanced privacy with name masking
- Better results data handling

**Estimated Total Deployment Time: 15-30 minutes**

---

*Document Version: 2.0*
*Last Updated: September 18, 2025*
*Next Scheduled Update: TBD*