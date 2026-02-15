# Deploying Mobile Apps via Website

## Overview

Build standalone APK (Android) and IPA (iOS) files and host them on your website for direct download.

**No Expo Go required** - These are real, standalone apps.

## Quick Deploy

### 1. Build the Apps

```bash
cd /home/jowcey/projects/tracker-app

# Login (first time)
eas login

# Build Android APK
npm run build:android

# Or use deploy script
./build-and-deploy.sh
```

### 2. Download Built Files

After build completes (~15 minutes):

1. Go to https://expo.dev
2. Navigate to: Projects → vehicle-tracker → Builds
3. Download the APK or IPA file

### 3. Copy to Website

```bash
# Copy downloaded files to public folder
cp ~/Downloads/build-*.apk /home/jowcey/projects/tracker/public/downloads/vehicle-tracker.apk
cp ~/Downloads/build-*.ipa /home/jowcey/projects/tracker/public/downloads/vehicle-tracker.ipa
```

### 4. Access Download Page

Open in browser: **http://localhost:8888/app-download.html**

Users can now download directly from your website!

## What Gets Built

### Android APK
- **Standalone app** - No Expo Go needed
- **Works on**: Any Android 8.0+ device
- **Size**: ~25 MB
- **Install**: Direct APK install
- **Distribution**: Can be shared freely

### iOS IPA
- **Standalone app** - No Expo Go needed
- **Works on**: iPhone/iPad with iOS 13.0+
- **Size**: ~30 MB
- **Install**: TestFlight or direct (requires Apple Developer)
- **Distribution**: TestFlight, App Store, or Ad Hoc

## Build Process Explained

### What EAS Build Does

1. **Takes your React Native code**
2. **Compiles to native code**:
   - Android: Creates standalone APK
   - iOS: Creates standalone IPA
3. **Includes all dependencies**
4. **No Expo Go dependency**
5. **Real, distributable apps**

### Clarification

**EAS Build ≠ Expo Go**

- **Expo Go**: Development tool (scan QR code)
- **EAS Build**: Creates standalone apps (APK/IPA)

The apps we build are **completely independent** and don't require Expo Go.

## File Structure

```
tracker/
└── public/
    ├── app-download.html       # Download page
    └── downloads/
        ├── vehicle-tracker.apk  # Android app (you copy here)
        └── vehicle-tracker.ipa  # iOS app (you copy here)
```

## Hosting on Your Website

### Option 1: Laravel Public Folder (Current)

Files in `public/downloads/` are accessible at:
- http://yourdomain.com/downloads/vehicle-tracker.apk
- http://yourdomain.com/downloads/vehicle-tracker.ipa

Download page at:
- http://yourdomain.com/app-download.html

### Option 2: Cloud Storage (For Large Scale)

If expecting many downloads, host files on:
- AWS S3
- DigitalOcean Spaces
- Google Cloud Storage
- Cloudflare R2

Update links in `app-download.html` to cloud URLs.

## Updating the Apps

### Version Management

1. **Update version** in `app.json`:
   ```json
   {
     "expo": {
       "version": "1.0.1",
       "android": { "versionCode": 2 },
       "ios": { "buildNumber": "2" }
     }
   }
   ```

2. **Rebuild**:
   ```bash
   npm run build:android
   npm run build:ios:prod
   ```

3. **Replace files** in `public/downloads/`

4. **Update version number** in `app-download.html`

### Users Get Updates

- **Android**: Users download new APK and install over old version
- **iOS**: Upload new IPA to TestFlight or App Store

## Distribution Methods

### Internal Team (Easy)

1. Build APK
2. Copy to `public/downloads/`
3. Share link: `http://yourserver/app-download.html`
4. Team downloads and installs

### Public Website (Medium)

1. Set up domain with SSL (https)
2. Build apps
3. Host files on website
4. Share public download link

### App Stores (Advanced)

1. Build production versions
2. Submit to Google Play / App Store
3. Wait for approval
4. Users install from store

## Security Considerations

### Code Signing

- **Android**: Automatically signed by EAS
- **iOS**: Requires Apple Developer certificates

### HTTPS

For public downloads, use HTTPS:
```nginx
# nginx config
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    location /downloads/ {
        alias /path/to/tracker/public/downloads/;
    }
}
```

### Access Control (Optional)

Restrict downloads to authenticated users:

**routes/web.php:**
```php
Route::middleware('auth')->group(function () {
    Route::get('/app-download', function () {
        return view('app-download');
    });
    
    Route::get('/downloads/{file}', function ($file) {
        $path = public_path('downloads/' . $file);
        return response()->download($path);
    });
});
```

## Testing

### Before Public Release

1. **Build APK**
2. **Install on test devices**
3. **Test all features**:
   - Login/authentication
   - GPS tracking
   - Background tracking
   - Battery usage
   - Network connectivity
4. **Fix bugs**
5. **Rebuild and re-test**

### QR Code for Easy Download

Generate QR code pointing to:
- `http://yourserver/app-download.html`

Users scan → opens download page → download app

## Automation (Optional)

### Auto-deploy Script

```bash
#!/bin/bash
# build-and-copy.sh

cd /home/jowcey/projects/tracker-app

# Build
eas build --platform android --profile preview --non-interactive

# Wait for build and download
# (Requires eas-cli extensions)

# Copy to public folder
cp ~/Downloads/build-*.apk /home/jowcey/projects/tracker/public/downloads/vehicle-tracker.apk

# Restart web server
docker compose restart app

echo "✅ App deployed to website!"
```

### GitHub Actions (Advanced)

Automatically build on git push:

```yaml
# .github/workflows/build-mobile.yml
name: Build Mobile Apps

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: expo/expo-github-action@v7
      - run: eas build --platform android --non-interactive
      - run: cp build.apk tracker/public/downloads/
```

## Troubleshooting

### APK won't install on Android

- Enable "Install from unknown sources"
- Settings → Security → Unknown sources
- Or per-app: Settings → Apps → Special access

### IPA won't install on iOS

- Use TestFlight (easiest)
- Or ensure device registered in Apple Developer portal
- Check certificate is valid

### Files too large to download

- Host on cloud storage (S3, Spaces)
- Use CDN for faster downloads
- Split into smaller chunks (advanced)

### Download page not accessible

- Check nginx/apache config
- Verify files in `public/` folder
- Check file permissions: `chmod 644`

## Production Checklist

Before going live:

- [ ] Test apps on multiple devices
- [ ] Set up SSL certificate (HTTPS)
- [ ] Update version numbers
- [ ] Test download page
- [ ] Check file permissions
- [ ] Monitor download bandwidth
- [ ] Set up analytics (optional)
- [ ] Create privacy policy page
- [ ] Add app screenshots to download page

## Cost Summary

- **Building**: Free with Expo account
- **Hosting APK/IPA**: ~50 MB total (your server)
- **SSL Certificate**: Free (Let's Encrypt)
- **Bandwidth**: Depends on downloads
- **Domain**: $10-15/year (optional)

**Total for self-hosting: $0-15/year** ✅

Compare to:
- App Store: $99/year
- Play Store: $25 one-time

## Summary

**Your workflow:**

1. Build: `npm run build:android` (~15 min)
2. Download from Expo dashboard
3. Copy to: `public/downloads/vehicle-tracker.apk`
4. Share link: `http://yourserver/app-download.html`
5. Users download and install!

**No Expo Go, no App Stores, no waiting for approval.** Just build and distribute! 🚀
