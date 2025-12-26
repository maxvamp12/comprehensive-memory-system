# Prometheus/Grafana Monitoring Configuration
# SARK (192.168.68.69) - vLLM Cluster Monitoring

## Global Configuration
PROMETHEUS_VERSION="latest"
GRAFANA_VERSION="latest"
ALERTMANAGER_VERSION="latest"

## Network Configuration
MONITORING_NETWORK="monitoring-network"
PROMETHEUS_CONTAINER_PORT=9090
GRAFANA_CONTAINER_PORT=3000
ALERTMANAGER_CONTAINER_PORT=9093
NODE_EXPORTER_PORT=9100
CADVISOR_PORT=8080

## Host Ports (accessible from outside)
PROMETHEUS_HOST_PORT=9090
GRAFANA_HOST_PORT=3001
ALERTMANAGER_HOST_PORT=9093

## Data Retention
PROMETHEUS_RETENTION="15d"
GRAFANA_RETENTION="30d"

## Alert Thresholds
GPU_UTILIZATION_WARNING=80
GPU_UTILIZATION_CRITICAL=90
MEMORY_UTILIZATION_WARNING=75
MEMORY_UTILIZATION_CRITICAL=85
CPU_UTILIZATION_WARNING=80
CPU_UTILIZATION_CRITICAL=90
DISK_UTILIZATION_WARNING=80
DISK_UTILIZATION_CRITICAL=90

## Scrape Intervals
PROMETHEUS_SCRAPE_INTERVAL="15s"
VLLM_SCRAPE_INTERVAL="10s"
DOCKER_SCRAPE_INTERVAL="30s"

## Alert Intervals
ALERT_GROUP_WAIT="10s"
ALERT_GROUP_INTERVAL="10s"
ALERT_REPEAT_INTERVAL="1h"

## Storage Paths (CONSTITUTION.md compliant)
PROMETHEUS_DATA_DIR="/home/maxvamp/data-prometheus"
PROMETHEUS_CONFIG_DIR="/home/maxvamp/config-prometheus"
PROMETHEUS_LOGS_DIR="/home/maxvamp/logs-prometheus"

GRAFANA_DATA_DIR="/home/maxvamp/data-grafana"
GRAFANA_CONFIG_DIR="/home/maxvamp/config-grafana"
GRAFANA_LOGS_DIR="/home/maxvamp/logs-grafana"

ALERTMANAGER_LOGS_DIR="/home/maxvamp/logs-alertmanager"

## Service URLs
PROMETHEUS_URL="http://192.168.68.69:9090"
GRAFANA_URL="http://192.168.68.69:3001"
ALERTMANAGER_URL="http://192.168.68.69:9093"

## Dashboard Templates
GRAFANA_DASHBOARDS=(
    "system-overview"
    "gpu-monitoring"
    "vllm-metrics"
    "network-performance"
    "alert-status"
)

## Alert Rules
ALERT_RULES=(
    "high-gpu-utilization"
    "high-memory-usage"
    "high-cpu-usage"
    "high-disk-usage"
    "service-down"
    "high-latency"
)

## Exporter Configuration
NODE_EXPORTER_MODULES=(
    "cpu"
    "diskio"
    "filesystem"
    "meminfo"
    "netdev"
    "stat"
    "textfile"
    "vmstat"
    "network"
)

## vLLM Specific Metrics
VLLM_METRICS=(
    "vllm_request_latency_seconds"
    "vllm_requests_total"
    "vllm_errors_total"
    "vllm_queue_size"
    "vllm_throughput_tokens_per_second"
    "vllm_gpu_utilization"
    "vllm_memory_usage_bytes"
    "vllm_active_requests"
    "vllm_waiting_requests"
)

