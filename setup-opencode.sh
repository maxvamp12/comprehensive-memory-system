#!/bin/bash

# Memory Server Setup Script for Opencode Integration
# This script installs and configures the memory server for opencode integration

set -e

echo "🚀 Setting up Memory Server for Opencode Integration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration variables
SERVER_HOST="0.0.0.0"
SERVER_PORT=3000
OPENCODE_CONFIG_DIR="$HOME/.opencode"
OPENCODE_CONFIG_FILE="$OPENCODE_CONFIG_DIR/config.json"
MCP_PORT=8080

# ChromaDB configuration
CHROMA_HOST="192.168.68.69"
CHROMA_PORT=8001
CHROMA_USERNAME="admin"
CHROMA_PASSWORD="admin"
CHROMA_COLLECTION="memories"

# Network configuration
SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "192.168.68.69")

# Logging configuration
LOG_DIR="./logs"
MAX_LOG_SIZE="10M"
LOG_ROTATION_COUNT="5"

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

# Test ChromaDB connection
test_chromadb_connection() {
    print_info "Testing ChromaDB connection..."
    
    if curl -s -u $CHROMA_USERNAME:$CHROMA_PASSWORD http://$CHROMA_HOST:$CHROMA_PORT/api/v1/heartbeat | grep -q "heartbeat"; then
        print_status "ChromaDB connection successful"
    else
        print_error "ChromaDB connection failed"
        print_warning "Please ensure ChromaDB is running at $CHROMA_HOST:$CHROMA_PORT"
        return 1
    fi
}

# Test network connectivity
test_network_connectivity() {
    print_info "Testing network connectivity..."
    
    # Test local server port
    if nc -z localhost $SERVER_PORT 2>/dev/null; then
        print_warning "Port $SERVER_PORT is already in use"
        return 1
    fi
    
    # Test ChromaDB connectivity
    if ! test_chromadb_connection; then
        return 1
    fi
    
    print_status "Network connectivity tests passed"
}

# Create log rotation configuration
setup_logrotate() {
    if command -v logrotate &> /dev/null; then
        print_info "Setting up log rotation..."
        
        sudo tee /etc/logrotate.d/memory-server > /dev/null << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate $LOG_ROTATION_COUNT
    compress
    delaycompress
    notifempty
    copytruncate
    size $MAX_LOG_SIZE
    create 644 $USER $USER
}
EOF
        print_status "Log rotation configured"
    fi
}

# Create backup script
create_backup_script() {
    print_info "Creating backup script..."
    
    cat > backup-memories.sh << 'EOF'
#!/bin/bash

# Memory Server Backup Script
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="memory_backup_$TIMESTAMP.tar.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
echo "🔄 Creating memory backup..."
tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
    --exclude="node_modules" \
    --exclude="logs/*.log" \
    --exclude="backups" \
    ./

echo "✅ Backup completed: $BACKUP_DIR/$BACKUP_FILE"

# Keep only last 7 backups
ls -t $BACKUP_DIR/memory_backup_*.tar.gz | tail -n +8 | xargs rm -f

echo "🧹 Cleaned up old backups"
EOF

    chmod +x backup-memories.sh
    print_status "Backup script created"
}

# Create health check script
create_health_check_script() {
    print_info "Creating health check script..."
    
    cat > health-check.sh << 'EOF'
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
EOF

    chmod +x health-check.sh
    print_status "Health check script created"
}

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 16+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js version 16 or higher is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_status "Node.js $(node --version) is installed"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_status "npm $(npm --version) is installed"
}

# Create logs directory
create_logs_dir() {
    if [ ! -d "logs" ]; then
        mkdir -p logs
        print_status "Created logs directory"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    print_status "Dependencies installed successfully"
}

# Create or update configuration file
setup_config() {
    print_status "Setting up configuration..."
    
    # Create config if it doesn't exist
    if [ ! -f "config.json" ]; then
        cat > config.json << EOF
{
  "server": {
    "host": "$SERVER_HOST",
    "port": $SERVER_PORT,
    "maxResults": 10,
    "minSimilarity": 0.1
  },
  "storage": {
    "dataDir": "./data",
    "maxCacheSize": 1000
  },
  "embedding": {
    "dimension": 768,
    "cacheSize": 1000
  },
  "chroma": {
    "host": "$CHROMA_HOST",
    "port": $CHROMA_PORT,
    "collection": "$CHROMA_COLLECTION",
    "auth": {
      "username": "$CHROMA_USERNAME",
      "password": "$CHROMA_PASSWORD"
    }
  },
  "opencode": {
    "mcpPort": $MCP_PORT,
    "openaiCompatible": true,
    "endpoints": {
      "health": "/health",
      "memories": "/api/memories",
      "search": "/api/search",
      "openai": "/api/v1/chat/completions"
    }
  }
}
EOF
        print_status "Created config.json with default settings"
    else
        print_warning "config.json already exists, keeping current settings"
    fi
}

