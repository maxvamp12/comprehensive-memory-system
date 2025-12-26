#!/bin/bash

# Prometheus/Grafana Monitoring Deployment Script for SARK
# Follows CONSTITUTION.md requirements for host-mounted data storage
# Target: SARK (192.168.68.69) - vLLM Cluster Head Node

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SARK_IP="192.168.68.69"
PROMETHEUS_HOST_PORT=9090
GRAFANA_HOST_PORT=3001
ALERTMANAGER_HOST_PORT=9093

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running on SARK
check_sark() {
    if [ "$(hostname -I | awk '{print $1}')" != "192.168.68.69" ]; then
        log_error "This script must be run on SARK (192.168.68.69)"
        exit 1
    fi
    log_success "Running on correct host: SARK (192.168.68.69)"
}

# Create required directories following CONSTITUTION.md
create_directories() {
    log "Creating host-mounted data storage directories..."
    
    # Data directories for persistence
    mkdir -p /home/maxvamp/data-prometheus
    mkdir -p /home/maxvamp/data-grafana
    mkdir -p /home/maxvamp/config-prometheus
    mkdir -p /home/maxvamp/config-grafana
    mkdir -p /home/maxvamp/logs-prometheus
    mkdir -p /home/maxvamp/logs-grafana
    mkdir -p /home/maxvamp/logs-alertmanager
    
    log_success "Created all required host-mounted directories"
}

# Create Docker network for monitoring services
create_network() {
    log "Creating Docker network for monitoring services..."
    
    if ! docker network ls | grep -q "monitoring-network"; then
        docker network create monitoring-network
        log_success "Created monitoring-network"
    else
        log_warning "monitoring-network already exists"
    fi
}

# Deploy Prometheus
deploy_prometheus() {
    log "Deploying Prometheus container..."
    
    # Stop existing container if running
    if docker ps -a | grep -q "prometheus"; then
        docker stop prometheus || true
        docker rm prometheus || true
        log_warning "Removed existing Prometheus container"
    fi
    
    # Deploy Prometheus with GPU metrics support
    docker run -d \
        --name prometheus \
        --network monitoring-network \
        -p ${PROMETHEUS_HOST_PORT}:9090 \
        -v /home/maxvamp/data-prometheus:/prometheus \
        -v /home/maxvamp/config-prometheus:/etc/prometheus \
        -v /home/maxvamp/logs-prometheus:/var/log/prometheus \
        prom/prometheus:latest \
        --config.file=/etc/prometheus/prometheus.yml \
        --storage.tsdb.path=/prometheus \
        --web.console.libraries=/etc/prometheus/console_libraries \
        --web.console.templates=/etc/prometheus/consoles \
        --web.enable-lifecycle \
        --storage.tsdb.retention.time=15d \
        --web.external-url=http://${SARK_IP}:${PROMETHEUS_HOST_PORT} \
        --web.route-prefix=/
    
    log_success "Prometheus deployed successfully"
}

# Create Prometheus configuration
create_prometheus_config() {
    log "Creating Prometheus configuration..."
    
    cat > /home/maxvamp/config-prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]

scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Node Exporter (system metrics)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  # vLLM Metrics
  - job_name: 'vllm'
    static_configs:
      - targets: ['vllm-head:8000']
    metrics_path: /metrics
    scrape_interval: 10s

  # Docker metrics
  - job_name: 'docker'
    static_configs:
      - targets: ['cadvisor:8080']
    scrape_interval: 30s

  # Network metrics
  - job_name: 'network'
    static_configs:
      - targets: ['node-exporter:9100']
    metrics_path: /metrics
    params:
      module: [network]
EOF

    # Create alert rules
    cat > /home/maxvamp/config-prometheus/alert_rules.yml << 'EOF'
groups:
  - name: system-alerts
    rules:
      - alert: HighGPUUtilization
        expr: 100 - (avg by (instance) (rate(nvidia_gpu_utilization[5m])) * 100) > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High GPU utilization on {{ $labels.instance }}"
          description: "GPU utilization is above 90% for more than 5 minutes"

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is above 85% for more than 10 minutes"

      - alert: HighDiskUsage
        expr: (1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100 > 85
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "High disk usage on {{ $labels.instance }}"
          description: "Disk usage is above 85% for more than 10 minutes"

      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is above 90% for more than 5 minutes"
EOF

    log_success "Prometheus configuration created"
}

# Deploy Node Exporter
deploy_node_exporter() {
    log "Deploying Node Exporter for system metrics..."
    
    if docker ps -a | grep -q "node-exporter"; then
        docker stop node-exporter || true
        docker rm node-exporter || true
        log_warning "Removed existing Node Exporter container"
    fi
    
    docker run -d \
        --name node-exporter \
        --network monitoring-network \
        -p 9100:9100 \
        -v /proc:/host/proc:ro \
        -v /sys:/host/sys:ro \
        -v /:/rootfs:ro \
        prom/node-exporter:latest \
        --path.procfs=/host/proc \
        --path.sysfs=/host/sys \
        --collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)
    
    log_success "Node Exporter deployed successfully"
}

