#!/bin/bash

# Memory System Deployment Script for SARK/CLU Cluster
# This script deploys the memory system as a Docker container on your cluster

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_IP=${CLU_IP:-"192.168.68.71"}  # Default to CLU
CONTAINER_NAME="memory-system"
EXTERNAL_CHROMA_HOST="192.168.68.69"
EXTERNAL_CHROMA_PORT="8001"

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

# Check prerequisites
check_prerequisites() {
    print_info "Checking deployment prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_status "Docker is installed"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    print_status "Docker Compose is installed"
    
    # Check if ChromaDB is accessible
    if ! curl -f -s -u admin:admin http://$EXTERNAL_CHROMA_HOST:$EXTERNAL_CHROMA_PORT/api/v1/heartbeat > /dev/null; then
        print_error "Cannot connect to ChromaDB at $EXTERNAL_CHROMA_HOST:$EXTERNAL_CHROMA_PORT"
        print_info "Please ensure ChromaDB is running and accessible"
        exit 1
    fi
    print_status "ChromaDB connection verified"
}

# Create deployment directory
setup_deployment() {
    print_info "Setting up deployment directory..."
    
    DEPLOY_DIR="/opt/memory-system"
    if [ ! -d "$DEPLOY_DIR" ]; then
        sudo mkdir -p "$DEPLOY_DIR"
        sudo chown $USER:$USER "$DEPLOY_DIR"
    fi
    
    cd "$DEPLOY_DIR"
    print_status "Deployment directory ready: $DEPLOY_DIR"
}

# Create optimized production Dockerfile
create_dockerfile() {
    print_info "Creating optimized Dockerfile..."
    
    cat > Dockerfile << 'EOF'
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Create logs directory
RUN mkdir -p logs

# Expose ports
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start with dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "start.js"]
EOF
    
    print_status "Dockerfile created"
}

# Create production docker-compose file
create_docker_compose() {
    print_info "Creating production docker-compose configuration..."
    
    cat > docker-compose.yml << EOF
version: '3.8'

services:
  memory-system:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: $CONTAINER_NAME
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SERVER_HOST=0.0.0.0
      - SERVER_PORT=3000
      - CHROMA_HOST=$EXTERNAL_CHROMA_HOST
      - CHROMA_PORT=$EXTERNAL_CHROMA_PORT
      - CHROMA_USERNAME=admin
      - CHROMA_PASSWORD=admin
      - CHROMA_COLLECTION=memories
      - MAX_RESULTS=10
      - MIN_SIMILARITY=0.1
      - DATA_DIR=/app/data
      - LOG_LEVEL=info
    volumes:
      - data_volume:/app/data
      - logs_volume:/app/logs
    networks:
      - memory-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  api-gateway:
    image: nginx:alpine
    container_name: memory-system-gateway
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - memory-system
    networks:
      - memory-network

networks:
  memory-network:
    driver: bridge

volumes:
  data_volume:
    driver: local
  logs_volume:
    driver: local
EOF
    
    print_status "Production docker-compose created"
}

