# Mobile App Documentation

## Overview

Custom React Native mobile app for GPS vehicle tracking. Available for both iOS and Android.

## Location

The mobile app is in a separate directory: `/home/jowcey/projects/tracker-app`

## Quick Start

### 1. Install Expo Go on Your Phone

- **iOS**: https://apps.apple.com/app/expo-go/id982107779
- **Android**: https://play.google.com/store/apps/details?id=host.exp.exponent

### 2. Start Development Server

```bash
cd /home/jowcey/projects/tracker-app
npm start
```

### 3. Scan QR Code

- Open Expo Go app
- Scan QR code from terminal
- App loads on your phone

### 4. Configure App

Fill in:
- **API URL**: `http://YOUR_COMPUTER_IP:8888` (not localhost!)
- **Organization ID**: From web app
- **Tracker ID**: Create tracker in web app first
- **Auth Token**: Generate in web app settings

### 5. Test Connection

Tap "Test Connection" button to verify setup.

### 6. Start Tracking

Tap "Start Tracking" and grant location permissions.

## Features

✅ Background GPS tracking (works when app closed)  
✅ Configurable update interval (default: 30 seconds)  
✅ Real-time statistics (sent/errors)  
✅ Connection testing  
✅ Persistent configuration  
✅ Low battery usage  
✅ Foreground service notification (Android)

## Getting Configuration Values

### API URL

Your computer's local IP address + port:
```bash
# Find your IP
ip addr show | grep "inet " | grep -v 127.0.0.1

# Example: http://192.168.1.100:8888
```

**Important**: Use your computer's IP, NOT `localhost` or `127.0.0.1`

### Organization ID

1. Login to web app
2. Check URL when viewing organization
3. URL contains org ID: `/organizations/1` → ID is `1`

### Tracker ID

1. Go to **Management → Trackers**
2. Click **Add Tracker**
3. Fill in:
   - **Name**: My Phone
   - **Device ID**: phone-001 (or any unique ID)
   - **Type**: Phone
4. Save - note the Tracker ID shown in the list

### Auth Token

1. Login to web app
2. Go to user profile/settings
3. Generate new API token
4. Copy token to mobile app

**Note**: Currently you may need to generate token via Tinker:
```bash
docker compose exec app php artisan tinker
$user = App\Models\User::find(1);
$token = $user->createToken('mobile-app')->plainTextToken;
echo $token;
```

## Permissions

### Android

- Location (foreground) - Required
- Location (background) - Required for tracking when app closed
- Physical activity - Helps improve location accuracy

### iOS

- Location "While Using" - Required
- Location "Always" - Required for background tracking

## Building Production App

### Android APK

```bash
cd /home/jowcey/projects/tracker-app

# Install EAS CLI (one time)
npm install -g eas-cli

# Login to Expo
eas login

# Build APK
eas build --platform android --profile preview

# Wait for build (~10 minutes)
# Download APK and install on phone
```

### iOS App

Requires:
- macOS
- Xcode
- Apple Developer account ($99/year)

```bash
eas build --platform ios
```

## Architecture

### Background Tracking

Uses Expo's `TaskManager` to run location updates in background:

1. App registers background task
2. Task runs every X seconds (configurable)
3. Gets current location from GPS
4. Sends to Laravel API
5. Updates local statistics
6. Continues even when app closed

### Location Accuracy

- **High Accuracy**: Uses GPS + WiFi + Cell towers
- **Balanced**: Less battery, slightly less accurate
- **Low Power**: Battery saver, less frequent updates

App uses **High Accuracy** by default for vehicle tracking.

### Battery Optimization

- Only updates at configured interval (not continuous)
- Uses distance filter (only updates if moved 10+ meters)
- Efficient HTTP requests (small JSON payload)
- Native GPS APIs (not WebView)

Typical battery usage: **2-5% per hour** with 30-second updates

## Troubleshooting

### App won't connect to server

1. **Check API URL format**: `http://IP:8888` (no trailing slash)
2. **Verify server accessible**: Open `http://YOUR_IP:8888` in phone browser
3. **Check firewall**: Ensure port 8888 open
4. **Same network**: Phone and server must be on same WiFi

### Location not updating

1. **Check permissions**: Settings → Apps → Vehicle Tracker → Permissions
2. **Enable "Always"**: Required for background tracking
3. **Disable battery optimization**: Settings → Battery → App optimization
4. **Restart tracking**: Stop and start again

### High error count

1. **Check auth token**: Verify token is valid
2. **Check tracker ID**: Ensure tracker exists in organization
3. **Check logs**: View in Expo or device logs
4. **Test connection**: Use "Test Connection" button

### Stats not updating

Stats refresh every 5 seconds while tracking is active. If frozen:
1. Stop tracking
2. Close app completely
3. Reopen and start tracking

## Development

### File Structure

```
tracker-app/
├── App.tsx              # Main app component
├── app.json            # Expo configuration
├── package.json        # Dependencies
├── README.md           # App documentation
└── assets/             # Icons and images
```

### Tech Stack

- **React Native** - Cross-platform mobile framework
- **Expo** - Build toolchain and managed runtime
- **expo-location** - GPS and geolocation
- **expo-task-manager** - Background task execution
- **@react-native-async-storage** - Local data persistence
- **axios** - HTTP client

### Development Workflow

1. Make changes to `App.tsx`
2. Save file
3. App auto-reloads on phone
4. Test changes
5. Repeat

No rebuilds needed during development!

## Production Deployment

### Distribution Options

1. **Internal Testing**:
   - Build APK
   - Share via email/Dropbox
   - Users install directly

2. **Google Play Store**:
   - Create Play Console account ($25 one-time)
   - Build production APK
   - Upload to Play Console
   - Submit for review

3. **Apple App Store**:
   - Apple Developer account ($99/year)
   - Build production IPA
   - Upload to App Store Connect
   - Submit for review

4. **Enterprise Distribution**:
   - Deploy via MDM (Mobile Device Management)
   - Internal app stores

## Future Enhancements

Possible additions:
- [ ] Login screen (authenticate in-app)
- [ ] Multiple tracker support
- [ ] Trip history view
- [ ] Geofence alerts
- [ ] Offline queue (send when connection restored)
- [ ] Battery level reporting
- [ ] Speed alerts
- [ ] Map view showing current location
- [ ] Organization switcher

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review Expo documentation: https://docs.expo.dev/
3. Check Laravel API logs: `docker compose logs app`
