# How to Compile the Mobile Apps

## Current Status

**Apps are NOT compiled yet.** You have the source code and build system ready, but need to run the build.

## What You'll Get

- **Android APK**: Standalone app file (~25 MB)
  - Works on any Android 8.0+ device
  - Direct install (no Play Store needed)
  - NO Expo Go required
  
- **iOS IPA**: Standalone app file (~30 MB)
  - Works on iPhone/iPad with iOS 13.0+
  - Install via TestFlight or direct
  - NO Expo Go required

These are **real, production apps** like you'd get from app stores.

## Requirements

1. **Expo Account** (free): https://expo.dev/signup
2. **15 minutes** per platform (cloud build time)
3. **For iOS**: Apple Developer account ($99/year) - *optional*

## Quick Build

### Step 1: Run Build Script

```bash
cd /home/jowcey/projects/tracker
./build-mobile-apps.sh
```

This interactive script will:
1. Install EAS CLI if needed
2. Login to Expo
3. Choose what to build (Android/iOS/Both)
4. Start the build

### Step 2: Wait for Build

Builds run on Expo's cloud servers (~15 minutes).

**Monitor progress:**
- Browser: https://expo.dev/accounts/[username]/projects/vehicle-tracker/builds
- Terminal: `eas build:list`

### Step 3: Download Built Files

When build completes:
1. Go to https://expo.dev
2. Navigate to: Projects → vehicle-tracker → Builds
3. Click completed build
4. Download APK (Android) or IPA (iOS)

### Step 4: Copy to Website

```bash
# Copy Android APK
cp ~/Downloads/build-*.apk public/downloads/vehicle-tracker.apk

# Copy iOS IPA
cp ~/Downloads/build-*.ipa public/downloads/vehicle-tracker.ipa
```

### Step 5: Share Download Link

Give users: **http://localhost:8888/app-download.html**

They download and install the app directly!

## Manual Build Commands

If you prefer manual control:

```bash
cd /home/jowcey/projects/tracker-app

# Login (first time)
eas login

# Build Android APK
npm run build:android

# Build iOS IPA
npm run build:ios:prod

# Build both
npm run build:all
```

## Why Not Pre-compiled?

1. **Requires your Expo account** - Can't build without login
2. **Takes 15+ minutes** - Cloud build process
3. **Large files** - 25-30 MB each (not in git)
4. **Your control** - You choose when to build

## What EAS Build Does

**NOT Expo Go!** EAS Build creates:

1. Takes React Native source code
2. Compiles to native Android/iOS code
3. Bundles all assets and dependencies
4. Creates standalone APK/IPA files
5. These run **independently** without Expo Go

Think of it like compiling a C++ program - you get a standalone executable.

## Download Page Access

- **URL**: http://localhost:8888/app-download.html
- **Status**: Page works, but shows "Not Available" until you build and copy files

## Troubleshooting

### "eas: command not found"

```bash
npm install -g eas-cli
```

### "Not authenticated"

```bash
cd /home/jowcey/projects/tracker-app
eas login
```

### "Build failed"

Check logs:
```bash
eas build:list
eas build:view [BUILD_ID]
```

### Download link doesn't work

1. Check files exist: `ls -la public/downloads/`
2. Verify file names match exactly:
   - `vehicle-tracker.apk`
   - `vehicle-tracker.ipa`

## Build Time Estimates

- **Android APK**: 10-15 minutes
- **iOS IPA**: 15-20 minutes
- **Both**: 20-30 minutes (parallel)

## Cost Breakdown

- **Expo account**: Free ✅
- **EAS builds**: Free tier (limited builds/month) ✅
- **Android**: Free to build and distribute ✅
- **iOS builds**: Free, but requires Apple Developer ($99/year) for device installs ⚠️

**Recommendation**: Start with Android (free, easy to test)

## Alternative: Pre-built Binaries

If you want to skip building:

1. Use the PWA tracker (already included)
   - Located at: `public/pwa-tracker/index.html`
   - Works in mobile browser
   - No installation needed

2. Use GPSLogger for Android
   - Free app from Play Store
   - Configure to POST to your API

3. Use OwnTracks for iOS/Android
   - Free app
   - Configure HTTP mode to your API

## Next Steps

**Ready to build?**

```bash
./build-mobile-apps.sh
```

Then wait 15 minutes and you'll have your apps! 🚀
