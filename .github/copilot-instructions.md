# Vehicle/People Tracking System - Copilot Instructions

## Project Overview

Real-time tracking system for vehicles and people with GPS trackers. Supports multiple organizations (tenants) with granular user permissions and multi-language support.

**Stack:**
- Backend: Laravel (PHP)
- Frontend: React + Tailwind CSS
- Database: (To be determined - likely MySQL/PostgreSQL)
- Real-time: (To be determined - likely Laravel WebSockets/Pusher or Laravel Reverb)
- Maps: MapCN (MapLibre GL + shadcn/ui components)

## Commands

### Docker Compose

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f
docker compose logs -f app  # Specific service

# Stop all services
docker compose down

# Rebuild after changes
docker compose up -d --build

# Run artisan commands
docker compose exec app php artisan migrate
docker compose exec app php artisan tinker

# Run npm commands
docker compose exec app npm run dev
docker compose exec app npm run build

# Access bash in container
docker compose exec app bash

# Fresh install
docker compose exec app composer install
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate:fresh --seed
```

### Backend (Laravel)
```bash
# Install dependencies
composer install

# Run migrations
php artisan migrate

# Seed database
php artisan db:seed

# Start development server
php artisan serve

# Run tests
php artisan test
php artisan test --filter TestName  # Single test

# Clear caches
php artisan config:clear && php artisan cache:clear && php artisan route:clear

# Generate model with migration and factory
php artisan make:model ModelName -mf

# Create policy
php artisan make:policy ModelNamePolicy --model=ModelName
```

### Frontend (React)
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
npm test -- ComponentName.test.jsx  # Single test

# Lint
npm run lint
```

### Real-Time (WebSockets)

**Laravel Reverb (Recommended):**
```bash
# Install Reverb
php artisan install:broadcasting

# Start Reverb server
php artisan reverb:start

# Run in production with supervisor
php artisan reverb:start --host=0.0.0.0 --port=8080
```

**Alternative - Pusher:**
```bash
# Install Pusher PHP SDK
composer require pusher/pusher-php-server

# Configure in .env
BROADCAST_DRIVER=pusher
```

**Alternative - Laravel WebSockets:**
```bash
# Install package
composer require beyondcode/laravel-websockets

# Publish config and run migrations
php artisan vendor:publish --provider="BeyondCode\LaravelWebSockets\WebSocketsServiceProvider"
php artisan migrate

# Start WebSocket server
php artisan websockets:serve
```

## Real-Time Setup (Laravel Broadcasting)

### Docker Compose Services

The application uses the following services:
- **app** - Laravel application (PHP-FPM + Nginx)
- **db** - MySQL 8.0
- **redis** - Redis for caching and queue backend
- **reverb** - Laravel Reverb WebSocket server
- **queue** - Laravel queue worker
- **node** - Node.js for asset compilation (development only)

All services communicate via Docker network. Reverb exposed on port 8080, app on port 80.

### Option 1: Laravel Reverb (Recommended)

**Laravel Reverb** is the official first-party WebSocket server (Laravel 11+). It's fast, scalable, and requires no external services.

**Installation:**
```bash
php artisan install:broadcasting
```

This will:
- Install `laravel/reverb` package
- Create `config/reverb.php`
- Add Reverb variables to `.env`
- Set up broadcasting routes

**Configuration (.env):**
```env
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=your-app-id
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST=reverb  # Docker service name
REVERB_PORT=8080
REVERB_SCHEME=http

# Frontend connection (host-accessible)
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="localhost"  # Or your domain
VITE_REVERB_PORT="8080"
VITE_REVERB_SCHEME="http"
```

**In Docker Compose:**
- Reverb runs as separate service
- Exposed on port 8080 for browser WebSocket connections
- Communicates with app container via internal network

### Option 2: Pusher

**Pros**: Managed service, no server maintenance, free tier available  
**Cons**: Costs scale with connections, external dependency

```bash
composer require pusher/pusher-php-server
```

**.env:**
```env
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=your-app-id
PUSHER_APP_KEY=your-app-key
PUSHER_APP_SECRET=your-app-secret
PUSHER_APP_CLUSTER=mt1

VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
```

### Option 3: Laravel WebSockets

**Pros**: Self-hosted, Pusher-compatible API, no external costs  
**Cons**: Requires separate process, less maintained than Reverb

