# Mobile Apps Not Yet Built

The APK and IPA files will be placed here after building.

## To Build the Apps

### 1. Create Expo Account
Sign up at https://expo.dev/signup (free)

### 2. Build Android APK

```bash
cd /home/jowcey/projects/tracker-app
eas login
npm run build:android
```

This takes ~15 minutes. The build runs on Expo's cloud servers.

### 3. Download and Copy

After build completes:
1. Download APK from https://expo.dev
2. Copy to this folder:
   ```bash
   cp ~/Downloads/build-*.apk vehicle-tracker.apk
   ```

### 4. Build iOS (Optional)

```bash
npm run build:ios:prod
```

Requires Apple Developer account ($99/year).

## Current Status

- [ ] Android APK - Not built yet
- [ ] iOS IPA - Not built yet

## Quick Start

Run this script to build:
```bash
cd /home/jowcey/projects/tracker-app
./build-and-deploy.sh
```

Follow the prompts to build Android and/or iOS.
