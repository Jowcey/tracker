# Traccar Integration Guide

## What is Traccar?

**Traccar** is an open-source GPS tracking platform that supports **200+ GPS tracker protocols** and thousands of device models. It handles the complexity of parsing various GPS protocols (binary, text, HTTP, etc.) and provides a unified API.

**Key Benefits:**
- ✅ Supports virtually any GPS tracker hardware
- ✅ Handles protocol parsing (no need to implement GT06, H02, TK103, etc.)
- ✅ Battle-tested with millions of deployments
- ✅ Free and open-source
- ✅ Active development and community

## Integration Approaches

### Option 1: Traccar as Protocol Gateway (Recommended)

Use Traccar **only** for protocol conversion, keep your Laravel app as the main system.

```
GPS Tracker → Traccar Server → Your Laravel API → Your Database
                (protocol parser)  (business logic)
```

**Pros:**
- Instant support for 200+ protocols
- No protocol parsing code needed
- Your app remains the source of truth
- Keep your multi-tenant architecture

**Cons:**
- Additional service to maintain
- Slight latency (usually <100ms)

### Option 2: Direct Traccar Integration

Use Traccar as your main tracking backend, sync data to Laravel.

```
GPS Tracker → Traccar Server ←→ Your Laravel API
                (full backend)     (reads from Traccar)
```

**Pros:**
- Mature tracking features (geofencing, notifications, reports)
- Built-in web interface

**Cons:**
- Your multi-tenant system becomes more complex
- Need to sync organizations/users between systems
- Less control over data structure

### Option 3: Hybrid Approach

Traccar for real-time tracking, Laravel for everything else.

---

## Setup Guide: Option 1 (Protocol Gateway)

### Step 1: Install Traccar Server

#### Docker Installation (Recommended)

Add to your `docker-compose.yml`:

```yaml
  traccar:
    image: traccar/traccar:latest
    container_name: traccar
    restart: unless-stopped
    ports:
      - "8082:8082"  # Web interface
      - "5055:5055"  # Default tracker port (adjust as needed)
      # Add more ports for specific protocols:
      - "5001:5001"  # GT06 protocol
      - "5002:5002"  # TK103 protocol
      - "5013:5013"  # H02 protocol
      - "5027:5027"  # Queclink protocol
    volumes:
      - ./docker/traccar/traccar.xml:/opt/traccar/conf/traccar.xml
      - ./docker/traccar/logs:/opt/traccar/logs
      - traccar-db:/opt/traccar/data
    networks:
      - app-network

volumes:
  traccar-db:
```

Start Traccar:
```bash
docker compose up -d traccar
```

Access web interface: http://localhost:8082
- Default login: admin / admin

#### Standalone Installation

```bash
# Linux
wget https://github.com/traccar/traccar/releases/latest/download/traccar-linux-64.zip
unzip traccar-linux-64.zip
sudo ./traccar-linux-64.run

# macOS (via Homebrew)
brew install traccar

# Windows
# Download installer from https://www.traccar.org/download/
```

### Step 2: Configure Traccar

Create `docker/traccar/traccar.xml`:

```xml
<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE properties SYSTEM 'http://java.sun.com/dtd/properties.dtd'>
<properties>
    <!-- Server Configuration -->
    <entry key='web.port'>8082</entry>
    
    <!-- Database (optional - uses H2 by default) -->
    <!-- For production, use PostgreSQL or MySQL -->
    
    <!-- Forward positions to your Laravel API -->
    <entry key='forward.enable'>true</entry>
    <entry key='forward.url'>http://app/api/v1/traccar/positions</entry>
    <entry key='forward.header'>Authorization: Bearer YOUR_TRACCAR_API_TOKEN</entry>
    
    <!-- Protocol ports (enable only what you need) -->
    <entry key='gps103.port'>5001</entry>
    <entry key='tk103.port'>5002</entry>
    <entry key='h02.port'>5013</entry>
    <entry key='queclink.port'>5027</entry>
    <entry key='osmand.port'>5055</entry>
    
    <!-- Logging -->
    <entry key='logger.level'>info</entry>
</properties>
```

### Step 3: Create Laravel Traccar Endpoint

Create a new controller to receive positions from Traccar:

```bash
docker compose exec app php artisan make:controller Api/TraccarWebhookController
```