```bash
composer require beyondcode/laravel-websockets
php artisan vendor:publish --provider="BeyondCode\LaravelWebSockets\WebSocketsServiceProvider"
php artisan migrate
php artisan websockets:serve
```

### Broadcasting Events

**Create location update event:**
```bash
php artisan make:event LocationUpdated
```

**app/Events/LocationUpdated.php:**
```php
<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LocationUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $trackerId,
        public int $organizationId,
        public float $latitude,
        public float $longitude,
        public ?float $heading,
        public ?float $speed,
        public string $recordedAt
    ) {}

    public function broadcastOn(): Channel
    {
        // Organization-specific private channel
        return new Channel("organization.{$this->organizationId}.locations");
    }

    public function broadcastAs(): string
    {
        return 'location.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'tracker_id' => $this->trackerId,
            'lat' => $this->latitude,
            'lng' => $this->longitude,
            'heading' => $this->heading,
            'speed' => $this->speed,
            'recorded_at' => $this->recordedAt,
        ];
    }
}
```

**Dispatch event after saving location:**
```php
// In your LocationController@store or TrackerLocationService
$location = Location::create([
    'tracker_id' => $request->tracker_id,
    'organization_id' => $organization->id,
    'latitude' => $request->latitude,
    'longitude' => $request->longitude,
    'heading' => $request->heading,
    'speed' => $request->speed,
    'recorded_at' => now(),
]);

broadcast(new LocationUpdated(
    trackerId: $location->tracker_id,
    organizationId: $location->organization_id,
    latitude: $location->latitude,
    longitude: $location->longitude,
    heading: $location->heading,
    speed: $location->speed,
    recordedAt: $location->recorded_at->toISOString()
))->toOthers();
```

### Channel Authorization

**routes/channels.php:**
```php
<?php

use Illuminate\Support\Facades\Broadcast;

// Organization channel - only members can listen
Broadcast::channel('organization.{organizationId}.locations', function ($user, $organizationId) {
    return $user->organizations()->where('id', $organizationId)->exists();
});

// Vehicle-specific channel
Broadcast::channel('vehicle.{vehicleId}', function ($user, $vehicleId) {
    $vehicle = \App\Models\Vehicle::find($vehicleId);
    return $vehicle && $user->organizations()->where('id', $vehicle->organization_id)->exists();
});
```

### Frontend Integration (React)

**Install Laravel Echo:**
```bash
npm install --save laravel-echo pusher-js
```

**resources/js/echo.js:**
```javascript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    
    // For Pusher:
    // broadcaster: 'pusher',
    // key: import.meta.env.VITE_PUSHER_APP_KEY,
    // cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
});

export default window.Echo;
```

**Import in main app:**
```javascript
// resources/js/app.jsx
import './echo';
```

**Custom React hook for location updates:**
```javascript
// resources/js/hooks/useLocationUpdates.js
import { useEffect, useState } from 'react';
import Echo from '@/echo';

export function useLocationUpdates(organizationId) {
    const [locations, setLocations] = useState({});

    useEffect(() => {
        if (!organizationId) return;

        const channel = Echo.channel(`organization.${organizationId}.locations`);

        channel.listen('.location.updated', (event) => {
            setLocations(prev => ({
                ...prev,
                [event.tracker_id]: {
                    lat: event.lat,
                    lng: event.lng,
                    heading: event.heading,
                    speed: event.speed,
                    recorded_at: event.recorded_at,
                }
            }));
        });

        return () => {
            Echo.leave(`organization.${organizationId}.locations`);
        };
    }, [organizationId]);

    return locations;
}
```

**Usage in component:**
```jsx
// resources/js/features/tracking/LiveMap.jsx
import { useLocationUpdates } from '@/hooks/useLocationUpdates';

export function LiveMap({ organizationId, initialVehicles }) {
    const [vehicles, setVehicles] = useState(initialVehicles);
    const locationUpdates = useLocationUpdates(organizationId);

    // Merge real-time updates with vehicle data
    useEffect(() => {
        setVehicles(prev => prev.map(vehicle => {
            const update = locationUpdates[vehicle.tracker_id];
            return update ? { ...vehicle, ...update } : vehicle;
        }));
    }, [locationUpdates]);

    return (
        <Map>
            <VehicleLayer vehicles={vehicles} />
        </Map>
    );
}
```

### Performance Optimization

