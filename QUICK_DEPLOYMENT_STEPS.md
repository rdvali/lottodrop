# LottoDrop - Quick Deployment Steps for Ubuntu Server

## 🚀 Quick Start (5 Steps)

### Step 1: Prepare Your Ubuntu Server
```bash
# Connect to your server
ssh your_user@your_server_ip

# Download and run quick setup script
wget https://raw.githubusercontent.com/your-repo/lottodrop/main/quick-deploy.sh
chmod +x quick-deploy.sh
./quick-deploy.sh
```

### Step 2: Transfer Project Files
```bash
# From your LOCAL machine (Mac/Windows/Linux)
cd /Users/rd/Documents/Projects/LottoDrop
scp -r * your_user@your_server_ip:/var/www/lottodrop/
```

### Step 3: Configure Environment
```bash
# On your SERVER
cd /var/www/lottodrop
nano .env  # Edit with your production values

# Key variables to update:
# - DB_PASSWORD (use strong password)
# - REDIS_PASSWORD (use strong password)
# - JWT_SECRET (generate with: openssl rand -base64 64)
# - ADMIN_PASSWORD (your admin password)
# - Domain URLs (replace localhost with your domain)
```

### Step 4: Deploy Application
```bash
# On your SERVER
cd /var/www/lottodrop
./deploy.sh
```

### Step 5: Setup SSL Certificate
```bash
# On your SERVER
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## ✅ That's it! Your app is live!

---

## 📋 Complete Manual Steps (if not using quick-deploy.sh)

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git vim htop docker.io docker-compose nginx certbot python3-certbot-nginx

# Configure firewall
sudo ufw allow 22,80,443/tcp
sudo ufw --force enable
```

### 2. Install Docker & Docker Compose
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Setup Project
```bash
# Create directory
sudo mkdir -p /var/www/lottodrop
sudo chown -R $USER:$USER /var/www/lottodrop

# Transfer files (from LOCAL machine)
scp -r /Users/rd/Documents/Projects/LottoDrop/* user@server:/var/www/lottodrop/

# Or clone from git
cd /var/www/lottodrop
git clone https://github.com/your-repo/lottodrop.git .
```

### 4. Configure Production Environment
```bash
cd /var/www/lottodrop
cp .env.example .env
nano .env

# Generate secrets
openssl rand -base64 64  # For JWT_SECRET
openssl rand -base64 32  # For SESSION_SECRET
openssl rand -base64 32  # For passwords
```

### 5. Setup Nginx
```bash
# Create site config
sudo nano /etc/nginx/sites-available/lottodrop

# Add configuration (see full config in DEPLOYMENT_GUIDE.md)

# Enable site
sudo ln -s /etc/nginx/sites-available/lottodrop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Deploy with Docker
```bash
cd /var/www/lottodrop
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Initialize database
docker-compose -f docker-compose.prod.yml exec postgres psql -U lottodrop_user -d lottodrop < backend/migrations/complete_schema.sql
```

### 7. Get SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🔧 Useful Commands

### Service Management
```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop services
docker-compose -f docker-compose.prod.yml down

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

### Monitoring
```bash
# Check health
./monitor.sh

# View container status
docker-compose -f docker-compose.prod.yml ps

# Check API health
curl http://localhost:3001/health
```

### Backup & Restore
```bash
# Create backup
./backup.sh

# Restore from backup
./restore.sh 20250912_120000  # Use your backup date

# Setup automated daily backups
crontab -e
# Add: 0 2 * * * /var/www/lottodrop/backup.sh
```

---

## 🔒 Security Checklist

- [ ] Changed all default passwords in .env
- [ ] SSL certificate installed and auto-renewing
- [ ] Firewall configured (only 22, 80, 443 open)
- [ ] SSH key authentication enabled
- [ ] Password authentication disabled for SSH
- [ ] Regular backups configured
- [ ] Monitoring script in crontab
- [ ] Docker logging limits set
- [ ] Fail2ban installed

---

## 🆘 Troubleshooting

### Backend not starting
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Check database connection
docker-compose -f docker-compose.prod.yml exec backend env | grep DB_

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

### Database issues
```bash
# Check PostgreSQL logs
docker-compose -f docker-compose.prod.yml logs postgres

# Connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql -U lottodrop_user -d lottodrop

# Reset admin password
UPDATE users SET password_hash = '$2b$10$...' WHERE email = 'admin@lottodrop.com';
```

### Port conflicts
```bash
# Find what's using a port
sudo lsof -i :3001

# Kill process
sudo kill -9 <PID>
```

### SSL certificate issues
```bash
# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

---

## 📞 Support

### Access URLs
- **Main App**: https://yourdomain.com
- **Admin Panel**: https://yourdomain.com/admin
- **API Health**: https://yourdomain.com/api/health

### Default Admin Credentials
- **Email**: admin@yourdomain.com
- **Password**: (set in .env file)

### Server Requirements
- Ubuntu 20.04/22.04 LTS
- 2GB RAM minimum (4GB recommended)
- 20GB storage
- Domain name with DNS pointing to server

---

## 📝 Notes

1. **Always backup before updates**
2. **Test changes in development first**
3. **Monitor disk space regularly**
4. **Keep Ubuntu and Docker updated**
5. **Review logs weekly for security issues**

---

*Quick deployment typically takes 15-30 minutes*
*Full manual setup takes 30-60 minutes*

**Need help?** Check the full [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.