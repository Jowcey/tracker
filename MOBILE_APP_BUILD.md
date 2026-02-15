# Building Mobile Apps

## Overview

The Vehicle Tracker mobile app can be compiled for both Android and iOS platforms.

**App Location**: `/home/jowcey/projects/tracker-app`

## Quick Build (Recommended)

### 1. Create Expo Account
Sign up at https://expo.dev/signup (free)

### 2. Start Build

```bash
cd /home/jowcey/projects/tracker-app

# Login (first time only)
eas login

# Build Android APK
npm run build:android

# Or use interactive script
./build.sh
```

### 3. Wait for Build
Builds run on Expo's cloud servers (~15 minutes).

### 4. Download & Install
Download link appears when build completes.

## Build Options

### Android APK (Recommended for Testing)
```bash
npm run build:android
```
- ✅ **Free** - No accounts needed
- ✅ **Easy** - Direct install on any Android device
- ✅ **Fast** - 10-15 minute build time
- ✅ **No Play Store** - Install via file

**Use for**: Testing, internal distribution, quick deployment

### Android AAB (For Play Store)
```bash
npm run build:android:prod
```
- Requires Google Play Console ($25 one-time)
- Must be uploaded to Play Store
- Cannot be installed directly

**Use for**: Public app store distribution

### iOS Simulator (Testing Only)
```bash
npm run build:ios
```
- ✅ **Free** - No Apple account needed
- ❌ **Mac only** - Requires macOS + Xcode
- ✅ **Fast testing** - Run in simulator

**Use for**: Development and testing on Mac

### iOS Device (Real iPhones/iPads)
```bash
npm run build:ios:prod
```
- ❌ **Requires Apple Developer** account ($99/year)
- Can use TestFlight for distribution
- Can submit to App Store

**Use for**: Production iOS builds

### Both Platforms
```bash
npm run build:all
```
Builds Android APK and iOS IPA simultaneously.

## Installation Guide

### Android APK Installation

**On the phone:**
1. Download APK file
2. Tap to open
3. Allow "Install from unknown sources" if prompted
4. Tap "Install"
5. Open app

**Sharing APK:**
- Email attachment
- Dropbox/Google Drive link
- Direct USB transfer
- QR code download link

### iOS IPA Installation

**Option 1: TestFlight (Easiest)**
1. Upload IPA to App Store Connect
2. Enable TestFlight
3. Add testers by email
4. They get TestFlight link
5. Install via TestFlight app

**Option 2: App Store**
1. Upload to App Store Connect
2. Submit for review
3. Wait 1-7 days
4. Public App Store listing

**Option 3: Ad Hoc (Limited)**
- Register device UDIDs in Apple Developer
- Install via Xcode or configuration profile
- Limited to 100 devices

## Build Status & Logs

Check build progress:
```bash
cd /home/jowcey/projects/tracker-app
npm run build:status
```

Or view online: https://expo.dev → Projects → vehicle-tracker → Builds

## First Time Setup

### EAS CLI Installation
```bash
npm install -g eas-cli
```

### Expo Login
```bash
cd /home/jowcey/projects/tracker-app
eas login
```

### iOS Credentials (iOS Only)
If building for iOS devices:
```bash
eas credentials
```
Follow prompts to:
- Generate distribution certificate
- Generate provisioning profile
- Or use existing Apple certificates

## Cost Summary

| Platform | Build Type | Cost | Notes |
|----------|-----------|------|-------|
| Android APK | Testing/Internal | **Free** ✅ | No accounts needed |
| Android AAB | Play Store | $25 one-time | Google Play Console |
| iOS Simulator | Testing | **Free** ✅ | Mac required |
| iOS Device | Production | $99/year | Apple Developer |

## Recommended Workflow

### For Testing (Free)
1. Build Android APK: `npm run build:android`
2. Test on Android devices
3. Once working, build iOS if needed

### For Production
1. Test with APK builds first
2. When ready for public:
   - **Android**: Build AAB → Upload to Play Store
   - **iOS**: Build IPA → Upload to App Store Connect → TestFlight/App Store

## App Store Submission

### Google Play Store
1. Create Play Console account ($25)
2. Build AAB: `npm run build:android:prod`
3. Create app listing (screenshots, description)
4. Upload AAB
5. Submit for review (1-3 days)

### Apple App Store
1. Apple Developer account ($99/year)
2. Build IPA: `npm run build:ios:prod`
3. Create app listing in App Store Connect
4. Upload via Transporter app or Xcode
5. Submit for review (1-7 days)

## Troubleshooting

### Build Fails: "Not authenticated"
```bash
eas login
```

### iOS Build: "No provisioning profile"
```bash
eas credentials
```
Select "iOS" → "Set up provisioning profile"

### Android: "Cannot install APK"
Enable "Install from unknown sources":
- Settings → Security → Unknown sources
- Or Settings → Apps → Special access → Install unknown apps

### iOS: "Cannot install IPA"
- Use TestFlight for easiest installation
- Or ensure device UDID registered in Apple Developer portal

## Updating the App

### Update Version Numbers
Edit `tracker-app/app.json`:
```json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "versionCode": 2
    },
    "ios": {
      "buildNumber": "2"
    }
  }
}
```

Increment for each new build.

### Rebuild
```bash
npm run build:android
# or
npm run build:ios:prod
```

## Distribution Methods

### Internal Testing (Small Team)
- Build Android APK
- Share file directly
- Everyone installs

### Public Release (Many Users)
- **Android**: Google Play Store
- **iOS**: Apple App Store
- Handles updates automatically

### Hybrid (Best of Both)
- **Android**: APK for internal, Play Store for public
- **iOS**: TestFlight for internal, App Store for public

## Documentation

Detailed guides available in `/home/jowcey/projects/tracker-app/`:
- **QUICKSTART.md** - Fast build guide
- **BUILD.md** - Comprehensive build documentation
- **README.md** - App usage and configuration

## Support

For build issues:
1. Check build logs: `eas build:list`
2. View detailed error: `eas build:view [BUILD_ID]`
3. Check Expo docs: https://docs.expo.dev/build/introduction/
4. Forum: https://forums.expo.dev/

## Summary

**Simplest path to get app on phones:**

1. **Sign up Expo** (free): https://expo.dev/signup
2. **Build Android APK**: 
   ```bash
   cd /home/jowcey/projects/tracker-app
   eas login
   npm run build:android
   ```
3. **Wait 15 minutes**
4. **Download APK**
5. **Install on Android phones**

Done! 🎉

For iOS, add Apple Developer account and repeat with `npm run build:ios:prod`.
