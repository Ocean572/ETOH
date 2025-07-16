#!/bin/bash

echo "🚀 Starting ETOH Tracker Production Stack"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.production..."
    cp .env.production .env
fi

# Build and start containers
echo "📦 Building and starting production containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "✅ Production stack started successfully!"
echo ""
echo "🌐 Access your app:"
echo "  • Web App (PWA): http://localhost:3000"
echo "  • Health Check: http://localhost:3000/health"
echo ""
echo "🗄️  Database:"
echo "  • PostgreSQL: localhost:5432"
echo "  • Database: postgres"
echo "  • User: postgres"
echo ""
echo "📊 Management:"
echo "  • View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  • Stop stack: docker compose -f docker-compose.prod.yml down"
echo "  • View status: docker compose -f docker-compose.prod.yml ps"
echo ""
echo "🔧 Nginx reverse proxy can point to: http://localhost:3000"