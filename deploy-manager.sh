#!/bin/bash

# Memory Server Deployment Manager
# This script provides deployment management for the memory server

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_PORT=3000
MCP_PORT=8080
CHROMA_HOST="192.168.68.69"
CHROMA_PORT=8001

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "start.js" ] || [ ! -f "config.json" ]; then
        print_error "Not in memory server directory. Please run this script from the memory server root."
        exit 1
    fi
}

# Get server status
get_status() {
    check_directory
    
    local http_status=0
    local mcp_status=0
    
    # Check HTTP server
    if nc -z localhost $SERVER_PORT 2>/dev/null; then
        http_status=1
    fi
    
    # Check MCP server
    if nc -z localhost $MCP_PORT 2>/dev/null; then
        mcp_status=1
    fi
    
    echo "$http_status:$mcp_status"
}

# Start servers
start() {
    check_directory
    
    local status=$(get_status)
    local http_running=$((status & 1))
    local mcp_running=$((status & 2))
    
    if [ $http_running -eq 1 ] && [ $mcp_running -eq 1 ]; then
        print_warning "Both servers are already running"
    else
        print_info "Starting servers..."
        
        # Start HTTP server in background
        if [ $http_running -eq 0 ]; then
            nohup node start.js > logs/server.log 2>&1 &
            print_status "HTTP server started on port $SERVER_PORT"
        fi
        
        # Start MCP server in background
        if [ $mcp_running -eq 0 ]; then
            nohup node server/mcp-server.js > logs/mcp-server.log 2>&1 &
            print_status "MCP server started on port $MCP_PORT"
        fi
        
        # Wait for servers to start
        sleep 3
        
        # Verify servers are running
        local new_status=$(get_status)
        if [ "$new_status" = "1:1" ]; then
            print_status "All servers started successfully"
        else
            print_error "Failed to start all servers"
            exit 1
        fi
    fi
}

# Stop servers
stop() {
    check_directory
    
    print_info "Stopping servers..."
    
    # Stop HTTP server
    pkill -f "node.*start.js" || true
    print_status "HTTP server stopped"
    
    # Stop MCP server
    pkill -f "node.*mcp-server.js" || true
    print_status "MCP server stopped"
    
    # Wait for processes to terminate
    sleep 2
    
    # Verify servers are stopped
    local status=$(get_status)
    if [ "$status" = "0:0" ]; then
        print_status "All servers stopped successfully"
    else
        print_warning "Some servers may still be running"
    fi
}

# Restart servers
restart() {
    print_info "Restarting servers..."
    stop
    sleep 3
    start
}

# Show server status
status() {
    check_directory
    
    echo "📊 Memory Server Status"
    echo "======================"
    
    local status=$(get_status)
    local http_running=$((status & 1))
    local mcp_running=$((status & 2))
    
    # HTTP server status
    if [ $http_running -eq 1 ]; then
        print_status "HTTP Server: Running on port $SERVER_PORT"
        
        # Test health endpoint
        if curl -s http://localhost:$SERVER_PORT/health | grep -q "ok"; then
            print_status "Health Check: ✅"
        else
            print_error "Health Check: ❌"
        fi
    else
        print_error "HTTP Server: Not running"
    fi
    
    # MCP server status
    if [ $mcp_running -eq 1 ]; then
        print_status "MCP Server: Running on port $MCP_PORT"
        
        # Test MCP connection
        if echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | nc localhost $MCP_PORT | grep -q "tools"; then
            print_status "MCP Health: ✅"
        else
            print_error "MCP Health: ❌"
        fi
    else
        print_error "MCP Server: Not running"
    fi
    
    # Check ChromaDB connection
    if curl -s -u admin:admin http://$CHROMA_HOST:$CHROMA_PORT/api/v1/heartbeat | grep -q "heartbeat"; then
        print_status "ChromaDB: Connected"
    else
        print_error "ChromaDB: Connection failed"
    fi
    
    # Check processes
    if pgrep -f "node.*start.js" > /dev/null; then
        print_status "Memory Process: Running"
    else
        print_error "Memory Process: Not running"
    fi
    
    if pgrep -f "node.*mcp-server.js" > /dev/null; then
        print_status "MCP Process: Running"
    else
        print_error "MCP Process: Not running"
    fi
    
    echo "======================"
}

