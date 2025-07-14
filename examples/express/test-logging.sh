#!/bin/bash

echo "🧪 Testing Drizzle REST Adapter with Logging"
echo "============================================"
echo ""

# Start the server in the background with verbose logging
echo "🚀 Starting server with verbose logging..."
cd /workspaces/drizzle-rest/examples/express
LOG_LEVEL=debug npm start &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

echo "📋 Testing various API endpoints to demonstrate logging:"
echo ""

echo "1. 📝 Creating a new user..."
curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com"}' | jq .

echo ""
echo "2. 📖 Getting all users..."
curl -s http://localhost:3000/api/v1/users | jq .

echo ""
echo "3. 🔍 Getting user with ID 1..."
curl -s http://localhost:3000/api/v1/users/1 | jq .

echo ""
echo "4. 🔄 Updating user with ID 1..."
curl -s -X PATCH http://localhost:3000/api/v1/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated User"}' | jq .

echo ""
echo "5. 📊 Getting posts with filters and sorting..."
curl -s "http://localhost:3000/api/v1/posts?published=1&_sort=-createdAt&_page=1&_per_page=3" | jq .

echo ""
echo "6. 🔗 Getting posts with embedded relationships..."
curl -s "http://localhost:3000/api/v1/posts?_embed=user,comments&_page=1&_per_page=2" | jq .

echo ""
echo "7. ❌ Testing error handling (non-existent user)..."
curl -s http://localhost:3000/api/v1/users/99999 | jq .

echo ""
echo "8. ❌ Testing validation error..."
curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}' | jq .

echo ""
echo "9. 📋 Getting OpenAPI documentation..."
curl -s http://localhost:3000/api/v1/openapi.json | jq '.info'

echo ""
echo "✅ Test completed! Check the server logs to see the structured logging output."
echo "🛑 Stopping server..."

# Stop the server
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null

echo "✨ Done!"
