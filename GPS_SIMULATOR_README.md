# GPS Tracker Simulator

This script simulates GPS data from multiple vehicles for testing the tracking system.

## Features

- Simulates 5 vehicles with realistic movement patterns in NYC
- Sends location updates every 3 seconds
- Includes speed and heading data
- Works with the tracker API endpoints

## Usage

### 1. Get Your API Token

Login to the application and get your Bearer token:

```bash
curl -X POST http://localhost:8888/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tracker.local","password":"password"}'
```

Copy the `token` from the response.

### 2. Run the Simulator

```bash
# Using docker compose
docker compose exec app node simulate-gps.js

# Or with custom settings
API_TOKEN="your_token_here" \
ORG_ID=1 \
docker compose exec app node simulate-gps.js
```

### 3. Watch Real-Time Updates

Open your browser to:
- Live Tracking: http://localhost:8888/tracking
- Watch the vehicles move in real-time on the map!

## Configuration

Environment variables:

- `API_URL` - Base URL of the API (default: http://localhost:8888)
- `ORG_ID` - Organization ID (default: 1)
- `API_TOKEN` - Your Bearer token (required)

## Routes

The simulator creates 5 different routes:

1. **Times Square Loop** - Manhattan area
2. **Brooklyn Bridge** - Brooklyn route
3. **Queens Boulevard** - Queens route
4. **Bronx River** - Bronx route
5. **Staten Island Ferry** - Staten Island route

Each vehicle moves along its route with:
- Variable speed (30-80 km/h)
- Realistic heading changes
- Small random variations for natural movement

## Stopping the Simulator

Press `Ctrl+C` to stop the simulation gracefully.

## Troubleshooting

**No data appearing?**
- Check that your API token is valid
- Ensure the tracker IDs match your vehicles (default: 1-5)
- Check browser console for WebSocket connection
- Verify organization ID is correct

**API errors?**
- Verify the API is running: `docker compose ps`
- Check logs: `docker compose logs app`
- Ensure you have permission to post locations

## Example Output

```
🚀 GPS Tracker Simulator Started

Configuration:
  API URL: http://localhost:8888
  Organization ID: 1
  Trackers: 5
  Update Interval: 3000ms

Routes:
  📍 Tracker 1: Times Square Loop
  📍 Tracker 2: Brooklyn Bridge
  📍 Tracker 3: Queens Boulevard
  📍 Tracker 4: Bronx River
  📍 Tracker 5: Staten Island Ferry

================================================================================

✅ [10:30:15 AM] Tracker 1 (Times Square Loop): 40.7589, -73.9851 @ 45.2 km/h
✅ [10:30:15 AM] Tracker 2 (Brooklyn Bridge): 40.6782, -73.9442 @ 52.8 km/h
...
```

## Integration with Real GPS Devices

Once your real GPS devices are configured, they should POST to:

```
POST /api/organizations/{org_id}/locations
```

With payload:
```json
{
  "tracker_id": 1,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "speed": 55.5,
  "heading": 90
}
```

See the Trackers page in the application for device setup instructions.