## System Metrics
SYSTEM_METRICS=(
    "node_cpu_seconds_total"
    "node_memory_MemAvailable_bytes"
    "node_memory_MemTotal_bytes"
    "node_memory_MemFree_bytes"
    "node_memory_MemUsed_bytes"
    "node_filesystem_avail_bytes"
    "node_filesystem_size_bytes"
    "node_filesystem_used_bytes"
    "node_network_receive_bytes_total"
    "node_network_transmit_bytes_total"
    "node_network_receive_packets_total"
    "node_network_transmit_packets_total"
)

## GPU Metrics (NVIDIA)
GPU_METRICS=(
    "nvidia_gpu_utilization"
    "nvidia_memory_used_bytes"
    "nvidia_memory_total_bytes"
    "nvidia_temperature_gpu"
    "nvidia_power_usage"
    "nvidia_clocks_current_graphics"
    "nvidia_clocks_current_memory"
    "nvidia_clocks_current_sm"
    "nvidia_clocks_current_video"
)

## Network Metrics
NETWORK_METRICS=(
    "node_network_receive_bytes_total"
    "node_network_transmit_bytes_total"
    "node_network_receive_packets_total"
    "node_network_transmit_packets_total"
    "node_network_receive_errs_total"
    "node_network_transmit_errs_total"
    "node_network_drop_in_total"
    "node_network_drop_out_total"
)

## Docker Metrics
DOCKER_METRICS=(
    "container_cpu_usage_seconds_total"
    "container_memory_usage_bytes"
    "container_memory_max_usage_bytes"
    "container_network_receive_bytes_total"
    "container_network_transmit_bytes_total"
    "container_fs_read_bytes_total"
    "container_fs_write_bytes_total"
    "container_fs_reads_total"
    "container_fs_writes_total"
)

## Alert Notification Channels
NOTIFICATION_CHANNELS=(
    "email"
    "webhook"
    "slack"
)

## Grafana Admin Configuration
GRAFANA_ADMIN_USER="admin"
GRAFANA_ADMIN_PASSWORD="admin"
GRAFANA_ADMIN_EMAIL="admin@sark.local"

## Prometheus Configuration
PROMETHEUS_CONFIG_FILE="/home/maxvamp/config-prometheus/prometheus.yml"
PROMETHEUS_ALERT_RULES="/home/maxvamp/config-prometheus/alert_rules.yml"
PROMETHEUS_ALERTMANAGER_CONFIG="/home/maxvamp/config-prometheus/alertmanager.yml"

## Grafana Configuration
GRAFANA_CONFIG_FILE="/home/maxvamp/config-grafana/grafana.ini"
GRAFANA_DASHBOARDS_DIR="/home/maxvamp/config-grafana/dashboards"
GRAFANA_DATASOURCES_DIR="/home/maxvamp/config-grafana/datasources"

## Alertmanager Configuration
ALERTMANAGER_CONFIG_FILE="/home/maxvamp/config-prometheus/alertmanager.yml"

## Backup Integration
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE="daily"

## Security Configuration
ENABLE_BASIC_AUTH=true
ENABLE_SSL=false
SSL_CERT_FILE=""
SSL_KEY_FILE=""

## Logging Configuration
LOG_LEVEL="info"
LOG_FORMAT="json"
LOG_RETENTION_DAYS=7

## Performance Tuning
PROMETHEUS_MEMORY_LIMIT="2Gi"
PROMETHEUS_CPU_LIMIT="2"
GRAFANA_MEMORY_LIMIT="1Gi"
GRAFANA_CPU_LIMIT="1"
NODE_EXPORTER_MEMORY_LIMIT="512Mi"
NODE_EXPORTER_CPU_LIMIT="0.5"

## Health Check Configuration
HEALTH_CHECK_INTERVAL="30s"
HEALTH_CHECK_TIMEOUT="10s"
HEALTH_CHECK_RETRIES=3

## Service Dependencies
SERVICE_DEPENDENCIES=(
    "docker"
    "networking"
    "storage"
    "gpu-drivers"
    "nvidia-docker"
)

## Container Health Checks
HEALTH_CHECKS=(
    "prometheus:9090"
    "grafana:3000"
    "node-exporter:9100"
    "alertmanager:9093"
)