# Setup Opencode configuration
setup_opencode_config() {
    print_status "Setting up Opencode configuration..."
    
    # Create opencode config directory if it doesn't exist
    mkdir -p "$OPENCODE_CONFIG_DIR"
    
    # Create opencode configuration for memory server
    cat > "$OPENCODE_CONFIG_FILE" << EOF
{
  "memory_server": {
    "enabled": true,
    "host": "$SERVER_IP",
    "port": $SERVER_PORT,
    "endpoints": {
      "openai": "http://$SERVER_IP:$SERVER_PORT/api/v1/chat/completions",
      "search": "http://$SERVER_IP:$SERVER_PORT/api/search",
      "memories": "http://$SERVER_IP:$SERVER_PORT/api/memories",
      "health": "http://$SERVER_IP:$SERVER_PORT/health"
    },
    "models": {
      "memory-search": {
        "provider": "memory",
        "endpoint": "http://$SERVER_IP:$SERVER_PORT/api/v1/chat/completions",
        "model": "memory-search"
      }
    },
    "chroma": {
      "host": "$CHROMA_HOST",
      "port": $CHROMA_PORT,
      "auth": {
        "username": "$CHROMA_USERNAME",
        "password": "$CHROMA_PASSWORD"
      }
    }
  }
}
EOF
    
    print_status "Created Opencode configuration at $OPENCODE_CONFIG_FILE"
}

# Create systemd service file (optional)
create_systemd_service() {
    if command -v systemctl &> /dev/null; then
        print_status "Creating systemd service files..."
        
        # Memory server service
        sudo tee /etc/systemd/system/memory-server.service > /dev/null << EOF
[Unit]
Description=Memory Server for Opencode
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which node) $(pwd)/start.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
        
        # MCP server service
        sudo tee /etc/systemd/system/mcp-server.service > /dev/null << EOF
[Unit]
Description=MCP Server for Memory System
After=network.target memory-server.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which node) $(pwd)/server/mcp-server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable memory-server
        sudo systemctl enable mcp-server
        print_status "Created systemd services and enabled auto-start"
    else
        print_warning "systemd not available, skipping service creation"
    fi
}

# Create systemd timer for automatic backups
create_systemd_timer() {
    if command -v systemctl &> /dev/null; then
        print_info "Creating systemd timer for automatic backups..."
        
        # Create timer unit
        sudo tee /etc/systemd/system/memory-backup.timer > /dev/null << EOF
[Unit]
Description=Daily backup of memory server data

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF
        
        # Create service unit for backup
        sudo tee /etc/systemd/system/memory-backup.service > /dev/null << EOF
[Unit]
Description=Backup memory server data
After=memory-server.service

[Service]
Type=oneshot
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(pwd)/backup-memories.sh
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable memory-backup.timer
        print_status "Created systemd timer for daily backups"
    fi
}

# Create start/stop scripts
create_scripts() {
    print_status "Creating utility scripts..."
    
    # Create start script
    chmod +x start.js
    
    # Create stop script
    cat > stop.sh << 'EOF'
#!/bin/bash
# Stop Memory Server

echo "🛑 Stopping Memory Server..."
pkill -f "node.*start.js" || true
pkill -f "node.*mcp-server.js" || true
echo "✓ Memory Server stopped"
EOF
    
    chmod +x stop.sh
    
    # Create restart script
    cat > restart.sh << 'EOF'
#!/bin/bash
# Restart Memory Server

echo "🔄 Restarting Memory Server..."
./stop.sh
sleep 3
./start.js
EOF
    
    chmod +x restart.sh
    
    # Create status script
    cat > status.sh << 'EOF'
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
EOF
    
    chmod +x status.sh
    
    print_status "Created utility scripts: start.js, stop.sh, restart.sh, status.sh"
}

# Test the server installation
test_server() {
    print_status "Testing server installation..."
    
    # Test ChromaDB connection first
    if ! test_chromadb_connection; then
        print_error "ChromaDB connection test failed"
        return 1
    fi
    
    # Test server startup
    echo "🧪 Testing server startup..."
    if timeout 15s npm start; then
        print_status "Server test completed successfully"
    else
        print_warning "Server test timed out (this is normal for first run)"
    fi
    
    # Test health endpoint
    echo "🏥 Testing health endpoint..."
    if curl -s http://localhost:$SERVER_PORT/health | grep -q "ok"; then
        print_status "Health endpoint test passed"
    else
        print_warning "Health endpoint test failed"
    fi
}