**app/Http/Controllers/Api/TraccarWebhookController.php:**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Location;
use App\Models\Tracker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TraccarWebhookController extends Controller
{
    /**
     * Receive position updates from Traccar
     */
    public function positions(Request $request)
    {
        // Verify Traccar token
        $token = $request->bearerToken();
        if ($token !== config('services.traccar.api_token')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Traccar sends position data in this format
        $data = $request->validate([
            'deviceId' => 'required|integer',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'altitude' => 'nullable|numeric',
            'speed' => 'nullable|numeric',
            'course' => 'nullable|numeric', // heading
            'accuracy' => 'nullable|numeric',
            'deviceTime' => 'required|date', // ISO 8601
        ]);

        // Map Traccar device ID to your tracker
        // You'll need to store this mapping when creating trackers
        $tracker = Tracker::where('traccar_device_id', $data['deviceId'])->first();
        
        if (!$tracker) {
            Log::warning('Unknown Traccar device', ['device_id' => $data['deviceId']]);
            return response()->json(['error' => 'Unknown device'], 404);
        }

        // Store location
        $location = Location::create([
            'tracker_id' => $tracker->id,
            'organization_id' => $tracker->organization_id,
            'latitude' => $data['latitude'],
            'longitude' => $data['longitude'],
            'altitude' => $data['altitude'] ?? null,
            'speed' => $data['speed'] ?? null,
            'heading' => $data['course'] ?? null,
            'accuracy' => $data['accuracy'] ?? null,
            'recorded_at' => $data['deviceTime'],
        ]);

        // Broadcast real-time update
        broadcast(new \App\Events\LocationUpdated(
            trackerId: $tracker->id,
            organizationId: $tracker->organization_id,
            latitude: $location->latitude,
            longitude: $location->longitude,
            heading: $location->heading,
            speed: $location->speed,
            recordedAt: $location->recorded_at->toISOString()
        ))->toOthers();

        return response()->json(['status' => 'success'], 200);
    }
}
```

### Step 4: Add Route

**routes/api.php:**

```php
// Traccar webhook (outside organization middleware)
Route::post('/traccar/positions', [TraccarWebhookController::class, 'positions']);
```

### Step 5: Add Traccar Configuration

**config/services.php:**

```php
return [
    // ... existing services

    'traccar' => [
        'url' => env('TRACCAR_URL', 'http://traccar:8082'),
        'api_token' => env('TRACCAR_API_TOKEN'),
        'admin_user' => env('TRACCAR_ADMIN_USER', 'admin'),
        'admin_password' => env('TRACCAR_ADMIN_PASSWORD', 'admin'),
    ],
];
```

**.env:**

```env
TRACCAR_URL=http://traccar:8082
TRACCAR_API_TOKEN=your-random-secure-token-here
TRACCAR_ADMIN_USER=admin
TRACCAR_ADMIN_PASSWORD=change-this-password
```

### Step 6: Update Tracker Migration

Add Traccar device ID field to trackers table:

```bash
docker compose exec app php artisan make:migration add_traccar_device_id_to_trackers_table
```

**database/migrations/xxxx_add_traccar_device_id_to_trackers_table.php:**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trackers', function (Blueprint $table) {
            $table->integer('traccar_device_id')->nullable()->unique()->after('protocol');
            $table->json('traccar_metadata')->nullable()->after('traccar_device_id');
        });
    }

    public function down(): void
    {
        Schema::table('trackers', function (Blueprint $table) {
            $table->dropColumn(['traccar_device_id', 'traccar_metadata']);
        });
    }
};
```

Run migration:
```bash
docker compose exec app php artisan migrate
```

### Step 7: Create Traccar Service

Create a service to interact with Traccar API:

```bash
docker compose exec app php artisan make:class Services/TraccarService
```

**app/Services/TraccarService.php:**

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class TraccarService
{
    protected string $baseUrl;
    protected string $username;
    protected string $password;

    public function __construct()
    {
        $this->baseUrl = config('services.traccar.url');
        $this->username = config('services.traccar.admin_user');
        $this->password = config('services.traccar.admin_password');
    }

    /**
     * Create device in Traccar
     */
    public function createDevice(string $name, string $uniqueId): ?array
    {
        $response = Http::withBasicAuth($this->username, $this->password)
            ->post("{$this->baseUrl}/api/devices", [
                'name' => $name,
                'uniqueId' => $uniqueId, // IMEI or other unique identifier
                'category' => 'car',
            ]);

        return $response->successful() ? $response->json() : null;
    }

    /**
     * Get device from Traccar
     */
    public function getDevice(int $deviceId): ?array
    {
        $response = Http::withBasicAuth($this->username, $this->password)
            ->get("{$this->baseUrl}/api/devices/{$deviceId}");

        return $response->successful() ? $response->json() : null;
    }

    /**
     * Update device in Traccar
     */
    public function updateDevice(int $deviceId, array $data): ?array
    {
        $response = Http::withBasicAuth($this->username, $this->password)
            ->put("{$this->baseUrl}/api/devices/{$deviceId}", $data);

        return $response->successful() ? $response->json() : null;
    }

    /**
     * Delete device from Traccar
     */
    public function deleteDevice(int $deviceId): bool
    {
        $response = Http::withBasicAuth($this->username, $this->password)
            ->delete("{$this->baseUrl}/api/devices/{$deviceId}");

        return $response->successful();
    }

    /**
     * Get latest position for device
     */
    public function getPosition(int $deviceId): ?array
    {
        $response = Http::withBasicAuth($this->username, $this->password)
            ->get("{$this->baseUrl}/api/positions", [
                'deviceId' => $deviceId,
            ]);

        $positions = $response->successful() ? $response->json() : null;
        return $positions ? end($positions) : null;
    }
}
```

### Step 8: Update TrackerController

Integrate Traccar when creating GPS trackers:

**app/Http/Controllers/Api/TrackerController.php (add to store method):**

```php
use App\Services\TraccarService;

public function store(Request $request, $organization)
{
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'type' => 'required|in:gps,phone,obd,asset',
        'protocol' => 'nullable|in:http,gprs,mqtt,websocket',
        'imei' => 'nullable|string|max:255', // Important for Traccar
        'phone_number' => 'nullable|string|max:20',
        'is_active' => 'boolean',
    ]);

    $validated['organization_id'] = $request->current_organization_id;

    // If hardware GPS tracker with IMEI, register in Traccar
    if ($validated['type'] === 'gps' && !empty($validated['imei'])) {
        $traccarService = new TraccarService();
        $traccarDevice = $traccarService->createDevice(
            $validated['name'],
            $validated['imei']
        );

        if ($traccarDevice) {
            $validated['traccar_device_id'] = $traccarDevice['id'];
            $validated['traccar_metadata'] = $traccarDevice;
        }
    }

    $tracker = Tracker::create($validated);

    return response()->json($tracker->load('vehicle.latestLocation'), 201);
}
```

---

## Hardware Setup Examples

### GT06 Tracker Configuration

Send SMS commands to tracker SIM card number:

```
# Set server IP and port
SERVER,1,YOUR_SERVER_IP,5001,0#