**Throttle broadcasts** - Don't broadcast every single GPS point:
```php
use Illuminate\Support\Facades\Cache;

// Only broadcast if location changed significantly or 5+ seconds passed
$cacheKey = "last_broadcast.tracker.{$trackerId}";
$lastBroadcast = Cache::get($cacheKey);

$shouldBroadcast = !$lastBroadcast || 
    $location->created_at->diffInSeconds($lastBroadcast['time']) >= 5 ||
    $this->distanceInMeters($lastBroadcast['coords'], [$latitude, $longitude]) > 10;

if ($shouldBroadcast) {
    broadcast(new LocationUpdated(...));
    Cache::put($cacheKey, [
        'time' => now(),
        'coords' => [$latitude, $longitude]
    ], 60);
}
```

**Use queues for broadcasts** - Add `ShouldBroadcastNow` instead of `ShouldBroadcast` only for critical real-time updates:
```php
// High priority - broadcast immediately
class LocationUpdated implements ShouldBroadcastNow { ... }

// Low priority - can be queued
class TripCompleted implements ShouldBroadcast { ... }
```

### Testing WebSockets

**Test events are broadcast:**
```php
use Illuminate\Support\Facades\Event;

public function test_location_update_broadcasts_event()
{
    Event::fake([LocationUpdated::class]);

    $this->postJson('/api/v1/locations', [
        'tracker_id' => 123,
        'latitude' => 40.7128,
        'longitude' => -74.0060,
    ]);

    Event::assertDispatched(LocationUpdated::class);
}
```

**Test channel authorization:**
```php
public function test_user_can_access_own_organization_channel()
{
    $user = User::factory()->create();
    $org = Organization::factory()->create();
    $user->organizations()->attach($org);

    $this->actingAs($user)
        ->postJson("/broadcasting/auth", [
            'channel_name' => "organization.{$org->id}.locations",
        ])
        ->assertSuccessful();
}
```

## Architecture

### Multi-Tenancy Pattern

This system uses **organization-based tenancy** where:
- Each `Organization` is a separate tenant
- Users belong to one or more organizations
- All tracking data (vehicles, trackers, locations) is scoped to organizations
- Foreign keys include `organization_id` for data isolation

**Key Models:**
- `Organization` - Tenant container
- `User` - Can belong to multiple organizations via pivot table
- `Vehicle` - Belongs to organization
- `Tracker` - GPS device assigned to vehicle/person
- `Location` - GPS coordinates with timestamp
- `Trip` - Calculated journey with stops and durations

### Real-Time Architecture

Location updates flow:
1. Tracker device sends GPS coordinates to API endpoint
2. Backend validates and stores in `locations` table
3. Event broadcast via WebSocket to relevant organization channel
4. Frontend updates map markers in real-time
5. Trip calculation service runs in background to detect stops

### Permissions System

Uses **Laravel Policies** for authorization:
- Organization-level: `owner`, `admin`, `manager`, `viewer`
- Resource-level: Policies check both organization membership and role
- Middleware: `CheckOrganization` ensures user has access to tenant data

**Permission hierarchy:**
- `owner` - Full access including billing and deletion
- `admin` - Manage users, vehicles, and settings
- `manager` - View and edit vehicles/trackers
- `viewer` - Read-only access to tracking data

### Internationalization (i18n)

**Backend (Laravel):**
- Translation files in `lang/{locale}/`
- Use `__('key')` or `trans('key')` in controllers/views
- Locale detection: User preference > Header > Default

**Frontend (React):**
- Use `react-i18next` for translations
- Translation files in `resources/js/locales/{locale}/`
- Keys structured by feature: `translation.vehicles.title`

## Key Conventions

### Database Conventions

1. **Tenant Scoping**: Always include `organization_id` in queries for multi-tenant models
   ```php
   // Good
   Vehicle::where('organization_id', $organizationId)->get();
   
   // Better - use scope
   Vehicle::forOrganization($organizationId)->get();
   ```

2. **Timestamps**: Use `created_at` and `updated_at` on all tables. Locations table includes `recorded_at` for GPS timestamp

3. **Soft Deletes**: Enable on user-facing data (vehicles, trackers, organizations) for audit trail

### API Conventions

**Endpoints structure:**
```
/api/v1/organizations/{org}/vehicles
/api/v1/organizations/{org}/trackers
/api/v1/organizations/{org}/locations/live
```

**Response format:**
```json
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "total": 100
  }
}
```

**Error responses:**
```json
{
  "message": "Error description",
  "errors": {
    "field": ["Validation error"]
  }
}
```

