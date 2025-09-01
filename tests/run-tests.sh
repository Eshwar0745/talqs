#!/bin/bash

# TALQS API Test Runner
# This script starts the necessary services and runs the comprehensive API tests

echo "🚀 TALQS API Test Runner"
echo "========================"

# Configuration
BASE_URL="${TEST_BASE_URL:-http://localhost:3000}"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/talqs-test}"

echo "📋 Test Configuration:"
echo "   Base URL: $BASE_URL"
echo "   MongoDB URI: $MONGODB_URI"
echo ""

# Function to check if a service is running
check_service() {
    local url=$1
    local name=$2
    
    if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
        echo "✅ $name is running"
        return 0
    else
        echo "❌ $name is not responding"
        return 1
    fi
}

# Function to wait for service
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --max-time 2 "$url" > /dev/null 2>&1; then
            echo "✅ $name is ready"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts - $name not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $name failed to start within expected time"
    return 1
}

echo "🔍 Checking service status..."

# Check if Next.js app is running
if ! check_service "$BASE_URL/api/test-mongodb" "TALQS API Server"; then
    echo ""
    echo "❌ TALQS API Server is not running!"
    echo "   Please start the development server with: npm run dev"
    echo "   Then run this test again."
    exit 1
fi

# Check MongoDB connection through the API
echo "📊 Checking MongoDB connection..."
MONGO_STATUS=$(curl -s "$BASE_URL/api/test-mongodb" | grep -o '"statusText":"[^"]*"' | cut -d'"' -f4)
if [ "$MONGO_STATUS" = "connected" ]; then
    echo "✅ MongoDB is connected"
else
    echo "⚠️  MongoDB status: $MONGO_STATUS"
    echo "   Tests will proceed but some may fail without MongoDB"
fi

# Check external Python backends (optional)
echo "🔧 Checking external services..."
if check_service "http://localhost:8001/health" "Summarization Backend"; then
    echo "✅ Summarization service available"
else
    echo "⚠️  Summarization Backend not running (Port 8001)"
    echo "   Document processing tests may fail"
fi

if check_service "http://localhost:8000/health" "Q&A Backend"; then
    echo "✅ Q&A service available"
else
    echo "⚠️  Q&A Backend not running (Port 8000)"
    echo "   Question answering tests may fail"
fi

echo ""
echo "🧪 Running comprehensive API tests..."
echo "======================================"

# Set environment variables for the test
export TEST_BASE_URL="$BASE_URL"
export NODE_ENV="test"

# Run the test suite
if command -v node >/dev/null 2>&1; then
    node tests/api-test-suite.js
    TEST_EXIT_CODE=$?
else
    echo "❌ Node.js not found. Please install Node.js to run tests."
    exit 1
fi

echo ""
echo "📋 Test Summary:"
echo "================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed successfully!"
    echo "   The TALQS API is functioning correctly."
else
    echo "❌ Some tests failed."
    echo "   Please review the test results above for specific issues."
fi

echo ""
echo "🔗 Next Steps:"
echo "=============="
echo "1. Review any failed tests and their error messages"
echo "2. Check service logs for additional debugging information"
echo "3. Ensure all required services are running:"
echo "   - Next.js dev server: npm run dev"
echo "   - MongoDB: Check connection string in .env"
echo "   - Python backends: Check ports 8000 and 8001"

exit $TEST_EXIT_CODE