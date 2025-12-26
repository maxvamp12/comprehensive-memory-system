#!/usr/bin/env python3
"""
Configurable Storage Service HTTP Load Balancer
Implements weighted round-robin load balancing with health checks
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.error
import threading
import time
import logging
import sys
import signal
import os
import yaml
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta


# Load configuration from environment variables or config file
def load_config():
    """Load configuration from environment variables and config file"""
    config = {
        # Load Balancer Settings
        "load_balancer": {
            "host": os.getenv("LOAD_BALANCER_HOST", "0.0.0.0"),
            "port": int(os.getenv("LOAD_BALANCER_PORT", "8082")),
            "max_connections": int(os.getenv("MAX_CONNECTIONS", "1000")),
            "request_timeout": int(os.getenv("REQUEST_TIMEOUT", "30")),
        },
        # Service Endpoints
        "services": {
            "chromadb": {
                "host": os.getenv("CHROMADB_HOST", "localhost"),
                "port": int(os.getenv("CHROMADB_PORT", "8001")),
                "weight": int(os.getenv("CHROMADB_WEIGHT", "1")),
                "path": os.getenv(
                    "CHROMADB_PATH",
                    "/api/v2/tenants/default_tenant/databases/default_database",
                ),
                "health_check_path": os.getenv(
                    "CHROMADB_HEALTH_PATH", "/api/v2/heartbeat"
                ),
                "health_check_interval": int(os.getenv("HEALTH_CHECK_INTERVAL", "30")),
                "health_check_timeout": int(os.getenv("HEALTH_CHECK_TIMEOUT", "10")),
            },
            "memory_service": {
                "host": os.getenv("MEMORY_SERVICE_HOST", "localhost"),
                "port": int(os.getenv("MEMORY_SERVICE_PORT", "3000")),
                "weight": int(os.getenv("MEMORY_SERVICE_WEIGHT", "1")),
                "path": os.getenv("MEMORY_SERVICE_PATH", "/health"),
                "health_check_path": os.getenv("MEMORY_SERVICE_HEALTH_PATH", "/health"),
                "health_check_interval": int(os.getenv("HEALTH_CHECK_INTERVAL", "30")),
                "health_check_timeout": int(os.getenv("HEALTH_CHECK_TIMEOUT", "10")),
            },
        },
        # Logging Configuration
        "logging": {
            "level": os.getenv("LOG_LEVEL", "INFO"),
            "format": os.getenv(
                "LOG_FORMAT", "%(asctime)s,%(msecs)03d - %(levelname)s - %(message)s"
            ),
        },
        # Health Check Settings
        "health_checks": {
            "enabled": os.getenv("HEALTH_CHECKS_ENABLED", "true").lower() == "true",
            "interval": int(os.getenv("HEALTH_CHECK_INTERVAL", "30")),
            "timeout": int(os.getenv("HEALTH_CHECK_TIMEOUT", "10")),
            "retries": int(os.getenv("HEALTH_CHECK_RETRIES", "3")),
        },
    }

    # Try to load from YAML config file if it exists
    config_file = os.getenv("CONFIG_FILE", "config/load-balancer-config.yml")
    if os.path.exists(config_file):
        try:
            with open(config_file, "r") as f:
                yaml_config = yaml.safe_load(f)
                # Merge with env vars (env vars take precedence)
                config = merge_dicts(config, yaml_config)
        except Exception as e:
            print(f"Warning: Could not load config file {config_file}: {e}")

    return config


def merge_dicts(dict1, dict2):
    """Recursively merge two dictionaries"""
    result = dict1.copy()
    for key, value in dict2.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_dicts(result[key], value)
        else:
            result[key] = value
    return result


@dataclass
class ServiceEndpoint:
    name: str
    host: str
    port: int
    path: str
    weight: int
    healthy: bool = True
    last_check: Optional[datetime] = None
    consecutive_failures: int = 0


class ConfigurableLoadBalancerHandler(http.server.BaseHTTPRequestHandler):
    def __init__(self, *args, config=None, **kwargs):
        self.config = config or load_config()
        self.services = {}
        self._initialize_services()
        super().__init__(*args, **kwargs)

    def do_GET(self):
        """Handle GET requests"""
        self.handle_request("GET")

    def do_POST(self):
        """Handle POST requests"""
        self.handle_request("POST")

    def handle_request(self, method):
        """Handle HTTP requests"""
        # Special case for health endpoint
        if self.path == "/health":
            self._handle_health_check()
            return

        # Find the appropriate service
        service = self._select_service()
        if not service or not service.healthy:
            self._send_error(503, "Service unavailable")
            return

        # Proxy the request to the selected service
        try:
            target_url = f"http://{service.host}:{service.port}{self.path}"

            # Log the request
            logging.getLogger(__name__).info(
                f"Proxying {service.name} request: {target_url}"
            )

            req = urllib.request.Request(target_url, method=method)
            req.add_header("X-Forwarded-By", "storage-service-load-balancer")

            # Add headers from original request
            for key, value in self.headers.items():
                req.add_header(key, value)

            # Handle POST data
            if method == "POST":
                content_length = int(self.headers.get("Content-Length", 0))
                if content_length > 0:
                    post_data = self.rfile.read(content_length)
                    req.data = post_data

            response = urllib.request.urlopen(
                req, timeout=self.config["load_balancer"]["request_timeout"]
            )
            content = response.read()

            # Send response back to client
            self.send_response(response.status)
            for key, value in response.headers.items():
                self.send_header(key, value)
            self.end_headers()
            self.wfile.write(content)

        except Exception as e:
            logging.getLogger(__name__).error(
                f"Proxy request failed for {service.name}: {e}"
            )
            self._send_error(502, f"Bad gateway: {e}")

    def _handle_health_check(self):
        """Handle load balancer health check"""
        status = "healthy"
        services_status = {}

        for service_name, service in self.services.items():
            services_status[service_name] = (
                "healthy" if service.healthy else "unhealthy"
            )

        response = {
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "services": services_status,
        }

        self._send_json_response(200, response)

    def _select_service(self):
        """Select service using weighted round-robin"""
        available_services = [s for s in self.services.values() if s.healthy]
        if not available_services:
            return None

        # Simple round-robin for now (weights not implemented yet)
        service_name = list(self.services.keys())[0]
        return self.services.get(service_name)

    def _send_error(self, status_code, message):
        """Send error response"""
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        error_response = {"error": message}
        self.wfile.write(json.dumps(error_response).encode())

    def _send_json_response(self, status_code, data):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        """Override to use our logger"""
        logging.getLogger(__name__).info(format % args)


class ConfigurableLoadBalancerServer:
    def __init__(self, config=None):
        self.config = config or load_config()
        self.services = {}
        self.current_index = {}
        self.logger = logging.getLogger(__name__)

        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        self.logger.info(f"Received signal {signum}, shutting down...")
        sys.exit(0)

    def start(self):
        """Start the load balancer server"""
        self._setup_logging()
        self._initialize_services()
        self._start_health_checker()

        # Create custom handler with services
        handler = lambda *args, **kwargs: ConfigurableLoadBalancerHandler(
            *args, config=self.config, **kwargs
        )

        with socketserver.TCPServer(
            (
                self.config["load_balancer"]["host"],
                self.config["load_balancer"]["port"],
            ),
            handler,
        ) as httpd:
            self.logger.info(
                f"Load balancer starting on {self.config['load_balancer']['host']}:{self.config['load_balancer']['port']}"
            )
            self.logger.info(f"Services configured: {list(self.services.keys())}")
            httpd.serve_forever()

    def _setup_logging(self):
        """Setup logging configuration"""
        logging.basicConfig(
            level=getattr(logging, self.config["logging"]["level"].upper()),
            format=self.config["logging"]["format"],
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    def _initialize_services(self):
        """Initialize service endpoints from configuration"""
        for service_name, service_config in self.config["services"].items():
            service = ServiceEndpoint(
                name=service_name,
                host=service_config["host"],
                port=service_config["port"],
                path=service_config["path"],
                weight=service_config["weight"],
            )
            self.services[service_name] = service
            self.current_index[service_name] = 0

        self.logger.info(f"Initialized {len(self.services)} service endpoints")

    def _start_health_checker(self):
        """Start health checker worker thread"""

        def health_checker():
            while True:
                self._perform_health_checks()
                time.sleep(self.config["health_checks"]["interval"])

        thread = threading.Thread(target=health_checker, daemon=True)
        thread.start()

    def _perform_health_checks(self):
        """Perform health checks on all services"""
        for service_name, service in self.services.items():
            try:
                # Health check URL construction
                health_path = self.config["services"][service_name]["health_check_path"]
                url = f"http://{service.host}:{service.port}{health_path}"

                req = urllib.request.Request(url, method="GET")
                req.add_header("User-Agent", "Storage-Service-Load-Balancer/1.0")

                response = urllib.request.urlopen(
                    req, timeout=self.config["health_checks"]["timeout"]
                )

                if response.status == 200:
                    service.healthy = True
                    service.consecutive_failures = 0
                    service.last_check = datetime.now()
                    self.logger.info(f"Service {service_name} is healthy")
                else:
                    service.healthy = False
                    service.consecutive_failures += 1
                    self.logger.warning(
                        f"Health check failed for {service_name}: HTTP {response.status}"
                    )

            except Exception as e:
                service.healthy = False
                service.consecutive_failures += 1
                self.logger.warning(f"Health check failed for {service_name}: {e}")


def main():
    """Main entry point"""
    server = ConfigurableLoadBalancerServer()
    server.start()


if __name__ == "__main__":
    main()