# Show logs
logs() {
    check_directory
    
    local service="$1"
    
    case "$service" in
        "http"|"server")
            print_info "HTTP server logs:"
            tail -f logs/server.log
            ;;
        "mcp")
            print_info "MCP server logs:"
            tail -f logs/mcp-server.log
            ;;
        "chroma")
            print_info "ChromaDB logs:"
            tail -f logs/chromadb.log
            ;;
        *)
            print_info "Available log options: http, mcp, chroma"
            print_info "Usage: $0 logs [service]"
            ;;
    esac
}

# Health check
health() {
    check_directory
    
    print_info "Performing health check..."
    
    # Check HTTP server
    if curl -s http://localhost:$SERVER_PORT/health | grep -q "ok"; then
        print_status "HTTP Server: ✅ Healthy"
    else
        print_error "HTTP Server: ❌ Unhealthy"
    fi
    
    # Check MCP server
    if echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | nc localhost $MCP_PORT | grep -q "tools"; then
        print_status "MCP Server: ✅ Healthy"
    else
        print_error "MCP Server: ❌ Unhealthy"
    fi
    
    # Check ChromaDB
    if curl -s -u admin:admin http://$CHROMA_HOST:$CHROMA_PORT/api/v1/heartbeat | grep -q "heartbeat"; then
        print_status "ChromaDB: ✅ Connected"
    else
        print_error "ChromaDB: ❌ Connection failed"
    fi
    
    # Check memory count
    local memory_count=$(curl -s http://localhost:$SERVER_PORT/health | grep -o '"memories":[0-9]*' | cut -d':' -f2)
    if [ -n "$memory_count" ]; then
        print_info "Memory Count: $memory_count"
    else
        print_warning "Memory Count: Unable to retrieve"
    fi
}

# Backup data
backup() {
    check_directory
    
    local backup_dir="./backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="memory_backup_$timestamp.tar.gz"
    
    print_info "Creating backup..."
    
    # Create backup
    tar -czf "$backup_dir/$backup_file" \
        --exclude="node_modules" \
        --exclude="logs/*.log" \
        --exclude="backups" \
        ./
    
    # Keep only last 7 backups
    ls -t $backup_dir/memory_backup_*.tar.gz | tail -n +8 | xargs rm -f 2>/dev/null || true
    
    print_status "Backup completed: $backup_dir/$backup_file"
}

# Show help
show_help() {
    echo "Memory Server Deployment Manager"
    echo "================================"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  start      - Start the memory servers"
    echo "  stop       - Stop the memory servers"
    echo "  restart    - Restart the memory servers"
    echo "  status     - Show server status"
    echo "  logs       - Show server logs"
    echo "  health     - Perform health check"
    echo "  backup     - Create data backup"
    echo "  help       - Show this help message"
    echo ""
    echo "Log Options:"
    echo "  logs http  - Show HTTP server logs"
    echo "  logs mcp   - Show MCP server logs"
    echo "  logs chroma- Show ChromaDB logs"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 logs http"
    echo "  $0 health"
    echo ""
}

# Main script logic
main() {
    local command="$1"
    
    case "$command" in
        "start")
            start
            ;;
        "stop")
            stop
            ;;
        "restart")
            restart
            ;;
        "status")
            status
            ;;
        "logs")
            logs "$2"
            ;;
        "health")
            health
            ;;
        "backup")
            backup
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        "")
            print_error "No command specified. Use 'help' for usage."
            exit 1
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"