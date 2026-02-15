#!/bin/bash
cd /home/ubuntu/.openclaw/workspace/dicode-app-jobseeker/backend

echo "Starting server..."
PORT=3001 node src/index.js > /tmp/server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server to start
sleep 8

echo "=== Testing /api/scrape/sources ==="
curl -s http://localhost:3001/api/scrape/sources
echo ""

echo "=== Testing /api/scrape (POST) ==="
curl -s -X POST http://localhost:3001/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"keywords":"javascript","limit":5}' | python3 -m json.tool 2>/dev/null || echo "JSON parse error"

echo ""
echo "=== Testing /api/scrape/custom ==="
curl -s -X POST http://localhost:3001/api/scrape/custom \
  -H "Content-Type: application/json" \
  -d '{"sources":["remoteok","weworkremotely"],"keywords":"react","limit":5}' | python3 -m json.tool 2>/dev/null || echo "JSON parse error"

echo ""
echo "=== Testing /api/jobs ==="
curl -s http://localhost:3001/api/jobs?limit=3 | python3 -m json.tool 2>/dev/null | head -50

echo ""
echo "=== Testing /api/jobs/count ==="
curl -s http://localhost:3001/api/jobs/count

echo ""
echo "=== Testing /api/stats ==="
curl -s http://localhost:3001/api/stats

echo ""
echo "Killing server..."
kill $SERVER_PID 2>/dev/null
