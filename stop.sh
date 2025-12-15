#!/bin/bash
# Stop Memory Server

echo "🛑 Stopping Memory Server..."
pkill -f "node.*start.js" || true
pkill -f "node.*mcp-server.js" || true
echo "✓ Memory Server stopped"
