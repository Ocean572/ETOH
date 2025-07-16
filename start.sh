#!/bin/bash

echo "🚀 Starting ETOH Tracker Development Stack"
echo ""

# Build and start containers
echo "📦 Building and starting containers..."
docker compose up -d --build

echo ""
echo "✅ Stack started successfully!"
echo ""
echo "📱 Access your app:"
echo "  • Expo DevTools: http://localhost:8081"
echo "  • Web App: http://localhost:19006" 
echo "  • Mobile: Use Expo Go app and scan QR code"
echo ""
echo "🗄️  Database:"
echo "  • PostgreSQL: localhost:5432"
echo "  • Database: postgres"
echo "  • User: postgres"
echo "  • Password: postgres"
echo ""
echo "📊 View logs: docker compose logs -f"
echo "🛑 Stop stack: docker compose down"