# Create nginx configuration
create_nginx_config() {
    print_info "Creating nginx configuration..."
    
    cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream memory_system {
        server memory-system:3000;
    }

    # HTTP server
    server {
        listen 80;
        server_name _;

        # Health check
        location /health {
            proxy_pass http://memory_system/health;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Memory API endpoints
        location /api/ {
            proxy_pass http://memory_system;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # OpenAI compatible endpoint
        location /api/v1/ {
            proxy_pass http://memory_system;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
    }
}
EOF
    
    print_status "Nginx configuration created"
}

# Create deployment scripts
create_scripts() {
    print_info "Creating deployment scripts..."
    
    # Create start script
    cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Memory System..."
docker-compose up -d
echo "✅ Memory System started"
echo "🌐 Available at: http://localhost:3000"
EOF
    
    # Create stop script
    cat > stop.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping Memory System..."
docker-compose down
echo "✅ Memory System stopped"
EOF
    
    # Create restart script
    cat > restart.sh << 'EOF'
#!/bin/bash
echo "🔄 Restarting Memory System..."
docker-compose restart
echo "✅ Memory System restarted"
EOF
    
    # Create status script
    cat > status.sh << 'EOF'
#!/bin/bash
echo "📊 Memory System Status"
echo "======================="
docker-compose ps
echo ""
echo "🌐 Health Check:"
curl -s http://localhost:3000/health | jq . 2>/dev/null || echo "Health check failed"
EOF
    
    # Create logs script
    cat > logs.sh << 'EOF'
#!/bin/bash
echo "📋 Memory System Logs"
echo "===================="
docker-compose logs -f --tail=100
EOF
    
    # Make scripts executable
    chmod +x *.sh
    
    print_status "Deployment scripts created"
}

# Create client configuration
create_client_config() {
    print_info "Creating client configuration..."
    
    cat > client-config.json << EOF
{
  "memory_system": {
    "api_base_url": "http://$CLUSTER_IP:3000",
    "api_endpoints": {
      "health": "http://$CLUSTER_IP:3000/health",
      "memories": "http://$CLUSTER_IP:3000/api/memories",
      "search": "http://$CLUSTER_IP:3000/api/search",
      "openai": "http://$CLUSTER_IP:3000/api/v1/chat/completions",
      "info": "http://$CLUSTER_IP:3000/api/info"
    },
    "chroma_config": {
      "host": "$EXTERNAL_CHROMA_HOST",
      "port": $EXTERNAL_CHROMA_PORT,
      "auth": {
        "username": "admin",
        "password": "admin"
      }
    },
    "models": {
      "memory-search": {
        "provider": "memory",
        "endpoint": "http://$CLUSTER_IP:3000/api/v1/chat/completions",
        "model": "memory-search"
      }
    }
  }
}
EOF
    
    print_status "Client configuration created"
}

# Deploy the system
deploy_system() {
    print_info "Deploying Memory System..."
    
    # Build and start containers
    docker-compose build
    docker-compose up -d
    
    # Wait for service to be healthy
    print_info "Waiting for service to be healthy..."
    sleep 30
    
    # Check service status
    if curl -f http://localhost:3000/health > /dev/null; then
        print_status "Memory System deployed successfully!"
    else
        print_error "Memory System deployment failed"
        print_info "Check logs: docker-compose logs"
        exit 1
    fi
}

# Display deployment summary
display_summary() {
    echo ""
    echo "🎉 Memory System Deployment Complete!"
    echo ""
    echo "📊 Deployment Summary:"
    echo "   • Cluster IP: $CLUSTER_IP"
    echo "   • Container Name: $CONTAINER_NAME"
    echo "   • External ChromaDB: $EXTERNAL_CHROMA_HOST:$EXTERNAL_CHROMA_PORT"
    echo "   • API Base URL: http://$CLUSTER_IP:3000"
    echo ""
    echo "🌐 Available Endpoints:"
    echo "   • Health: http://$CLUSTER_IP:3000/health"
    echo "   • System Info: http://$CLUSTER_IP:3000/api/info"
    echo "   • Memory API: http://$CLUSTER_IP:3000/api/memories"
    echo "   • Search API: http://$CLUSTER_IP:3000/api/search"
    echo "   • OpenAI Compatible: http://$CLUSTER_IP:3000/api/v1/chat/completions"
    echo ""
    echo "🤖 Client Configuration:"
    echo "   • Config file: $DEPLOY_DIR/client-config.json"
    echo ""
    echo "🛠️ Management Commands:"
    echo "   • Start: $DEPLOY_DIR/start.sh"
    echo "   • Stop: $DEPLOY_DIR/stop.sh"
    echo "   • Restart: $DEPLOY_DIR/restart.sh"
    echo "   • Status: $DEPLOY_DIR/status.sh"
    echo "   • Logs: $DEPLOY_DIR/logs.sh"
    echo ""
    echo "📊 Monitoring:"
    echo "   • Health: http://$CLUSTER_IP:3000/health"
    echo "   • System Info: http://$CLUSTER_IP:3000/api/info"
    echo "   • Logs: docker-compose logs -f"
    echo ""
    echo "🚀 Quick Start for Clients:"
    echo "   1. Add client-config.json to your AI tool"
    echo "   2. Configure tools to use memory-search model"
    echo "   3. Start encoding with enhanced memory access"
    echo ""
}

# Main deployment function
main() {
    echo "🚀 Memory System Deployment for SARK/CLU Cluster"
    echo "================================================"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --cluster-ip)
                CLUSTER_IP="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --cluster-ip IP    Set cluster IP address (default: 192.168.68.71)"
                echo "  --help             Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run deployment steps
    check_prerequisites
    setup_deployment
    create_dockerfile
    create_docker_compose
    create_nginx_config
    create_scripts
    create_client_config
    deploy_system
    display_summary
    
    print_status "Deployment completed successfully!"
    print_info "Use '$DEPLOY_DIR/status.sh' to check system status"
}

# Run main function
main "$@"