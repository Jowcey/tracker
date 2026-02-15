#!/bin/bash

echo "======================================"
echo "🧪 Testing All New Features"
echo "======================================"
echo ""

# Login and get token
echo "1️⃣ Testing Login..."
TOKEN=$(curl -s -X POST http://localhost:80/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tracker.local","password":"password"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed"
    exit 1
fi
echo "✅ Login successful"
echo ""

# Test vehicles endpoint
echo "2️⃣ Testing Vehicles API..."
VEHICLES=$(curl -s -X GET "http://localhost:80/api/organizations/1/vehicles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json")

if echo "$VEHICLES" | grep -q '"data"'; then
    COUNT=$(echo "$VEHICLES" | grep -o '"id":' | wc -l)
    echo "✅ Vehicles API working - Found $COUNT vehicles"
else
    echo "❌ Vehicles API failed"
fi
echo ""

# Test trackers endpoint
echo "3️⃣ Testing Trackers API..."
TRACKERS=$(curl -s -X GET "http://localhost:80/api/organizations/1/trackers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json")

if echo "$TRACKERS" | grep -q '"data"'; then
    COUNT=$(echo "$TRACKERS" | grep -o '"id":' | wc -l)
    echo "✅ Trackers API working - Found $COUNT trackers"
else
    echo "❌ Trackers API failed"
fi
echo ""

# Test trips endpoint
echo "4️⃣ Testing Trips API..."
TRIPS=$(curl -s -X GET "http://localhost:80/api/organizations/1/trips" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json")

if echo "$TRIPS" | grep -q '"data"'; then
    echo "✅ Trips API working"
else
    echo "❌ Trips API failed"
fi
echo ""

# Test location posting
echo "5️⃣ Testing Location Posting..."
LOCATION=$(curl -s -X POST "http://localhost:80/api/organizations/1/locations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tracker_id": 1,
    "latitude": 40.7128,
    "longitude": -74.0060,
    "speed": 55.5,
    "heading": 90
  }')

if echo "$LOCATION" | grep -q '"latitude"'; then
    echo "✅ Location posting working"
else
    echo "❌ Location posting failed"
fi
echo ""

echo "======================================"
echo "✅ All API Tests Complete!"
echo "======================================"
echo ""
echo "Frontend Pages Available:"
echo "  • http://localhost:8888/vehicles"
echo "  • http://localhost:8888/trackers"
echo "  • http://localhost:8888/history"
echo "  • http://localhost:8888/tracking"
echo ""
echo "Start GPS Simulator:"
echo "  API_TOKEN=$TOKEN docker compose exec app node simulate-gps.js"
echo ""
