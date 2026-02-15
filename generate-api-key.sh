#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}================================================"
echo "  Generate Organization API Key"
echo "================================================${NC}"
echo ""

# Get auth token
echo -e "${BLUE}Logging in...${NC}"
TOKEN=$(curl -s -X POST http://192.168.0.53:8888/api/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"admin@tracker.local","password":"password"}' | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${YELLOW}❌ Login failed. Check credentials.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Logged in successfully${NC}"
echo ""

# Generate API key
echo -e "${BLUE}Generating API key for Organization 1...${NC}"
RESPONSE=$(curl -s -X POST http://192.168.0.53:8888/api/organizations/1/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -d '{"name":"Mobile App","prefix":"trk_live_"}')

# Extract the plain key
API_KEY=$(echo "$RESPONSE" | jq -r '.plain_key')

if [ -z "$API_KEY" ] || [ "$API_KEY" = "null" ]; then
    echo -e "${YELLOW}❌ Failed to generate API key${NC}"
    echo "$RESPONSE" | jq '.'
    exit 1
fi

echo -e "${GREEN}✅ API Key Generated!${NC}"
echo ""
echo "================================================"
echo -e "${YELLOW}⚠️  COPY THIS KEY - YOU WON'T SEE IT AGAIN!${NC}"
echo "================================================"
echo ""
echo -e "${GREEN}$API_KEY${NC}"
echo ""
echo "================================================"
echo "Use this in your mobile app configuration:"
echo "  API URL: http://192.168.0.53:8888"
echo "  API Key: $API_KEY"
echo "  Organization ID: 1"
echo "  Tracker ID: [Create a tracker first]"
echo "  Update Interval: 30"
echo "================================================"
echo ""
