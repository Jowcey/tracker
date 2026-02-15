# Vehicle Tracking System

A comprehensive real-time vehicle tracking system built with Laravel 12, React, and MapLibre GL. Track multiple vehicles and people across organizations with live GPS updates, trip calculations, and multi-language support.

## 🚀 Features

### Core Functionality
- **Real-time GPS Tracking**: Live vehicle location updates via WebSocket (Laravel Reverb)
- **Interactive Maps**: MapLibre GL with CARTO free tiles (no API key required)
- **Trip Calculation**: Automatic trip detection with stop analysis (Haversine distance)
- **Multi-tenancy**: Support for multiple organizations with role-based permissions
- **Multi-language**: English, Spanish, French, and German translations
- **Responsive Design**: Works on desktop and mobile devices

### Organization Management
- **Role-based Access Control**: Owner, Admin, Manager, and Viewer roles
- **Organization Switching**: Users can belong to multiple organizations
- **User Management**: Add/remove users, assign roles within organizations

### Technical Features
- **RESTful API**: Comprehensive Laravel API with 15+ endpoints
- **Real-time Broadcasting**: Sub-2ms latency WebSocket updates
- **Background Jobs**: Queue-based trip calculation
- **Authentication**: Laravel Sanctum token-based auth
- **TypeScript**: Full type safety on frontend

## 📋 Requirements

- Docker & Docker Compose
- Git
- 4GB RAM minimum
- Ports available: 8888, 13306, 16379, 18080, 1025, 8025

## 🛠️ Installation

### 1. Clone the repository

