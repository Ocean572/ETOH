#!/bin/bash

# ETOH Tracker - Production Deployment Script
# This script deploys the application in production mode

echo "🚀 Starting ETOH Tracker in Production Mode..."
echo "============================================="

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production file not found!"
    echo "Please copy .env.production.example to .env.production and configure it."
    exit 1
fi

# Copy production environment to .env
cp .env.production .env
echo "✅ Production environment loaded"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Create the external network if it doesn't exist
echo "🌐 Creating secure Docker network..."
docker network create secure-app-network 2>/dev/null || echo "   Network already exists"

# Stop and remove any existing containers
echo "🧹 Stopping existing containers..."
docker compose -f docker-compose.prod.yml down -v 2>/dev/null || true

# Build and start all services in production mode
echo "🔨 Building and starting production services..."
docker compose -f docker-compose.prod.yml up --build -d

# Wait for services to be ready
echo "⏱️  Waiting for services to be ready..."
for i in {1..60}; do
    if curl -s http://localhost:8000 > /dev/null 2>&1; then
        echo "   ✅ Kong gateway is ready"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "   ❌ Services failed to start within timeout"
        exit 1
    fi
    sleep 2
done

for i in {1..60}; do
    if curl -s http://localhost:19006 > /dev/null 2>&1; then
        echo "   ✅ App is ready"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "   ❌ App failed to start within timeout"
        exit 1
    fi
    sleep 2
done

echo ""
echo "🎉 Production deployment completed successfully!"
echo "============================================="
echo ""
echo "🌐 Production URLs:"
echo "   • Main App: http://localhost:19006"
echo "   • Kong Gateway: http://localhost:8000"
echo ""
echo "📊 Check status: docker compose -f docker-compose.prod.yml ps"
echo "📋 View logs: docker compose -f docker-compose.prod.yml logs"
echo ""
echo "🔥 Production is live! 🚀"