# GPS Tracker Options for Vehicle Tracking System

This document outlines compatible GPS trackers and methods for sending location data to the system.

## 📱 Mobile Phone Options (Easiest & Cheapest)

### 1. **GPSLogger for Android** (Recommended)
- **Free & Open Source**
- **Protocol**: HTTP POST to custom URL
- **Download**: [F-Droid](https://f-droid.org/packages/com.mendhak.gpslogger/) or Google Play Store
- **Setup**:
  1. Install GPSLogger app
  2. Go to Settings → Logging Details
  3. Enable "Log to Custom URL"
  4. Set URL: `https://yourdomain.com/api/v1/organizations/{org_id}/locations`
  5. Set HTTP Method: POST
  6. Set HTTP Body: 
     ```json
     {
       "tracker_id": YOUR_TRACKER_ID,
       "latitude": %LAT,
       "longitude": %LON,
       "altitude": %ALT,
       "speed": %SPD,
       "heading": %DIR,
       "accuracy": %ACC,
       "recorded_at": "%TIMESTAMP"
     }
     ```
  7. Add Header: `Authorization: Bearer YOUR_API_TOKEN`
  8. Set logging interval (e.g., every 30 seconds)

**Pros**: Free, works great for personal vehicles, low battery usage with smart logging
**Cons**: Phone must remain on, data usage (minimal)

### 2. **OwnTracks** (Privacy-focused)
- **Free & Open Source**
- **Protocol**: HTTP (can also do MQTT)
- **Platforms**: iOS, Android
- **Website**: https://owntracks.org/
- **Setup**: Similar to GPSLogger, configure HTTP endpoint
- **Features**: Geofencing, iBeacon support, encryption

**Pros**: Privacy-first design, encrypted data, cross-platform
**Cons**: Slightly more complex setup

### 3. **Traccar Client**
- **Free**
- **Protocol**: Traccar protocol (needs adapter)
- **Platforms**: iOS, Android
- **Website**: https://www.traccar.org/client/
- **Setup**: Point to your server with Traccar protocol port

**Pros**: Purpose-built for tracking, very reliable
**Cons**: Need to implement Traccar protocol parser

### 4. **PhoneTrack (Nextcloud)**
- **Free** (requires Nextcloud)
- **Protocol**: HTTP POST
- **Platforms**: Android (via app or automation)
- **Setup**: Can configure custom logging endpoint

### 5. **Custom Progressive Web App (PWA)**
You can build a simple PWA that runs in the browser:
```javascript
// Simple example - runs in browser
if ("geolocation" in navigator) {
  setInterval(() => {
    navigator.geolocation.getCurrentPosition(position => {
      fetch('https://yourdomain.com/api/v1/organizations/ORG_ID/locations', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer TOKEN',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tracker_id: TRACKER_ID,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed || 0,
          heading: position.coords.heading || 0,
          accuracy: position.coords.accuracy,
          recorded_at: new Date().toISOString()
        })
      });
    });
  }, 30000); // Every 30 seconds
}
```

**Pros**: No app installation, works on any device with browser
**Cons**: Browser must stay open, not as reliable

---

## 🚗 Dedicated GPS Trackers (Hardware)

### Budget Options ($20-50)

#### 1. **GT06 / TK102 / TK103 Series**
- **Price**: $15-30 on AliExpress/Amazon
- **Protocol**: GT06, H02, TK103
- **Features**: Basic GPS, GSM, SOS button
- **Setup**: Configure GPRS APN and server IP:port via SMS
- **Data Format**: Binary or text-based protocols
- **Example Models**: 
  - Concox GT06N
  - Sinotrack ST-901
  - TK103B

**Integration Note**: Need to implement protocol parser or use Traccar as middleware.

#### 2. **Queclink GL Series**
- **Price**: $30-60
- **Protocol**: Queclink Binary/Text, can do HTTP
- **Features**: Professional-grade, highly configurable
- **Models**: GL300, GL320MG
- **Battery**: 1-3 years (depending on reporting interval)

**Good for**: Asset tracking, doesn't need constant power

#### 3. **Teltonika FMB Series**
- **Price**: $40-80
- **Protocol**: TELTONIKA, can use HTTP/HTTPS POST
- **Features**: Professional, CAN bus, OBD-II support
- **Models**: FMB001, FMB003, FMB920
- **Excellent for**: Fleet vehicles, advanced data logging

### Mid-Range ($50-150)

#### 4. **Teltonika FMC Series**
- **Price**: $70-120
- **Models**: FMC001, FMC003
- **Features**: Compact, Bluetooth sensors, accelerometer
- **Protocol**: Native or HTTP JSON
- **Configuration**: Web-based configurator tool

#### 5. **CalAmp LMU Series**
- **Price**: $80-150
- **Models**: LMU-3030, LMU-4230
- **Features**: PULS (CalAmp protocol), HTTP available
- **Excellent for**: Commercial fleets
- **Certifications**: Carrier-certified

#### 6. **Suntech ST Series**
- **Price**: $60-100
- **Models**: ST340, ST4940
- **Protocol**: STI/STO, HTTP POST available
- **Features**: OBD-II, driver ID, fuel monitoring

### Premium ($150-400)

#### 7. **Geotab GO Series**
- **Price**: $150-250
- **Features**: Full telematics, driver coaching, maintenance
- **Protocol**: Proprietary (but has API)
- **Best for**: Enterprise fleets
- **Subscription**: Requires Geotab service

#### 8. **Samsara VG Series**
- **Price**: $200-400
- **Features**: AI dash cam integration, full telematics
- **Best for**: Large commercial fleets
- **Subscription**: Requires Samsara platform

---

## 🔌 OBD-II Trackers (Plug & Play)

#### 9. **Vyncs Pro**
- **Price**: $90 + $10/month
- **Features**: OBD-II, no installation, trip logging
- **Protocol**: Proprietary with API access
- **Setup**: Plug into OBD port

#### 10. **Bouncie**
- **Price**: $67 + $8/month
- **Features**: OBD-II, driver scoring, maintenance alerts
- **API**: Available for custom integration

#### 11. **Generic OBD-II with ELM327**
- **Price**: $15-30
- **Features**: Bluetooth/WiFi OBD-II adapter
- **App Required**: Use with custom or third-party app
- **Setup**: Pair with phone app that sends location + OBD data

---

## 🌐 Recommended Setup for Your System

### Option A: Quick Start (Mobile Phones)
**Best for**: Personal use, small fleet (<10 vehicles)
1. Use **GPSLogger** on Android or **OwnTracks** on iOS
2. Configure to POST directly to your API
3. Cost: **$0** (just use existing phones)
4. Setup time: **15 minutes**

### Option B: Professional Hardware + Phone Backup
**Best for**: Commercial fleet (10-50 vehicles)
1. Primary: **Teltonika FMB920** or **Queclink GL300** 
2. Backup: **GPSLogger app** on driver's phone
3. Cost: **$50-80 per vehicle**
4. Setup time: **1-2 hours per vehicle**

### Option C: Enterprise with OBD-II
**Best for**: Large fleet (50+ vehicles) with maintenance needs
1. Primary: **Teltonika FMC640** (OBD-II + GPS)
2. Feature-rich: Fuel consumption, engine diagnostics, driver behavior
3. Cost: **$120-150 per vehicle**
4. Setup time: **30 minutes per vehicle** (just plug in)

---

## 📡 Protocol Integration

### Supported Out-of-the-Box
Your current API accepts JSON HTTP POST:
```json
POST /api/v1/organizations/{org_id}/locations
Authorization: Bearer {token}
Content-Type: application/json

{
  "tracker_id": 123,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "altitude": 10.5,
  "speed": 45.5,
  "heading": 270,
  "accuracy": 5,
  "recorded_at": "2026-02-15T16:00:00Z"
}
```

**Works with**: GPSLogger, OwnTracks, Teltonika (via HTTP mode), any tracker with HTTP JSON support

### Needs Middleware/Parser
For binary protocols like GT06, H02, TK103, Queclink binary:
- Use **Traccar Server** as middleware
- Traccar receives binary data, converts to HTTP JSON, forwards to your API
- Install Traccar: `docker run -d -p 5055-5999:5055-5999 traccar/traccar:latest`

---

## 🔧 Configuration Examples

### Mobile Phone (GPSLogger)

**Step-by-step**:
1. Download GPSLogger from Play Store
2. Open app → Settings → Logging Details
3. **Log to custom URL**: Enable
4. **URL**: `https://tracker.yourdomain.com/api/v1/organizations/1/locations`
5. **HTTP Method**: POST
6. **HTTP Body**:
   ```json
   {"tracker_id":1,"latitude":%LAT,"longitude":%LON,"speed":%SPD,"heading":%DIR,"accuracy":%ACC,"recorded_at":"%TIMESTAMP"}
   ```
7. **HTTP Headers**: Add `Authorization: Bearer YOUR_TOKEN`
8. **Log every**: 30 seconds (or 1 minute to save battery)
9. Start logging!

### Hardware Tracker (Teltonika)

**Via Teltonika Configurator**:
1. Connect tracker via USB
2. Open Teltonika Configurator software
3. Go to **GPRS Settings**:
   - **Domain**: `tracker.yourdomain.com`
   - **Port**: `443` (HTTPS) or `80` (HTTP)
   - **Protocol**: `HTTP` or `HTTPS`
4. Go to **Data Acquisition**:
   - **Records to send**: 1 (real-time)
   - **Records interval**: 30 seconds
5. Configure **HTTP POST** format:
   ```
   POST /api/v1/organizations/1/locations HTTP/1.1
   Authorization: Bearer YOUR_TOKEN
   Content-Type: application/json
   
   {tracker_id:DEVICE_IMEI,latitude:LAT,longitude:LON,speed:SPEED,heading:DIR,recorded_at:TIMESTAMP}
   ```
6. Save and upload configuration

---

## 💡 Recommendations by Use Case

### Personal Car Tracking
- **Use**: GPSLogger (free)
- **Alternative**: Queclink GL300 ($40) if you want hardware

### Delivery Fleet (5-20 vehicles)
- **Use**: Teltonika FMB920 or Suntech ST340
- **Cost**: ~$60/vehicle one-time
- **Benefit**: Professional, reliable, no phone dependency

### Large Commercial Fleet (50+ vehicles)
- **Use**: Teltonika FMC640 (OBD-II) or Geotab GO
- **Cost**: $120-250/vehicle
- **Benefit**: Engine diagnostics, fuel tracking, driver behavior

### Asset Tracking (trailers, equipment)
- **Use**: Queclink GL320MG (3-year battery)
- **Cost**: $50/asset
- **Benefit**: No wiring, long battery life

### People/Pet Tracking
- **Use**: Mobile phone app (GPSLogger/OwnTracks)
- **Alternative**: Tile-like trackers with API access
- **Cost**: Free (phone) or $30-50 (dedicated)

---

## 🚀 Getting Started Checklist

- [ ] Decide on tracker type (phone vs hardware)
- [ ] Create tracker entry in system (note the `tracker_id`)
- [ ] Generate API token for authentication
- [ ] Configure tracker to send data to your endpoint
- [ ] Test with `curl` or Postman first
- [ ] Verify location appears in Live Tracking page
- [ ] Assign tracker to vehicle
- [ ] Monitor data flow for 24 hours

---

## 📞 Need Help?

For protocol integration questions or custom tracker support, check:
- Traccar documentation: https://www.traccar.org/protocols/
- GPS protocol specifications in `/docs/protocols/`
- Community forum: [To be created]

---

**Last Updated**: February 15, 2026
**System Version**: 1.0.0
