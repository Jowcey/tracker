#!/usr/bin/env node

/**
 * GPS Tracker Simulator
 * Simulates GPS data for testing the tracking system
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
    baseUrl: process.env.API_URL || 'http://localhost:8888',
    organizationId: process.env.ORG_ID || 1,
    token: process.env.API_TOKEN || '',
    trackers: [
        { id: 1, name: 'Vehicle 1' },
        { id: 2, name: 'Vehicle 2' },
        { id: 3, name: 'Vehicle 3' },
        { id: 4, name: 'Vehicle 4' },
        { id: 5, name: 'Vehicle 5' },
    ],
    updateInterval: 3000, // 3 seconds
};

// Starting positions (NYC area)
const routes = [
    // Route 1: Manhattan loop
    { start: [40.7589, -73.9851], direction: [0.0005, 0.0008], name: 'Times Square Loop' },
    // Route 2: Brooklyn route
    { start: [40.6782, -73.9442], direction: [0.0003, -0.0006], name: 'Brooklyn Bridge' },
    // Route 3: Queens route
    { start: [40.7282, -73.7949], direction: [-0.0004, 0.0005], name: 'Queens Boulevard' },
    // Route 4: Bronx route
    { start: [40.8448, -73.8648], direction: [0.0002, -0.0004], name: 'Bronx River' },
    // Route 5: Staten Island
    { start: [40.5795, -74.1502], direction: [-0.0003, 0.0007], name: 'Staten Island Ferry' },
];

// Track current positions
const positions = routes.map((route, i) => ({
    trackerId: config.trackers[i]?.id || i + 1,
    lat: route.start[0],
    lng: route.start[1],
    heading: Math.random() * 360,
    speed: 30 + Math.random() * 40,
    direction: route.direction,
    routeName: route.name,
}));

function makeRequest(method, path, data) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, config.baseUrl);
        const isHttps = url.protocol === 'https:';
        const lib = isHttps ? https : http;

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.token}`,
                'Accept': 'application/json',
            },
        };

        const req = lib.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ status: res.statusCode, body });
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function sendLocationUpdate(position) {
    // Update position
    position.lat += position.direction[0] + (Math.random() - 0.5) * 0.0001;
    position.lng += position.direction[1] + (Math.random() - 0.5) * 0.0001;
    position.heading = (position.heading + (Math.random() - 0.5) * 10) % 360;
    position.speed = Math.max(0, Math.min(80, position.speed + (Math.random() - 0.5) * 10));

    const payload = {
        tracker_id: position.trackerId,
        latitude: position.lat,
        longitude: position.lng,
        heading: position.heading,
        speed: position.speed,
    };

    try {
        await makeRequest(
            'POST',
            `/api/organizations/${config.organizationId}/locations`,
            payload
        );
        console.log(`✅ [${new Date().toLocaleTimeString()}] Tracker ${position.trackerId} (${position.routeName}): ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)} @ ${position.speed.toFixed(1)} km/h`);
    } catch (error) {
        console.error(`❌ [${new Date().toLocaleTimeString()}] Tracker ${position.trackerId} failed:`, error.message);
    }
}

async function simulate() {
    console.log('\n🚀 GPS Tracker Simulator Started\n');
    console.log('Configuration:');
    console.log(`  API URL: ${config.baseUrl}`);
    console.log(`  Organization ID: ${config.organizationId}`);
    console.log(`  Trackers: ${positions.length}`);
    console.log(`  Update Interval: ${config.updateInterval}ms\n`);

    if (!config.token) {
        console.log('⚠️  Warning: No API token provided. Set API_TOKEN environment variable.');
        console.log('   Example: API_TOKEN=your_token_here node simulate-gps.js\n');
    }

    console.log('Routes:');
    positions.forEach(p => {
        console.log(`  📍 Tracker ${p.trackerId}: ${p.routeName}`);
    });
    console.log('\n' + '='.repeat(80) + '\n');

    // Send updates in a loop
    setInterval(async () => {
        for (const position of positions) {
            await sendLocationUpdate(position);
        }
    }, config.updateInterval);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Simulator stopped\n');
    process.exit(0);
});

// Start simulation
simulate().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