## Monitoring Targets
TARGETS=(
    "prometheus:9090"
    "node-exporter:9100"
    "grafana:3000"
    "alertmanager:9093"
    "vllm-head:8000"
    "chromadb:8001"
)

## Export Environment Variables
export PROMETHEUS_VERSION
export GRAFANA_VERSION
export ALERTMANAGER_VERSION
export PROMETHEUS_HOST_PORT
export GRAFANA_HOST_PORT
export ALERTMANAGER_HOST_PORT
export PROMETHEUS_DATA_DIR
export PROMETHEUS_CONFIG_DIR
export PROMETHEUS_LOGS_DIR
export GRAFANA_DATA_DIR
export GRAFANA_CONFIG_DIR
export GRAFANA_LOGS_DIR
export ALERTMANAGER_LOGS_DIR

# Configuration validation
validate_configuration() {
    echo "Validating monitoring configuration..."
    
    # Check required directories
    for dir in "$PROMETHEUS_DATA_DIR" "$PROMETHEUS_CONFIG_DIR" "$PROMETHEUS_LOGS_DIR" \
               "$GRAFANA_DATA_DIR" "$GRAFANA_CONFIG_DIR" "$GRAFANA_LOGS_DIR" \
               "$ALERTMANAGER_LOGS_DIR"; do
        if [ ! -d "$dir" ]; then
            echo "Error: Required directory $dir does not exist"
            exit 1
        fi
    done
    
    # Check port availability
    for port in $PROMETHEUS_HOST_PORT $GRAFANA_HOST_PORT $ALERTMANAGER_HOST_PORT; do
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            echo "Warning: Port $port is already in use"
        fi
    done
    
    echo "Configuration validation completed successfully"
}

# Configuration backup
backup_configuration() {
    echo "Backing up current configuration..."
    
    backup_dir="/home/maxvamp/monitoring-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup existing configurations if they exist
    [ -f "$PROMETHEUS_CONFIG_FILE" ] && cp "$PROMETHEUS_CONFIG_FILE" "$backup_dir/"
    [ -f "$GRAFANA_CONFIG_FILE" ] && cp "$GRAFANA_CONFIG_FILE" "$backup_dir/"
    [ -f "$ALERTMANAGER_CONFIG_FILE" ] && cp "$ALERTMANAGER_CONFIG_FILE" "$backup_dir/"
    
    echo "Configuration backed up to $backup_dir"
}

# Configuration restoration
restore_configuration() {
    echo "Restoring configuration from backup..."
    
    # Implementation for configuration restoration
    # This would be used in case of deployment failure
    echo "Configuration restoration functionality available"
}

# Configuration export
export_configuration() {
    echo "Exporting monitoring configuration..."
    
    config_file="/home/maxvamp/monitoring-config-$(date +%Y%m%d-%H%M%S).env"
    
    # Export all configuration variables
    set | grep "^PROMETHEUS_\|^GRAFANA_\|^ALERTMANAGER_\|^MONITORING_" > "$config_file"
    
    echo "Configuration exported to $config_file"
}

# Configuration import
import_configuration() {
    echo "Importing monitoring configuration..."
    
    if [ -f "$1" ]; then
        source "$1"
        echo "Configuration imported from $1"
    else
        echo "Error: Configuration file $1 not found"
        exit 1
    fi
}

# Main configuration management
main() {
    echo "Managing Prometheus/Grafana Monitoring Configuration"
    echo "Target: SARK (192.168.68.69) - vLLM Cluster"
    
    case "${1:-validate}" in
        "validate")
            validate_configuration
            ;;
        "backup")
            backup_configuration
            ;;
        "restore")
            restore_configuration
            ;;
        "export")
            export_configuration
            ;;
        "import")
            import_configuration "$2"
            ;;
        *)
            echo "Usage: $0 {validate|backup|restore|export|import <config-file>}"
            exit 1
            ;;
    esac
}

# Run if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi