#!/bin/bash

# Simple guide to build and deploy mobile apps

echo "================================================"
echo "  Vehicle Tracker - Build Mobile Apps"
echo "================================================"
echo ""
echo "This will build STANDALONE APK and IPA files"
echo "(These are REAL apps, NOT Expo Go dependent!)"
echo ""
echo "Time required: ~15 minutes per platform"
echo "Requirements: Expo account (free)"
echo ""

# Check if tracker-app exists
if [ ! -d "/home/jowcey/projects/tracker-app" ]; then
    echo "❌ Mobile app project not found!"
    echo "Expected at: /home/jowcey/projects/tracker-app"
    exit 1
fi

cd /home/jowcey/projects/tracker-app

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "📦 Installing EAS CLI..."
    npm install -g eas-cli
fi

echo ""
echo "Step 1: Login to Expo"
echo "----------------------"
echo "If you don't have an account, create one at: https://expo.dev/signup"
echo ""
read -p "Press Enter to login..."

eas login

if [ $? -ne 0 ]; then
    echo "❌ Login failed"
    exit 1
fi

echo ""
echo "✅ Logged in!"
echo ""
echo "Step 2: Choose what to build"
echo "-----------------------------"
echo "1) Android APK only (Recommended - Free, works on all Android)"
echo "2) iOS IPA only (Requires Apple Developer account - \$99/year)"
echo "3) Both Android + iOS"
echo ""
read -p "Enter choice (1-3): " choice

BUILD_ANDROID=false
BUILD_IOS=false

case $choice in
    1)
        BUILD_ANDROID=true
        ;;
    2)
        BUILD_IOS=true
        ;;
    3)
        BUILD_ANDROID=true
        BUILD_IOS=true
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

# Build Android
if [ "$BUILD_ANDROID" = true ]; then
    echo ""
    echo "================================================"
    echo "  Building Android APK"
    echo "================================================"
    echo ""
    echo "⏱️  This will take 10-15 minutes..."
    echo "The build runs on Expo's cloud servers"
    echo ""
    
    eas build --platform android --profile preview
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Android APK build started successfully!"
        echo ""
        echo "📊 Track build status:"
        echo "   - In browser: https://expo.dev"
        echo "   - In terminal: eas build:list"
        echo ""
        echo "📥 After build completes (~15 min):"
        echo "   1. Download APK from Expo dashboard"
        echo "   2. Run this command:"
        echo "      cp ~/Downloads/build-*.apk /home/jowcey/projects/tracker/public/downloads/vehicle-tracker.apk"
        echo "   3. Access at: http://localhost:8888/app-download.html"
        echo ""
    else
        echo "❌ Android build failed"
    fi
fi

# Build iOS
if [ "$BUILD_IOS" = true ]; then
    echo ""
    echo "================================================"
    echo "  Building iOS IPA"
    echo "================================================"
    echo ""
    echo "⚠️  iOS builds require:"
    echo "   - Apple Developer account (\$99/year)"
    echo "   - Certificates and provisioning profiles"
    echo ""
    read -p "Continue? (y/n): " confirm
    
    if [ "$confirm" = "y" ]; then
        echo ""
        echo "⏱️  This will take 15-20 minutes..."
        echo ""
        
        eas build --platform ios --profile production
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ iOS IPA build started successfully!"
            echo ""
            echo "📊 Track build status:"
            echo "   - In browser: https://expo.dev"
            echo "   - In terminal: eas build:list"
            echo ""
            echo "📥 After build completes (~20 min):"
            echo "   1. Download IPA from Expo dashboard"
            echo "   2. Run this command:"
            echo "      cp ~/Downloads/build-*.ipa /home/jowcey/projects/tracker/public/downloads/vehicle-tracker.ipa"
            echo "   3. Access at: http://localhost:8888/app-download.html"
            echo ""
        else
            echo "❌ iOS build failed"
        fi
    else
        echo "Skipping iOS build"
    fi
fi

echo ""
echo "================================================"
echo "  Next Steps"
echo "================================================"
echo ""
echo "1. Wait for builds to complete (check Expo dashboard)"
echo "2. Download APK/IPA files"
echo "3. Copy to: /home/jowcey/projects/tracker/public/downloads/"
echo "4. Share download link: http://your-server/app-download.html"
echo ""
echo "💡 Tip: Monitor build progress:"
echo "   eas build:list"
echo ""