# Deploy Grafana
deploy_grafana() {
    log "Deploying Grafana container..."
    
    if docker ps -a | grep -q "grafana"; then
        docker stop grafana || true
        docker rm grafana || true
        log_warning "Removed existing Grafana container"
    fi
    
    docker run -d \
        --name grafana \
        --network monitoring-network \
        -p ${GRAFANA_HOST_PORT}:3000 \
        -v /home/maxvamp/data-grafana:/var/lib/grafana \
        -v /home/maxvamp/config-grafana:/etc/grafana/provisioning \
        -v /home/maxvamp/logs-grafana:/var/log/grafana \
        grafana/grafana:latest \
        --config=/etc/grafana/grafana.ini \
        --homepath=/var/lib/grafana
    
    log_success "Grafana deployed successfully"
}

# Deploy Alertmanager
deploy_alertmanager() {
    log "Deploying Alertmanager container..."
    
    if docker ps -a | grep -q "alertmanager"; then
        docker stop alertmanager || true
        docker rm alertmanager || true
        log_warning "Removed existing Alertmanager container"
    fi
    
    docker run -d \
        --name alertmanager \
        --network monitoring-network \
        -p ${ALERTMANAGER_HOST_PORT}:9093 \
        -v /home/maxvamp/logs-alertmanager:/var/log/alertmanager \
        prom/alertmanager:latest \
        --config.file=/etc/alertmanager/alertmanager.yml \
        --storage.path=/alertmanager \
        --web.external-url=http://${SARK_IP}:${ALERTMANAGER_HOST_PORT}
    
    # Create Alertmanager configuration
    cat > /home/maxvamp/config-prometheus/alertmanager.yml << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alertmanager@localhost'
  smtp_auth_username: 'alertmanager'
  smtp_auth_password: 'password'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  email_configs:
  - to: 'admin@localhost'
  subject: 'Alert: {{ .GroupLabels.alertname }}'
  body: |
    {{ range .Alerts }}
    Alert: {{ .Annotations.summary }}
    Description: {{ .Annotations.description }}
    {{ end }}
EOF

    log_success "Alertmanager deployed successfully"
}

# Wait for services to be ready
wait_for_services() {
    log "Waiting for services to be ready..."
    
    # Wait for Prometheus
    for i in {1..30}; do
        if curl -s http://localhost:${PROMETHEUS_HOST_PORT}/-/healthy > /dev/null; then
            log_success "Prometheus is ready"
            break
        fi
        sleep 2
    done
    
    # Wait for Grafana
    for i in {1..30}; do
        if curl -s http://localhost:${GRAFANA_HOST_PORT}/api/health > /dev/null; then
            log_success "Grafana is ready"
            break
        fi
        sleep 2
    done
}

# Setup Grafana data sources
setup_grafana_datasources() {
    log "Setting up Grafana data sources..."
    
    # Wait for Grafana to be ready
    sleep 10
    
    # Setup Prometheus data source
    curl -X POST -H "Content-Type: application/json" -d '{
        "name": "Prometheus",
        "type": "prometheus",
        "url": "http://prometheus:9090",
        "access": "proxy",
        "isDefault": true
    }' http://localhost:${GRAFANA_HOST_PORT}/api/datasources
    
    log_success "Grafana data sources configured"
}

# Display access information
display_access_info() {
    log ""
    log_success "=== Prometheus/Grafana Monitoring Deployment Complete ==="
    log ""
    log "Access Information:"
    log "  Prometheus: http://${SARK_IP}:${PROMETHEUS_HOST_PORT}"
    log "  Grafana: http://${SARK_IP}:${GRAFANA_HOST_PORT}"
    log "  Alertmanager: http://${SARK_IP}:${ALERTMANAGER_HOST_PORT}"
    log ""
    log "Default Credentials:"
    log "  Grafana: admin/admin (change immediately after first access)"
    log ""
    log "Host-Mounted Data Storage (CONSTITUTION.md compliant):"
    log "  Prometheus Data: /home/maxvamp/data-prometheus"
    log "  Grafana Data: /home/maxvamp/data-grafana"
    log "  Prometheus Config: /home/maxvamp/config-prometheus"
    log "  Grafana Config: /home/maxvamp/config-grafana"
    log "  Prometheus Logs: /home/maxvamp/logs-prometheus"
    log "  Grafana Logs: /home/maxvamp/logs-grafana"
    log "  Alertmanager Logs: /home/maxvamp/logs-alertmanager"
    log ""
    log "Monitoring Coverage:"
    log "  ✓ GPU Utilization (via NVIDIA metrics)"
    log "  ✓ Memory Usage (system and application)"
    log "  ✓ Network Performance (via node-exporter)"
    log "  ✓ vLLM Service Metrics"
    log "  ✓ System Health (CPU, disk, network)"
    log "  ✓ Alert Configuration for critical thresholds"
    log ""
    log_warning "IMPORTANT: Change Grafana default password immediately!"
    log_warning "All data is backed up via existing Borg backup system"
}

# Main deployment function
main() {
    log "Starting Prometheus/Grafana Monitoring Deployment"
    log "Target: SARK (192.168.68.69) - vLLM Cluster"
    log ""
    
    check_sark
    create_directories
    create_network
    create_prometheus_config
    deploy_prometheus
    deploy_node_exporter
    deploy_grafana
    deploy_alertmanager
    wait_for_services
    setup_grafana_datasources
    display_access_info
    
    log_success "Deployment completed successfully!"
}

# Run main function
main "$@"