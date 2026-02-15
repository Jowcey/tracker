#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================"
echo "  Mobile App Deployment Script"
echo "================================================${NC}"
echo ""

# Directories
DOWNLOADS_DIR="$HOME/Downloads"
PUBLIC_DIR="$(pwd)/public/downloads"

# Create public/downloads if it doesn't exist
mkdir -p "$PUBLIC_DIR"

# Function to find and move APK
deploy_apk() {
    echo -e "${BLUE}Looking for Android APK...${NC}"
    
    # Find the most recent APK file in Downloads
    APK_FILE=$(find "$DOWNLOADS_DIR" -name "*.apk" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
    
    if [ -z "$APK_FILE" ]; then
        echo -e "${YELLOW}⚠️  No APK file found in $DOWNLOADS_DIR${NC}"
        return 1
    fi
    
    echo -e "Found: ${GREEN}$(basename "$APK_FILE")${NC}"
    
    # Move and rename
    cp "$APK_FILE" "$PUBLIC_DIR/vehicle-tracker.apk"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ APK deployed to: $PUBLIC_DIR/vehicle-tracker.apk${NC}"
        echo -e "   Size: $(du -h "$PUBLIC_DIR/vehicle-tracker.apk" | cut -f1)"
        return 0
    else
        echo -e "${RED}❌ Failed to deploy APK${NC}"
        return 1
    fi
}

# Function to find and move IPA
deploy_ipa() {
    echo -e "${BLUE}Looking for iOS IPA...${NC}"
    
    # Find the most recent IPA file in Downloads
    IPA_FILE=$(find "$DOWNLOADS_DIR" -name "*.ipa" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
    
    if [ -z "$IPA_FILE" ]; then
        echo -e "${YELLOW}⚠️  No IPA file found in $DOWNLOADS_DIR${NC}"
        return 1
    fi
    
    echo -e "Found: ${GREEN}$(basename "$IPA_FILE")${NC}"
    
    # Move and rename
    cp "$IPA_FILE" "$PUBLIC_DIR/vehicle-tracker.ipa"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ IPA deployed to: $PUBLIC_DIR/vehicle-tracker.ipa${NC}"
        echo -e "   Size: $(du -h "$PUBLIC_DIR/vehicle-tracker.ipa" | cut -f1)"
        return 0
    else
        echo -e "${RED}❌ Failed to deploy IPA${NC}"
        return 1
    fi
}

# Main menu
echo "What would you like to deploy?"
echo ""
echo "1) Android APK only"
echo "2) iOS IPA only"
echo "3) Both (APK + IPA)"
echo "4) Auto-detect and deploy all available"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo ""
        deploy_apk
        ;;
    2)
        echo ""
        deploy_ipa
        ;;
    3)
        echo ""
        deploy_apk
        echo ""
        deploy_ipa
        ;;
    4)
        echo ""
        APK_SUCCESS=0
        IPA_SUCCESS=0
        
        deploy_apk && APK_SUCCESS=1
        echo ""
        deploy_ipa && IPA_SUCCESS=1
        
        if [ $APK_SUCCESS -eq 0 ] && [ $IPA_SUCCESS -eq 0 ]; then
            echo ""
            echo -e "${RED}❌ No build files found${NC}"
            echo ""
            echo "Make sure you've:"
            echo "1. Completed the build on Expo"
            echo "2. Downloaded the APK/IPA to ~/Downloads"
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Summary
echo ""
echo -e "${BLUE}================================================"
echo "  Deployment Summary"
echo "================================================${NC}"
echo ""

if [ -f "$PUBLIC_DIR/vehicle-tracker.apk" ]; then
    echo -e "${GREEN}✅ Android APK available${NC}"
    echo -e "   📱 Download at: http://localhost:8888/downloads/vehicle-tracker.apk"
else
    echo -e "${YELLOW}⚠️  Android APK not available${NC}"
fi

if [ -f "$PUBLIC_DIR/vehicle-tracker.ipa" ]; then
    echo -e "${GREEN}✅ iOS IPA available${NC}"
    echo -e "   📱 Download at: http://localhost:8888/downloads/vehicle-tracker.ipa"
else
    echo -e "${YELLOW}⚠️  iOS IPA not available${NC}"
fi

echo ""
echo -e "${BLUE}View download page at:${NC}"
echo -e "   🌐 http://localhost:8888/app-download.html"
echo ""
