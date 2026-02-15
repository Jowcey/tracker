# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Security Configuration

\`\`\`bash
# Update .env for production
APP_ENV=production
APP_DEBUG=false

# Generate new application key
php artisan key:generate

# Set secure database password
DB_PASSWORD=your_secure_password_here

# Set production URLs
APP_URL=https://yourdomain.com
VITE_APP_URL=https://yourdomain.com
VITE_REVERB_HOST=ws.yourdomain.com
VITE_REVERB_SCHEME=https
VITE_REVERB_PORT=443
\`\`\`

### 2. Database Setup

\`\`\`bash
# Run migrations
php artisan migrate --force

# DO NOT seed in production (creates test accounts)
# php artisan db:seed
\`\`\`

### 3. Optimize Performance

\`\`\`bash
# Cache configuration
php artisan config:cache

# Cache routes
php artisan route:cache

# Cache views
php artisan view:cache

# Optimize autoloader
composer install --optimize-autoloader --no-dev
\`\`\`

### 4. Build Frontend

\`\`\`bash
# Install production dependencies
npm ci

# Build for production
npm run build
\`\`\`

## Deployment Options

### Option 1: Docker Compose (Recommended)

\`\`\`bash
# 1. Clone repository
git clone <repository-url> /var/www/tracker
cd /var/www/tracker

# 2. Update .env with production settings
cp .env.example .env
nano .env

# 3. Update docker-compose.yml ports (80, 443)
nano docker-compose.yml

# 4. Start services
docker compose up -d

# 5. Install dependencies
docker compose exec app composer install --optimize-autoloader --no-dev
docker compose exec app npm ci
docker compose exec app npm run build

# 6. Run migrations
docker compose exec app php artisan migrate --force

# 7. Cache everything
docker compose exec app php artisan config:cache
docker compose exec app php artisan route:cache
docker compose exec app php artisan view:cache
\`\`\`

### Option 2: Traditional Linux Server

#### Requirements
- Ubuntu 22.04 or later
- PHP 8.3 with extensions (see composer.json)
- MySQL 8.0
- Redis 7
- Node.js 20
- Nginx or Apache
- Supervisor for queue workers

#### Installation Steps

\`\`\`bash
# 1. Install PHP 8.3
sudo add-apt-repository ppa:ondrej/php
sudo apt update
sudo apt install php8.3 php8.3-{cli,fpm,mysql,redis,mbstring,xml,curl,zip,gd,bcmath,intl}

# 2. Install MySQL
sudo apt install mysql-server
sudo mysql_secure_installation

# 3. Install Redis
sudo apt install redis-server
sudo systemctl enable redis-server

# 4. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs

# 5. Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# 6. Clone and setup application
cd /var/www
git clone <repository-url> tracker
cd tracker
composer install --optimize-autoloader --no-dev
npm ci
npm run build

# 7. Set permissions
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache

# 8. Configure database
mysql -u root -p
CREATE DATABASE tracker;
CREATE USER 'tracker_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON tracker.* TO 'tracker_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# 9. Run migrations
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
\`\`\`

#### Nginx Configuration

\`\`\`nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com;
    root /var/www/tracker/public;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \\.php\$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\\.(?!well-known).* {
        deny all;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}

# WebSocket server (Reverb)
server {
    listen 443 ssl http2;
    server_name ws.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
\`\`\`

#### Supervisor Configuration for Queue Workers

\`\`\`ini
# /etc/supervisor/conf.d/tracker-worker.conf
[program:tracker-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/tracker/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=3
redirect_stderr=true
stdout_logfile=/var/www/tracker/storage/logs/worker.log
stopwaitsecs=3600

# Reverb WebSocket Server
[program:tracker-reverb]
command=php /var/www/tracker/artisan reverb:start
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/www/tracker/storage/logs/reverb.log
\`\`\`

\`\`\`bash
# Load supervisor configuration
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start tracker-worker:*
sudo supervisorctl start tracker-reverb
\`\`\`

## SSL Certificate (Let's Encrypt)

\`\`\`bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d ws.yourdomain.com

# Auto-renewal is configured by default
sudo certbot renew --dry-run
\`\`\`

## Monitoring

### Laravel Telescope (Optional)

\`\`\`bash
composer require laravel/telescope
php artisan telescope:install
php artisan migrate

# Protect with authentication
# Add to routes/web.php:
Telescope::auth(function (\$request) {
    return auth()->check() && auth()->user()->hasRole('owner');
});
\`\`\`

### Log Monitoring

\`\`\`bash
# View Laravel logs
tail -f storage/logs/laravel.log

# View queue worker logs
tail -f storage/logs/worker.log

# View Reverb logs
tail -f storage/logs/reverb.log

# View nginx error logs
tail -f /var/log/nginx/error.log
\`\`\`

## Backup Strategy

### Automated Database Backup

\`\`\`bash
# Create backup script
sudo nano /usr/local/bin/tracker-backup.sh
\`\`\`

\`\`\`bash
#!/bin/bash
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/tracker"
mkdir -p \$BACKUP_DIR

# Database backup
mysqldump -u tracker_user -pPASSWORD tracker | gzip > \$BACKUP_DIR/db_\$TIMESTAMP.sql.gz

# Keep only last 30 days
find \$BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: \$TIMESTAMP"
\`\`\`

\`\`\`bash
# Make executable
sudo chmod +x /usr/local/bin/tracker-backup.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
0 2 * * * /usr/local/bin/tracker-backup.sh >> /var/log/tracker-backup.log 2>&1
\`\`\`

## Scaling

### Horizontal Scaling

\`\`\`bash
# 1. Use external MySQL (AWS RDS, DigitalOcean Managed DB)
# 2. Use external Redis (AWS ElastiCache, Redis Cloud)
# 3. Deploy multiple app instances behind load balancer
# 4. Use CDN for static assets (CloudFlare, AWS CloudFront)
# 5. Separate queue workers on dedicated servers
\`\`\`

### Load Balancer (Nginx)

\`\`\`nginx
upstream tracker_backend {
    least_conn;
    server app1.internal:8888;
    server app2.internal:8888;
    server app3.internal:8888;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location / {
        proxy_pass http://tracker_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
\`\`\`

## Troubleshooting

### Clear all caches
\`\`\`bash
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
\`\`\`

### Permission issues
\`\`\`bash
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
\`\`\`

### Queue not processing
\`\`\`bash
# Restart workers
sudo supervisorctl restart tracker-worker:*

# Check logs
tail -f storage/logs/worker.log
\`\`\`

### High memory usage
\`\`\`bash
# Optimize
php artisan optimize
composer dump-autoload --optimize

# Check queue memory limit in config/queue.php
'memory' => 512, // Increase if needed
\`\`\`

---

For additional help, refer to:
- [Laravel Deployment Docs](https://laravel.com/docs/deployment)
- [Laravel Forge](https://forge.laravel.com/) - Managed deployment
- [Envoyer](https://envoyer.io/) - Zero-downtime deployment