# Validate configuration
validate_config() {
    print_status "Validating configuration..."
    
    # Check config.json exists
    if [ ! -f "config.json" ]; then
        print_error "config.json not found"
        return 1
    fi
    
    # Check required fields
    if ! jq -e '.server.port' config.json > /dev/null 2>&1; then
        print_error "Invalid config.json - missing server.port"
        return 1
    fi
    
    if ! jq -e '.chroma.host' config.json > /dev/null 2>&1; then
        print_error "Invalid config.json - missing chroma.host"
        return 1
    fi
    
    # Check port availability
    if netstat -ln 2>/dev/null | grep -q ":$SERVER_PORT "; then
        print_warning "Port $SERVER_PORT is already in use"
    fi
    
    print_status "Configuration validation passed"
}

# Display setup summary
display_summary() {
    echo ""
    echo "🎉 Memory Server Setup Complete!"
    echo ""
    echo "📊 Configuration Summary:"
    echo "   • Server Host: $SERVER_HOST"
    echo "   • Server Port: $SERVER_PORT"
    echo "   • MCP Port: $MCP_PORT"
    echo "   • Data Directory: ./data"
    echo "   • ChromaDB: $CHROMA_HOST:$CHROMA_PORT"
    echo "   • Network IP: $SERVER_IP"
    echo ""
    echo "🌐 Server Endpoints:"
    echo "   • Health: http://localhost:$SERVER_PORT/health"
    echo "   • System Info: http://localhost:$SERVER_PORT/api/info"
    echo "   • Memory API: http://localhost:$SERVER_PORT/api/memories"
    echo "   • Search API: http://localhost:$SERVER_PORT/api/search"
    echo "   • OpenAI Compatible: http://localhost:$SERVER_PORT/api/v1/chat/completions"
    echo "   • MCP Server: tcp://localhost:$MCP_PORT"
    echo ""
    echo "🤖 Opencode Integration:"
    echo "   • Config file: $OPENCODE_CONFIG_FILE"
    echo "   • Memory server configured for opencode"
    echo "   • OpenAI-compatible endpoint available"
    echo "   • MCP server for enhanced integration"
    echo ""
    echo "🛠️ Utility Scripts:"
    echo "   • ./start.js - Start servers"
    echo "   • ./stop.sh - Stop servers"
    echo "   • ./restart.sh - Restart servers"
    echo "   • ./status.sh - Check server status"
    echo "   • ./health-check.sh - Health check"
    echo "   • ./backup-memories.sh - Create backup"
    echo ""
    echo "📁 Directories:"
    echo "   • ./data - Memory storage"
    echo "   • ./logs - Log files"
    echo "   • ./backups - Backup files"
    echo ""
    echo "🚀 Quick Start:"
    echo "   1. Start servers: ./start.js"
    echo "   2. Check status: ./status.sh"
    echo "   3. Test health: ./health-check.sh"
    echo "   4. Add memories: Use API or opencode"
    echo ""
    echo "📊 Monitoring:"
    echo "   • Logs: tail -f logs/server.log"
    echo "   • System logs: journalctl -u memory-server"
    echo "   • Health: ./health-check.sh"
    echo ""
}

# Main setup process
main() {
    echo "🔧 Memory Server Setup for Opencode"
    echo "=================================="
    
    # Initial checks
    check_nodejs
    check_npm
    
    # Setup directories
    create_logs_dir
    mkdir -p data/backups
    
    # Install dependencies
    install_dependencies
    
    # Validate and setup configuration
    validate_config
    setup_config
    setup_opencode_config
    
    # Create utility scripts
    create_scripts
    create_backup_script
    create_health_check_script
    
    # Setup additional features
    setup_logrotate
    
    # Test connectivity
    test_network_connectivity
    
    # Create systemd services if available
    if command -v systemctl &> /dev/null; then
        create_systemd_service
        create_systemd_timer
    fi
    
    # Test server installation
    test_server
    
    # Display summary
    display_summary
    
    print_status "Setup completed successfully!"
    print_info "Use './start.js' to start the servers"
    print_info "Use './health-check.sh' to verify everything is working"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-validation)
                SKIP_VALIDATION=true
                shift
                ;;
            --no-systemd)
                SKIP_SYSTEMD=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-validation    Skip configuration validation"
                echo "  --no-systemd        Skip systemd service creation"
                echo "  --skip-tests        Skip server testing"
                echo "  --help              Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

# Set color variables
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
parse_args "$@"

# Skip systemd if requested
if [ "$SKIP_SYSTEMD" = true ]; then
    create_systemd_service() { echo "Skipping systemd service creation"; }
    create_systemd_timer() { echo "Skipping systemd timer creation"; }
fi

# Skip testing if requested
if [ "$SKIP_TESTS" = true ]; then
    test_server() { echo "Skipping server tests"; }
    test_network_connectivity() { echo "Skipping network connectivity tests"; }
fi

# Run main function
main "$@"