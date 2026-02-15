#!/bin/bash

# Traccar Configuration Script
# This script configures Traccar forwarding after container starts

echo "Configuring Traccar..."

# Wait for Traccar to be ready
until curl -s http://localhost:8082/api/server > /dev/null; do
    echo "Waiting for Traccar to start..."
    sleep 5
done

echo "Traccar is ready!"
echo ""
echo "✅ Traccar Web Interface: http://localhost:8082"
echo "   Default credentials: admin / admin"
echo ""
echo "📍 Tracker Ports:"
echo "   - 5055: OsmAnd/Traccar Client app"
echo "   - 5001: GT06 protocol"
echo "   - 5002: TK103 protocol"
echo "   - 5013: H02 protocol"  
echo "   - 5027: Queclink protocol"
echo ""
echo "🔧 Next Steps:"
echo "1. Login to Traccar at http://localhost:8082 (admin/admin)"
echo "2. Go to Settings → Server → Forward Configuration"
echo "3. Set forward URL: http://app/api/v1/traccar/positions"
echo "4. Add header: Authorization: Bearer jNbOg80Mr42J1yHcpRWwOHKPUZ9RQKVs33vDZU5azKA="
echo "5. Enable 'Forward JSON'"
echo "6. Save settings"
echo ""
echo "Or configure via Traccar config file. See TRACCAR_INTEGRATION.md"