# Set APN (example for T-Mobile)
APN,fast.t-mobile.com#

# Set update interval (30 seconds)
TIMER,30#

# Check settings
STATUS#
```

### TK103 Tracker Configuration

```
# Admin password (default: 123456)
adminip123456 YOUR_SERVER_IP 5002

# Set APN
apn123456 fast.t-mobile.com

# Set update interval (30 seconds)
fix030s***n123456
```

### Queclink GL300 Configuration

Use Queclink configuration tool or AT commands:
```
AT+GTBSI=gl300,1,0,,,,1,1,1,0,YOUR_SERVER_IP,5027,,,,0,0,,,,,,FFFF$
```

---

## Testing

### 1. Test Traccar is Running

```bash
curl http://localhost:8082/api/server
```

Should return Traccar server info.

### 2. Create Test Device in Traccar

```bash
curl -X POST http://localhost:8082/api/devices \
  -u admin:admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Vehicle",
    "uniqueId": "123456789012345",
    "category": "car"
  }'
```

### 3. Send Test Position

Using OsmAnd protocol (simplest for testing):

```bash
curl "http://localhost:5055/?id=123456789012345&lat=37.7749&lon=-122.4194&speed=25&bearing=90&altitude=100&timestamp=$(date +%s)"
```

### 4. Check Traccar Web Interface

Visit http://localhost:8082
- Login with admin/admin
- You should see the test device on the map

### 5. Check Laravel Received Data

```bash
docker compose exec app php artisan tinker
```

```php
// Check if location was stored
App\Models\Location::latest()->first();
```

---

## Traccar Mobile App Setup

### For Testing Without Hardware

1. **Install Traccar Client**
   - Android: https://play.google.com/store/apps/details?id=org.traccar.client
   - iOS: https://apps.apple.com/app/traccar-client/id843156974

2. **Configure App**
   - Server URL: `http://YOUR_SERVER_IP:5055`
   - Device Identifier: Match the uniqueId you created in Traccar
   - Frequency: 30 seconds
   - Distance: 0 meters
   - Angle: 0 degrees

