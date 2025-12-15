#!/bin/bash

# Memory Server Health Check
HEALTH_URL="http://localhost:$SERVER_PORT/health"
CHROMA_URL="http://$CHROMA_HOST:$CHROMA_PORT/api/v1/heartbeat"

echo "🏥 Memory Server Health Check"
echo "============================="

# Check HTTP server
if curl -s $HEALTH_URL | grep -q "ok"; then
    echo "✅ HTTP Server: Healthy"
else
    echo "❌ HTTP Server: Unhealthy"
fi

# Check ChromaDB
if curl -s -u admin:admin $CHROMA_URL | grep -q "heartbeat"; then
    echo "✅ ChromaDB: Healthy"
else
    echo "❌ ChromaDB: Unhealthy"
fi

# Check memory count
MEMORY_COUNT=$(curl -s $HEALTH_URL | grep -o '"memories":[0-9]*' | cut -d':' -f2)
echo "📊 Memory Count: $MEMORY_COUNT"

echo "============================="
