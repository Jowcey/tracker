# Quick Start: Traccar Integration

## ✅ Traccar is Running!

Access Traccar web interface: **http://localhost:8082**  
Default login: `admin` / `admin`

## 🔧 Enable Position Forwarding to Laravel

To send GPS positions from Traccar to your Laravel app:

### Option 1: Via Web Interface (Easiest)

1. Login to Traccar at http://localhost:8082
2. Click **Settings** (gear icon) → **Server**
3. Scroll to **Forwarding** section
4. Configure:
   - **Forward URL**: `http://app/api/v1/traccar/positions`
   - **Forward Header**: `Authorization: Bearer jNbOg80Mr42J1yHcpRWwOHKPUZ9RQKVs33vDZU5azKA=`
   - Enable checkbox: **Forward JSON**
5. Click **Save**

### Option 2: Via Configuration File

1. Stop Traccar: `docker compose stop traccar`
2. Uncomment the config volume in `docker-compose.yml`:
   ```yaml
   volumes:
     - ./docker/traccar/traccar.xml:/opt/traccar/conf/traccar.xml:ro
   ```
3. Start Traccar: `docker compose up -d traccar`

## 📱 Testing with Mobile App

### Install Traccar Client
- **Android**: https://play.google.com/store/apps/details?id=org.traccar.client
- **iOS**: https://apps.apple.com/app/traccar-client/id843156974

### Configure App
- **Server URL**: `http://YOUR_SERVER_IP:5055`
- **Device Identifier**: Any unique ID (e.g., `test-phone-001`)
- **Frequency**: 30 seconds
- Start service

### Create Tracker in Laravel
1. Go to your app: http://localhost:8888
2. Navigate to **Management → Trackers**
3. Click **Add Tracker**
4. Fill in:
   - **Name**: Test Phone
   - **Device ID**: `test-phone-001` (must match app)
   - **Type**: Phone
5. Save

### Check Live Tracking
1. Go to **Live Tracking** page
2. You should see your device on the map
3. As you move, position updates every 30 seconds

## 🚗 Hardware Tracker Setup

### Example: GT06 Tracker

1. **Create device in Traccar**:
   ```bash
   curl -u admin:admin -X POST http://localhost:8082/api/devices \
     -H "Content-Type: application/json" \
     -d '{
       "name": "My Car",
       "uniqueId": "YOUR_IMEI_HERE",
       "category": "car"
     }'
   ```

2. **Configure tracker via SMS** (sent to tracker SIM):
   ```
   SERVER,1,YOUR_SERVER_IP,5001,0#
   APN,YOUR_APN_HERE#
   TIMER,30#
   ```

3. **Create tracker in Laravel**:
   - Go to **Management → Trackers → Add**
   - **Device ID**: Same IMEI used above
   - **Type**: GPS
   - Laravel will auto-register in Traccar

## 🔌 Available Protocol Ports

| Port | Protocol | Common Devices |
|------|----------|----------------|
| 5055 | OsmAnd | Traccar Client app, OsmAnd app |
| 5001 | GT06 | Most Chinese GPS trackers |
| 5002 | TK103 | TK102, TK103, Coban |
| 5013 | H02 | H02 protocol devices |
| 5027 | Queclink | GL300, GL320 |

Full list: https://www.traccar.org/devices/

## 🔍 Troubleshooting

### Check if Traccar is receiving data
```bash
docker compose logs traccar --tail 50
```

### Check if Laravel is receiving webhooks
```bash
docker compose logs app | grep TraccarWebhook
```

### Test webhook manually
```bash
curl -X POST http://localhost:8888/api/v1/traccar/positions \
  -H "Authorization: Bearer jNbOg80Mr42J1yHcpRWwOHKPUZ9RQKVs33vDZU5azKA=" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": 1,
    "latitude": 40.7128,
    "longitude": -74.0060,
    "speed": 25,
    "course": 90,
    "deviceTime": "2024-01-15T10:30:00Z"
  }'
```

### Tracker not connecting?
1. Check firewall allows incoming on port (5001, 5002, etc.)
2. Verify APN settings on device
3. Check Traccar logs for connection attempts
4. Use Traccar web interface to see if device appears

## 📚 Full Documentation

See **TRACCAR_INTEGRATION.md** for complete guide including:
- Architecture patterns
- Production deployment
- Security configuration
- Performance tuning
- Supported protocols reference
