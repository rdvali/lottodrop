# 🚀 LottoDrop GitHub Automated Deployment Guide

## 📋 Complete CI/CD Setup for lottodrop.net

This guide provides step-by-step instructions for setting up automated deployment from GitHub to your production server.

---

## 🎯 **Action Plan Summary**

Based on consultation with our deployment experts, here's the complete action plan:

### **Phase 1: Initial Setup (Day 1-2)**
1. ✅ GitHub Actions workflow created
2. ✅ Server setup script prepared
3. ✅ Backup and rollback mechanisms ready
4. ✅ Docker compose configurations optimized

### **Phase 2: Server Preparation (Day 3-4)**
1. Server provisioning and initial setup
2. Security hardening
3. SSL certificate configuration
4. Initial data migration

### **Phase 3: GitHub Integration (Day 5-6)**
1. Repository secrets configuration
2. Workflow testing
3. Deployment verification
4. Monitoring setup

---

## 📦 **What Gets Deployed vs What Stays Protected**

### **✅ Files That Get Deployed (From GitHub)**
```
✓ backend/src/          - Application source code
✓ frontend/src/         - Frontend source code
✓ frontend-admin/src/   - Admin panel source
✓ package.json files    - Dependencies
✓ Dockerfiles          - Build configurations
✓ migrations/          - Database migrations
✓ docker-compose.prod.yml - Service definitions
✓ Deployment scripts   - Automation tools
```

### **🔒 Files Protected on Server (Never Overwritten)**
```
✗ .env                 - Environment variables
✗ backend/.env         - Backend secrets
✗ postgres_data/       - Database data
✗ redis_data/          - Cache data
✗ backend/uploads/     - User uploaded files
✗ SSL certificates     - Let's Encrypt certs
✗ nginx.conf          - Server configuration
✗ backups/            - Backup files
✗ logs/               - Application logs
```

---

## 🔧 **Step 1: Initial Server Setup**

### **1.1 Provision Ubuntu Server**
```bash
# Minimum Requirements:
- Ubuntu 22.04 LTS
- 4GB RAM
- 2 vCPU
- 80GB SSD
- Public IP address
```

### **1.2 Run Initial Setup Script**
```bash
# SSH into your server
ssh root@your-server-ip

# Download and run setup script
wget https://raw.githubusercontent.com/yourusername/lottodrop/main/scripts/initial-setup.sh
chmod +x initial-setup.sh
./initial-setup.sh
```

### **1.3 Configure Environment**
```bash
cd /var/www/lottodrop

# Copy environment template
cp .env.template .env

# Generate secure secrets
openssl rand -base64 64  # For JWT_SECRET
openssl rand -base64 32  # For SESSION_SECRET
openssl rand -base64 32  # For DB_PASSWORD
openssl rand -base64 32  # For REDIS_PASSWORD

# Edit .env with your values
nano .env
```

---

## 🔑 **Step 2: GitHub Repository Setup**

### **2.1 Create GitHub Secrets**

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `PRODUCTION_HOST` | `your-server-ip` | Server IP or domain |
| `PRODUCTION_USER` | `deploy` | Server SSH username |
| `PRODUCTION_SSH_KEY` | `-----BEGIN RSA...` | Private SSH key |
| `PRODUCTION_PORT` | `22` | SSH port (optional) |
| `SLACK_WEBHOOK` | `https://hooks.slack...` | Slack notifications (optional) |

### **2.2 Generate SSH Key for Deployment**
```bash
# On your LOCAL machine
ssh-keygen -t rsa -b 4096 -f ~/.ssh/lottodrop_deploy -N ""

# Copy public key to server
ssh-copy-id -i ~/.ssh/lottodrop_deploy.pub deploy@your-server-ip

# Add private key to GitHub secrets
cat ~/.ssh/lottodrop_deploy
# Copy this entire content to PRODUCTION_SSH_KEY secret
```

### **2.3 Configure Branch Protection**
```bash
# In GitHub repository settings:
1. Go to Settings → Branches
2. Add rule for 'main' branch
3. Enable:
   - Require pull request reviews
   - Require status checks to pass
   - Include administrators
```

---

## 📤 **Step 3: Initial Deployment**

### **3.1 Transfer Initial Database**
```bash
# Export local database
docker-compose exec postgres pg_dump -U lottodrop_user lottodrop > local_backup.sql

# Transfer to server
scp local_backup.sql deploy@your-server-ip:/tmp/

# On server, import database
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U lottodrop_user lottodrop < /tmp/local_backup.sql
```

### **3.2 First Manual Deployment**
```bash
# Clone repository on server
cd /var/www/lottodrop
git clone https://github.com/yourusername/lottodrop.git .

# Copy production configs
cp /path/to/.env.production .env
cp .env backend/.env

# Deploy
./deploy.sh
```

### **3.3 Setup SSL Certificate**
```bash
sudo certbot --nginx -d lottodrop.net -d www.lottodrop.net
```

---

## 🔄 **Step 4: Automated Deployment Workflow**

### **How It Works:**

