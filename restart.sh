#!/bin/bash
# Restart Memory Server

echo "🔄 Restarting Memory Server..."
./stop.sh
sleep 3
./start.js