3. **Start Tracking**
   - Enable "Service status"
   - Grant location permissions
   - Positions should appear in Traccar web interface
   - Check your Laravel app for stored locations

---

## Production Considerations

### Security

1. **Enable HTTPS for Traccar**
   - Use Nginx reverse proxy with SSL
   - Many trackers support HTTPS

2. **Firewall Rules**
   - Only open ports for protocols you use
   - Consider VPN for sensitive deployments

3. **Change Default Password**
   ```bash
   # In Traccar web interface
   Settings → Users → admin → Edit → Change Password
   ```

### Performance

1. **Database**: Switch Traccar to PostgreSQL for better performance
   ```xml
   <entry key='database.driver'>org.postgresql.Driver</entry>
   <entry key='database.url'>jdbc:postgresql://db:5432/traccar</entry>
   <entry key='database.user'>traccar_user</entry>
   <entry key='database.password'>password</entry>
   ```

2. **Optimize Forward Settings**
   ```xml
   <!-- Only forward necessary data -->
   <entry key='forward.json'>true</entry>
   <entry key='forward.urlVariables'>false</entry>
   ```

### Monitoring

```bash
# Check Traccar logs
docker compose logs -f traccar

# Check active connections
docker compose exec traccar cat /opt/traccar/logs/tracker-server.log | grep "connected"
```

---

## Supported Protocols

Common protocols Traccar supports out of the box:

| Protocol | Port | Device Examples |
|----------|------|-----------------|
| GT06 | 5001 | Concox GT06N, Sinotrack, Most Chinese trackers |
| TK103 | 5002 | TK103, TK102, Coban GPS |
| H02 | 5013 | H02 protocol devices |
| Queclink | 5027 | Queclink GL300, GL320 |
| OsmAnd | 5055 | OsmAnd app, Traccar Client app |
| Teltonika | 5028 | Teltonika FMB, TMT |
| Meitrack | 5020 | Meitrack MVT, MT90 |
| ST210 | 5017 | Suntech ST210, ST340 |

Full list: https://www.traccar.org/devices/

---

## Troubleshooting

### Tracker Won't Connect

1. Check port is open:
   ```bash
   docker compose exec traccar netstat -tuln | grep 5001
   ```

2. Check firewall allows incoming connections

3. Verify APN settings on tracker

4. Check Traccar logs for connection attempts:
   ```bash
   docker compose logs traccar | grep "connected\|disconnected"
   ```

### No Data in Laravel

1. Check forward URL in traccar.xml is correct
2. Verify API token matches
3. Check Laravel logs:
   ```bash
   docker compose logs app | grep TraccarWebhook
   ```

4. Test webhook manually:
   ```bash
   curl -X POST http://localhost/api/v1/traccar/positions \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "deviceId": 1,
       "latitude": 37.7749,
       "longitude": -122.4194,
       "speed": 25,
       "course": 90,
       "deviceTime": "2024-01-15T10:30:00Z"
     }'
   ```

---

## Alternative: Direct Integration Without Traccar

If you only need to support **one specific protocol**, you can parse it directly in Laravel. Example for simple HTTP POST:

```php
// GPS tracker sends: GET /track?id=IMEI&lat=37.7&lon=-122.4&speed=25
Route::get('/track', function (Request $request) {
    $tracker = Tracker::where('imei', $request->id)->firstOrFail();
    
    Location::create([
        'tracker_id' => $tracker->id,
        'organization_id' => $tracker->organization_id,
        'latitude' => $request->lat,
        'longitude' => $request->lon,
        'speed' => $request->speed,
        'recorded_at' => now(),
    ]);
    
    return response('OK');
});
```

**When to use direct integration:**
- You know exactly which trackers you'll use
- Protocol is simple (HTTP/JSON)
- You want minimal dependencies

**When to use Traccar:**
- Need to support multiple tracker brands
- Using binary protocols (GT06, H02, etc.)
- Want flexibility to add new devices
- Need advanced features (geofencing, commands, notifications)