1. **Push to main branch** → Triggers GitHub Action
2. **Security scan** → Checks for vulnerabilities
3. **Build & test** → Compiles code and runs tests
4. **Backup production** → Creates backup before deployment
5. **Deploy** → Updates code while preserving data
6. **Health check** → Verifies deployment success
7. **Notify** → Sends status to Slack/email

### **Deployment Flow:**
```yaml
Developer pushes code
        ↓
GitHub Actions triggered
        ↓
Security & quality checks
        ↓
Build Docker images
        ↓
Backup current production
        ↓
Transfer new code (rsync)
        ↓
Preserve configs & data
        ↓
Rolling update (zero downtime)
        ↓
Health verification
        ↓
Success notification
```

---

## 🛡️ **Step 5: Security & Protection**

### **5.1 Files Never Synced**
The deployment uses `rsync` with exclusions:
```bash
--exclude='.env'
--exclude='backend/.env'
--exclude='backend/uploads'
--exclude='postgres_data'
--exclude='redis_data'
--exclude='backups'
--exclude='*.log'
--exclude='node_modules'
```

### **5.2 Automatic Backups**
```bash
# Setup automated backups
crontab -e

# Add these lines:
0 2 * * * /var/www/lottodrop/scripts/automated-backup.sh
0 */6 * * * /var/www/lottodrop/monitor.sh
```

### **5.3 Rollback Capability**
```bash
# Manual rollback if needed
cd /var/www/lottodrop
./restore.sh 20250912_120000  # Use backup timestamp
```

---

## 📊 **Step 6: Monitoring**

### **6.1 Health Checks**
- Backend: `https://lottodrop.net/api/health`
- Frontend: `https://lottodrop.net/`
- Admin: `https://lottodrop.net/admin`

### **6.2 Monitoring Commands**
```bash
# Check all services
./monitor.sh

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check container status
docker ps

# System resources
htop
```

---

## 🚨 **Troubleshooting**

### **Deployment Failed**
```bash
# Check GitHub Actions logs
# On server:
cd /var/www/lottodrop
docker-compose -f docker-compose.prod.yml logs
./monitor.sh
```

### **Rollback Deployment**
```bash
# Trigger rollback from GitHub Actions
# Or manually on server:
./restore.sh $(ls -t /var/backups/lottodrop/db_backup_*.sql.gz | head -1 | sed 's/.*db_backup_//;s/.sql.gz//')
```

### **Database Issues**
```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql -U lottodrop_user -d lottodrop

# Check connections
SELECT * FROM pg_stat_activity;
```

---

## 📝 **Deployment Checklist**

### **Before First Deployment:**
- [ ] Server provisioned and accessible
- [ ] Domain DNS pointing to server
- [ ] GitHub secrets configured
- [ ] SSH keys set up
- [ ] Initial setup script run
- [ ] Environment variables configured
- [ ] SSL certificate obtained

### **For Each Deployment:**
- [ ] Code reviewed and tested locally
- [ ] Pushed to main branch
- [ ] GitHub Actions running
- [ ] Deployment successful
- [ ] Health checks passing
- [ ] No errors in logs

---

## 🎯 **Best Practices**

1. **Always test locally first**
   ```bash
   docker-compose up
   npm test
   ```

2. **Use feature branches**
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git push origin feature/new-feature
   # Create PR to main
   ```

3. **Monitor after deployment**
   ```bash
   # Watch logs for 5 minutes after deployment
   docker-compose -f docker-compose.prod.yml logs -f
   ```

4. **Keep backups**
   - Daily automated backups
   - Before major updates
   - Test restore procedure monthly

---

## 📞 **Support & Maintenance**

### **Regular Maintenance Tasks:**
```bash
# Weekly
- Review logs for errors
- Check disk space
- Verify backups

# Monthly
- Update system packages
- Review security logs
- Test restore procedure
- Update dependencies

# Quarterly
- Security audit
- Performance review
- Capacity planning
```

### **Emergency Procedures:**
1. **Site Down**: Check `./monitor.sh`, restart services
2. **Data Loss**: Restore from latest backup
3. **Security Breach**: Disable access, restore from clean backup
4. **Performance Issues**: Scale resources, optimize queries

---

## 🔗 **Quick Commands Reference**

```bash
# Deploy
git push origin main

# Manual deploy
./deploy.sh

# Backup
./backup.sh

# Restore
./restore.sh [timestamp]

# Monitor
./monitor.sh

# Logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart
docker-compose -f docker-compose.prod.yml restart

# Stop
docker-compose -f docker-compose.prod.yml down

# Start
docker-compose -f docker-compose.prod.yml up -d
```

---

## ✅ **Success Criteria**

Your deployment is successful when:
- ✅ Push to GitHub automatically deploys to production
- ✅ Zero downtime during deployments
- ✅ Database and uploads preserved
- ✅ Automatic backups running
- ✅ SSL certificate active
- ✅ Monitoring alerts working
- ✅ Rollback tested and working

---

**Version**: 1.0.0  
**Last Updated**: September 2025  
**Domain**: lottodrop.net