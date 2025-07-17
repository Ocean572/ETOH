#!/bin/bash

# ETOH Tracker - First Time Setup Script
# This script sets up the complete application from scratch

echo "🍺 Setting up ETOH Tracker Application..."
echo "==============================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file with the following variables:"
    echo "EXPO_PUBLIC_SUPABASE_URL=https://your-domain.com/supabase"
    echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo "EXPO_PUBLIC_SUPABASE_SERVICE_KEY=your-service-key"
    echo "JWT_SECRET=your-jwt-secret"
    echo "POSTGRES_PASSWORD=your-postgres-password"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker compose > /dev/null 2>&1; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Create the external network if it doesn't exist
echo "🌐 Creating secure Docker network..."
docker network create secure-app-network 2>/dev/null || echo "   Network already exists"

# Stop and remove any existing containers
echo "🧹 Cleaning up existing containers..."
docker compose down -v 2>/dev/null || true

# Remove existing volumes to ensure fresh database
echo "🗑️  Removing existing volumes for fresh setup..."
docker volume rm -f sud_alcohol_postgres_data 2>/dev/null || true
docker volume rm -f sud_alcohol_storage_data 2>/dev/null || true

# Build and start all services
echo "🔨 Building and starting services..."
echo "   This may take a few minutes on first run..."
docker compose up --build -d

# Wait for services to be healthy
echo "⏱️  Waiting for services to be ready..."
echo "   Checking database health..."
for i in {1..30}; do
    if docker compose exec db pg_isready -U postgres -d postgres > /dev/null 2>&1; then
        echo "   ✅ Database is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "   ❌ Database failed to start"
        exit 1
    fi
    sleep 2
done

echo "   Checking Kong gateway..."
for i in {1..30}; do
    if curl -s http://localhost:8000 > /dev/null 2>&1; then
        echo "   ✅ Kong gateway is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "   ❌ Kong gateway failed to start"
        exit 1
    fi
    sleep 2
done

echo "   Checking API backend..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "   ✅ API backend is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "   ❌ API backend failed to start"
        exit 1
    fi
    sleep 2
done

echo "   Checking app container..."
for i in {1..30}; do
    if curl -s http://localhost:19006 > /dev/null 2>&1; then
        echo "   ✅ App is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "   ❌ App failed to start"
        exit 1
    fi
    sleep 2
done

echo ""
echo "🎉 ETOH Tracker setup completed successfully!"
echo "==============================================="
echo ""
echo "🌐 Application URLs:"
echo "   • Main App: http://localhost:19006"
echo "   • API Backend: http://localhost:3001"
echo "   • Kong Gateway: http://localhost:8000"
echo "   • Database: localhost:5432"
echo ""
echo "🔐 Database Info:"
echo "   • Database: postgres"
echo "   • Username: postgres"
echo "   • Password: (from .env file)"
echo ""
echo "📋 Next Steps:"
echo "   1. Open http://localhost:19006 in your browser"
echo "   2. Create a new user account"
echo "   3. Start tracking your alcohol consumption!"
echo ""
echo "🔧 Troubleshooting:"
echo "   • Check logs: docker compose logs"
echo "   • Restart services: docker compose restart"
echo "   • Full reset: docker compose down -v && ./setup-first-time.sh"
echo ""
echo "✨ Happy tracking! 🍺"