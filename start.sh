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
echo "  • Web App: http://localhost:19006" 
echo "  • API Backend: http://localhost:3001"
echo "  • Kong Gateway: http://localhost:8000"
echo ""
echo "🗄️  Database:"
echo "  • PostgreSQL: localhost:5432"
echo "  • Database: postgres"
echo "  • User: postgres"
echo "  • Password: postgres"
echo ""
echo "📊 View logs: docker compose logs -f"
echo "🛑 Stop stack: docker compose down"