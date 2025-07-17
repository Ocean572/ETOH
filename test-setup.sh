#!/bin/bash

# Quick test script to verify setup is working
echo "🧪 Testing ETOH Tracker Setup..."
echo "=================================="

# Test 1: Check if all containers are running
echo "📋 Checking container status..."
if docker compose ps | grep -q "Up"; then
    echo "   ✅ Containers are running"
else
    echo "   ❌ Some containers are not running"
    docker compose ps
    exit 1
fi

# Test 2: Check database connectivity
echo "🗃  Testing database connection..."
if docker compose exec db pg_isready -U postgres -d postgres > /dev/null 2>&1; then
    echo "   ✅ Database is accessible"
else
    echo "   ❌ Database is not accessible"
    exit 1
fi

# Test 3: Check if tables exist
echo "📊 Checking database tables..."
TABLE_COUNT=$(docker compose exec db psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
if [ "$TABLE_COUNT" -gt 5 ]; then
    echo "   ✅ Database tables created ($TABLE_COUNT tables)"
else
    echo "   ❌ Database tables not found"
    exit 1
fi

# Test 4: Check if RLS is enabled
echo "🔐 Checking Row Level Security..."
RLS_COUNT=$(docker compose exec db psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;" 2>/dev/null | tr -d ' ')
if [ "$RLS_COUNT" -gt 3 ]; then
    echo "   ✅ Row Level Security is enabled ($RLS_COUNT tables)"
else
    echo "   ❌ Row Level Security not properly configured"
    exit 1
fi

# Test 5: Check Kong gateway
echo "🌐 Testing Kong gateway..."
if curl -s http://localhost:8000 > /dev/null 2>&1; then
    echo "   ✅ Kong gateway is responding"
else
    echo "   ❌ Kong gateway is not responding"
    exit 1
fi

# Test 6: Check app container
echo "📱 Testing app container..."
if curl -s http://localhost:19006 > /dev/null 2>&1; then
    echo "   ✅ App container is responding"
else
    echo "   ❌ App container is not responding"
    exit 1
fi

# Test 7: Test auth endpoint
echo "🔑 Testing auth endpoint..."
if curl -s http://localhost:8000/supabase/auth/v1/health > /dev/null 2>&1; then
    echo "   ✅ Auth service is working"
else
    echo "   ❌ Auth service is not working"
    exit 1
fi

# Test 8: Test REST API
echo "🚀 Testing REST API..."
if curl -s http://localhost:8000/supabase/rest/v1/profiles > /dev/null 2>&1; then
    echo "   ✅ REST API is working"
else
    echo "   ❌ REST API is not working"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Setup is working correctly."
echo "=================================="
echo ""
echo "🌐 Access your application at: http://localhost:19006"
echo "🔧 API Gateway available at: http://localhost:8000"
echo ""
echo "✨ Ready to start tracking! 🍺"