### Frontend Conventions

1. **Component Structure**:
   ```
   resources/js/
   ├── components/     # Reusable UI components
   ├── features/       # Feature-specific components
   │   ├── tracking/
   │   ├── vehicles/
   │   └── organizations/
   ├── hooks/          # Custom React hooks
   ├── services/       # API clients
   └── utils/          # Helper functions
   ```

2. **Map Component Pattern**:
   - Wrap map library in custom React component for abstraction
   - Use context for shared map state (center, zoom, selected vehicle)
   - Memoize marker components to prevent unnecessary re-renders

3. **Real-Time Updates**:
   - Use WebSocket hooks to subscribe to organization channels
   - Update state with reducer pattern for consistent behavior
   - Throttle location updates to max 1 per second per vehicle

4. **Tailwind**: Use design system tokens defined in `tailwind.config.js`
   - Colors: `primary`, `secondary`, `success`, `danger`, `warning`
   - Spacing: Follow 4px base unit
   - Custom components in `@layer components` for reusability

### Testing Conventions

**Backend:**
- Feature tests for API endpoints (test full request/response cycle)
- Unit tests for services and calculators (e.g., trip detection logic)
- Use `RefreshDatabase` trait and factories for test data
- Test multi-tenancy: Verify users can't access other org's data

**Frontend:**
- Unit tests for utilities and hooks
- Integration tests for complex features (trip timeline, map interactions)
- Mock API calls with MSW (Mock Service Worker)
- Test i18n: Render components with different locales

## Map Integration (MapCN)

### Installation

```bash
npx shadcn@latest add @mapcn/map
```

MapCN is built on MapLibre GL and integrates with shadcn/ui. No API keys needed (uses free CARTO tiles by default with automatic light/dark mode).

### Architecture

MapCN uses **MapLibre directly** (not react-map-gl wrapper), giving full access to the underlying map API. UI elements render via React portals for complete styling control.

**Key Points:**
- DOM-based `MapMarker` components work for <500 markers
- For 100+ vehicles, use **GeoJSON layers** for WebGL rendering (better performance)
- Access raw MapLibre instance via `useMap()` hook or ref
- Compatible with any MapLibre tile provider (MapTiler, OSM, Carto, etc.)

### Basic Map Setup

```jsx
import { Map, MapControls } from "@/components/ui/map";
import { Card } from "@/components/ui/card";

export function TrackingMap() {
  return (
    <Card className="h-[600px] p-0 overflow-hidden">
      <Map 
        center={[-74.006, 40.7128]} 
        zoom={11}
        className="w-full h-full"
      >
        <MapControls />
        {/* Vehicle markers go here */}
      </Map>
    </Card>
  );
}
```

### Vehicle Markers (Small Fleet)

For <100 vehicles, use DOM-based markers:

```jsx
import { MapMarker } from "@/components/ui/map";

{vehicles.map(vehicle => (
  <MapMarker
    key={vehicle.id}
    longitude={vehicle.lng}
    latitude={vehicle.lat}
    draggable={false}
  >
    <VehicleIcon 
      type={vehicle.type}
      status={vehicle.status}
      heading={vehicle.heading}
    />
    <MapPopup>
      <VehicleDetails vehicle={vehicle} />
    </MapPopup>
    <MapTooltip>{vehicle.name}</MapTooltip>
  </MapMarker>
))}
```

### Vehicle Markers (Large Fleet)

For 100+ vehicles, use GeoJSON layers for performance:

```jsx
import { useMap } from "@/components/ui/map";
import { useEffect } from "react";

function VehicleLayer({ vehicles }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    const geojson = {
      type: "FeatureCollection",
      features: vehicles.map(v => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [v.lng, v.lat] },
        properties: { id: v.id, name: v.name, heading: v.heading }
      }))
    };
    
    if (!map.getSource("vehicles")) {
      map.addSource("vehicles", { type: "geojson", data: geojson });
      map.addLayer({
        id: "vehicle-markers",
        type: "symbol",
        source: "vehicles",
        layout: {
          "icon-image": "vehicle-icon",
          "icon-rotate": ["get", "heading"],
          "icon-rotation-alignment": "map"
        }
      });
    } else {
      map.getSource("vehicles").setData(geojson);
    }
  }, [map, vehicles]);
  
  return null;
}
```

### Real-Time Position Updates

Update marker positions smoothly without flickering:

```jsx
import { useEffect, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";

function LiveTrackingMap({ organizationId }) {
  const [vehicles, setVehicles] = useState([]);
  
  useWebSocket(`organization.${organizationId}.locations`, (event) => {
    setVehicles(prev => prev.map(v => 
      v.tracker_id === event.tracker_id 
        ? { ...v, lat: event.lat, lng: event.lng, heading: event.heading }
        : v
    ));
  });
  
  return (
    <Map>
      <VehicleLayer vehicles={vehicles} />
    </Map>
  );
}
```

### Route Polylines (Historical Trips)

```jsx
import { useMap } from "@/components/ui/map";

function TripRoute({ coordinates }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    map.addSource("route", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "LineString", coordinates }
      }
    });
    
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      paint: {
        "line-color": "#3b82f6",
        "line-width": 4
      }
    });
    
    return () => {
      if (map.getLayer("route-line")) map.removeLayer("route-line");
      if (map.getSource("route")) map.removeSource("route");
    };
  }, [map, coordinates]);
  
  return null;
}
```

### Geofencing / Zone Drawing

Use MapLibre Draw plugin for drawing zones (install separately):

```bash
npm install @mapbox/mapbox-gl-draw
```

```jsx
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { useMap } from "@/components/ui/map";

function GeofenceDrawer({ onZoneCreated }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true }
    });
    
    map.addControl(draw);
    
    map.on("draw.create", (e) => {
      onZoneCreated(e.features[0].geometry.coordinates);
    });
    
    return () => map.removeControl(draw);
  }, [map]);
  
  return null;
}
```

### Performance Tips

1. **Throttle updates**: Limit position updates to 1/second per vehicle
2. **Viewport culling**: Only render vehicles in visible map bounds
3. **Use layers**: Switch to GeoJSON layers at 100+ vehicles
4. **Memoize markers**: Wrap vehicle markers with `React.memo()`
5. **Batch updates**: Update all vehicle positions in single state change

## Environment Variables

Required environment variables:

```env
# App
APP_NAME="Vehicle Tracker"
APP_ENV=local
APP_KEY=  # Generate with: php artisan key:generate
APP_DEBUG=true
APP_URL=http://localhost

# Database (Docker service names)
DB_CONNECTION=mysql
DB_HOST=db  # Docker service name
DB_PORT=3306
DB_DATABASE=tracker
DB_USERNAME=tracker_user
DB_PASSWORD=secure_password

# Redis (Docker service name)
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

# Queue
QUEUE_CONNECTION=redis

# Real-time (Laravel Reverb - recommended)
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=your-app-id
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST=reverb  # Docker service name for backend
REVERB_PORT=8080
REVERB_SCHEME=http

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="localhost"  # Host-accessible for browser
VITE_REVERB_PORT="8080"
VITE_REVERB_SCHEME="http"

# Alternative - Pusher
# BROADCAST_CONNECTION=pusher
# PUSHER_APP_ID=
# PUSHER_APP_KEY=
# PUSHER_APP_SECRET=
# PUSHER_APP_CLUSTER=mt1
# VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
# VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"

# Map Provider (MapCN uses free CARTO tiles by default - no key needed)
# Optionally configure custom tile provider
# VITE_MAP_STYLE_URL=https://your-custom-tiles.com/style.json

# Default locale
DEFAULT_LOCALE=en

# Mail (for notifications)
MAIL_MAILER=smtp
MAIL_HOST=mailhog  # Docker service for development
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
```

## Docker Development Workflow

### Initial Setup

1. **Clone repository**
2. **Copy environment file**: `cp .env.example .env`
3. **Start services**: `docker compose up -d`
4. **Install dependencies**: `docker compose exec app composer install`
5. **Generate key**: `docker compose exec app php artisan key:generate`
6. **Run migrations**: `docker compose exec app php artisan migrate`
7. **Seed database**: `docker compose exec app php artisan db:seed`
8. **Install frontend deps**: `docker compose exec app npm install`
9. **Build assets**: `docker compose exec app npm run build`

### Development

- **Code changes**: Auto-reloaded with volume mounts
- **Database changes**: Run `docker compose exec app php artisan migrate`
- **Asset changes**: Run `docker compose exec app npm run dev` for hot-reload
- **Clear cache**: `docker compose exec app php artisan config:clear`

### Accessing Services

- **App**: http://localhost
- **Reverb WebSocket**: ws://localhost:8080
- **Database**: localhost:3306 (use MySQL client)
- **Redis**: localhost:6379
- **MailHog UI**: http://localhost:8025 (view test emails)

