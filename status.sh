#!/bin/bash
# Check Memory Server Status

echo "📊 Memory Server Status"
echo "====================="

# Check HTTP server
if nc -z localhost $SERVER_PORT 2>/dev/null; then
    echo "✅ HTTP Server: Running on port $SERVER_PORT"
else
    echo "❌ HTTP Server: Not running"
fi

# Check MCP server
if nc -z localhost $MCP_PORT 2>/dev/null; then
    echo "✅ MCP Server: Running on port $MCP_PORT"
else
    echo "❌ MCP Server: Not running"
fi

# Check processes
if pgrep -f "node.*start.js" > /dev/null; then
    echo "✅ Memory Process: Running"
else
    echo "❌ Memory Process: Not running"
fi

if pgrep -f "node.*mcp-server.js" > /dev/null; then
    echo "✅ MCP Process: Running"
else
    echo "❌ MCP Process: Not running"
fi

echo "====================="