\`\`\`bash
git clone <repository-url>
cd tracker
\`\`\`

### 2. Start Docker services

\`\`\`bash
docker compose up -d
\`\`\`

This starts 6 services:
- **app** (Laravel + React) - http://localhost:8888
- **db** (MySQL 8.0) - localhost:13306
- **redis** (Redis 7) - localhost:16379
- **reverb** (WebSocket server) - localhost:18080
- **queue** (Laravel queue worker)
- **mailhog** (Email testing) - http://localhost:8025

### 3. Install dependencies

\`\`\`bash
# Install PHP dependencies
docker compose exec app composer install

# Install Node.js dependencies
docker compose exec app npm install
\`\`\`

### 4. Set up environment

\`\`\`bash
# Generate application key
docker compose exec app php artisan key:generate
\`\`\`

### 5. Run database migrations

\`\`\`bash
# Create database tables
docker compose exec app php artisan migrate

# Seed with test data
docker compose exec app php artisan db:seed
\`\`\`

### 6. Build frontend assets

\`\`\`bash
docker compose exec app npm run build
\`\`\`

### 7. Access the application

Open http://localhost:8888 in your browser.

**Test credentials:**
- Email: \`admin@tracker.local\`
- Password: \`password\`

## 🗄️ Database Schema

### Tables
- **organizations** - Multi-tenant organizations
- **users** - User accounts
- **organization_user** - Pivot table with roles
- **vehicles** - Tracked vehicles
- **trackers** - GPS tracking devices
- **locations** - GPS location points
- **trips** - Calculated trips with start/end
- **geofences** - Geographic boundaries (future)

### Roles
- **owner** - Full control including deletion
- **admin** - Manage users and vehicles
- **manager** - View and edit vehicles
- **viewer** - Read-only access

## 🔌 API Endpoints

### Authentication
\`\`\`
POST   /api/register          Register new account
POST   /api/login             Login with credentials
POST   /api/logout            Logout current user
GET    /api/me                Get authenticated user
\`\`\`

### Organizations
\`\`\`
GET    /api/organizations                 List user's organizations
POST   /api/organizations                 Create organization
GET    /api/organizations/{id}            Get organization details
PUT    /api/organizations/{id}            Update organization
DELETE /api/organizations/{id}            Delete organization
GET    /api/organizations/{id}/users      List organization users
POST   /api/organizations/{id}/users      Add user to organization
\`\`\`

### Vehicles (Organization-scoped)
\`\`\`
GET    /api/organizations/{id}/vehicles           List vehicles
POST   /api/organizations/{id}/vehicles           Create vehicle
GET    /api/organizations/{id}/vehicles/{vid}     Get vehicle details
PUT    /api/organizations/{id}/vehicles/{vid}     Update vehicle
DELETE /api/organizations/{id}/vehicles/{vid}     Delete vehicle
\`\`\`

### Locations
\`\`\`
GET    /api/organizations/{id}/locations          Query locations
POST   /api/tracker/location                      Device GPS ingestion
\`\`\`

### Trips
\`\`\`
GET    /api/organizations/{id}/trips              List trips
GET    /api/organizations/{id}/trips/{tid}        Get trip details
POST   /api/organizations/{id}/trips/calculate    Calculate trips
\`\`\`

### WebSocket Channel
\`\`\`
organization.{organizationId}.locations    Real-time location updates
\`\`\`

## 🚗 GPS Device Integration

Send GPS data from devices to the ingestion endpoint:

\`\`\`bash
curl -X POST http://localhost:8888/api/tracker/location \\
  -H "Content-Type: application/json" \\
  -d '{
    "tracker_id": "DEVICE-001",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "speed": 45.5,
    "heading": 180,
    "recorded_at": "2026-02-15T00:00:00Z"
  }'
\`\`\`

**Rate limiting:** 60 requests per minute per tracker.

**Broadcast throttling:** Updates broadcast every 5 seconds OR 10 meters movement.

## 🔧 Development

### Run tests

\`\`\`bash
# PHP tests
docker compose exec app php artisan test

# Run specific test
docker compose exec app php artisan test --filter=VehicleApiTest
\`\`\`

### Watch frontend changes

\`\`\`bash
docker compose exec app npm run dev
\`\`\`

### Calculate trips manually

\`\`\`bash
# Calculate all trips
docker compose exec app php artisan app:calculate-trips

# Calculate for specific vehicle
docker compose exec app php artisan app:calculate-trips --vehicle=1

# Calculate date range
docker compose exec app php artisan app:calculate-trips --start="2026-02-01" --end="2026-02-15"
\`\`\`

### Queue monitoring

\`\`\`bash
# View queue logs
docker compose logs -f queue

# Restart queue worker
docker compose restart queue
\`\`\`

### Database access

\`\`\`bash
# MySQL CLI
docker compose exec db mysql -u tracker -ppassword tracker

# Laravel Tinker
docker compose exec app php artisan tinker
\`\`\`

## 🌍 Internationalization

### Supported Languages
- 🇬🇧 English (en)
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)

## 🧪 Trip Calculation

### Algorithm
Trips are calculated using a state machine that analyzes GPS locations:

**Constants:**
- \`MIN_STOP_DURATION\` = 180 seconds (3 minutes)
- \`MIN_MOVING_SPEED\` = 5 km/h
- \`MAX_TRIP_GAP\` = 3600 seconds (1 hour)

**Process:**
1. Sort locations by recorded timestamp
2. Calculate speed and distance between points (Haversine formula)
3. Identify moving vs stopped segments
4. Group continuous movements into trips
5. Record trip statistics (distance, duration, avg speed)

## 📊 Architecture

### Backend Stack
- **Laravel 12** - PHP framework
- **MySQL 8.0** - Relational database
- **Redis 7** - Cache and queue
- **Laravel Reverb** - WebSocket server
- **Sanctum** - API authentication

### Frontend Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite 7** - Build tool
- **Tailwind CSS 4** - Styling
- **MapLibre GL** - Interactive maps
- **react-i18next** - Internationalization
- **react-hot-toast** - Notifications

## 🔐 Security

### Implemented
- ✅ CSRF protection (Laravel default)
- ✅ SQL injection prevention (Eloquent ORM)
- ✅ XSS prevention (React escaping)
- ✅ Rate limiting on device endpoints
- ✅ Token-based authentication
- ✅ Role-based authorization
- ✅ Password hashing (bcrypt)

## 🐛 Troubleshooting

### Port already in use
\`\`\`bash
# Change ports in docker-compose.yml
# Default ports: 8888, 13306, 16379, 18080, 1025, 8025
\`\`\`

### Permission errors
\`\`\`bash
# Fix storage permissions
docker compose exec app chmod -R 777 storage bootstrap/cache
\`\`\`

### Queue not processing
\`\`\`bash
# Restart queue worker
docker compose restart queue

# Check logs
docker compose logs queue
\`\`\`

### WebSocket connection failed
\`\`\`bash
# Verify Reverb is running
docker compose ps reverb

# Check Reverb logs
docker compose logs reverb

# Verify .env settings
VITE_REVERB_HOST="localhost"
VITE_REVERB_PORT=18080
\`\`\`

---

**Made with ❤️ using Laravel, React, and MapLibre GL**