### Common Tasks

```bash
# Create new migration
docker compose exec app php artisan make:migration create_vehicles_table

# Create new model with migration and factory
docker compose exec app php artisan make:model Vehicle -mf

# Create new controller
docker compose exec app php artisan make:controller VehicleController --api

# Run tests
docker compose exec app php artisan test

# Access MySQL
docker compose exec db mysql -u tracker_user -p tracker

# Monitor queue jobs
docker compose exec app php artisan queue:work --verbose

# Clear all caches
docker compose exec app php artisan optimize:clear
```

### Troubleshooting

**Services won't start:**
```bash
docker compose down
docker compose up -d --force-recreate
```

**Permission issues:**
```bash
docker compose exec app chown -R www-data:www-data storage bootstrap/cache
docker compose exec app chmod -R 775 storage bootstrap/cache
```

**Database connection failed:**
- Check DB service is running: `docker compose ps`
- Verify .env DB_HOST matches service name: `db`
- Wait for MySQL to fully initialize (can take 30s on first start)

**WebSocket not connecting:**
- Verify Reverb service running: `docker compose logs reverb`
- Check VITE_REVERB_HOST is `localhost` not `reverb` (browser needs host-accessible URL)
- Ensure port 8080 not blocked by firewall

**Assets not building:**
- Check Node service logs: `docker compose logs node`
- Manually run: `docker compose exec app npm run dev`
- Clear node_modules and reinstall: `docker compose exec app rm -rf node_modules && npm install`

## Production Deployment (Docker)

### Key Differences from Development

1. **No development volumes** - Copy code into image
2. **Optimized builds** - Multi-stage Dockerfiles
3. **Separate frontend build** - Pre-compile assets
4. **Health checks** - Container monitoring
5. **Secrets management** - Use Docker secrets or env files
6. **Reverse proxy** - Nginx/Traefik in front
7. **SSL/TLS** - HTTPS for app and WSS for WebSocket

### Environment Variables

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

VITE_REVERB_HOST="yourdomain.com"
VITE_REVERB_SCHEME="https"
VITE_REVERB_PORT="443"

# Use strong passwords
DB_PASSWORD=<strong-random-password>
REDIS_PASSWORD=<strong-random-password>
```

### Scaling Considerations

**Horizontal scaling:**
- Run multiple app containers behind load balancer
- Sticky sessions not required (stateless API)
- Single Reverb instance or cluster with Redis adapter
- Single queue worker or multiple with supervisor

**Database:**
- Consider managed MySQL (AWS RDS, DigitalOcean Managed DB)
- Enable slow query log and optimize indexes
- Set up read replicas for high-traffic reporting

**Redis:**
- Managed Redis for high availability (AWS ElastiCache)
- Separate cache and queue Redis instances
- Enable persistence for queue data

## Environment Variables

Required environment variables:

```env
# App
APP_NAME="Vehicle Tracker"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tracker
DB_USERNAME=root
DB_PASSWORD=

# Real-time (Laravel Reverb - recommended)
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=your-app-id
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"

# Alternative - Pusher
# BROADCAST_CONNECTION=pusher
# PUSHER_APP_ID=
# PUSHER_APP_KEY=
# PUSHER_APP_SECRET=
# PUSHER_APP_CLUSTER=mt1
# VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
# VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"

# Map Provider (MapCN uses free CARTO tiles by default - no key needed)
# Optionally configure custom tile provider
# VITE_MAP_STYLE_URL=https://your-custom-tiles.com/style.json

# Default locale
DEFAULT_LOCALE=en
```

## Performance Considerations

1. **Location Storage**: Partition `locations` table by date to handle high-volume GPS data
2. **Real-Time**: Use Redis for pub/sub and caching active vehicle states
3. **Queries**: Index `organization_id`, `tracker_id`, and `recorded_at` on locations table
4. **Frontend**: Virtualize long lists (vehicle fleet with 1000+ items)
5. **Maps**: Request only visible vehicles based on map bounds, not entire fleet

## Security Notes

- **API Authentication**: Use Laravel Sanctum for SPA authentication
- **Organization Switching**: Require re-authentication when switching between organizations
- **Location Data**: Encrypt GPS coordinates at rest if handling sensitive tracking
- **Rate Limiting**: Apply strict limits on location upload endpoint (tracker devices)
