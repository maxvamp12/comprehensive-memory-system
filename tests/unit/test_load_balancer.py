# Test Suite for Load Balancer
# Provides comprehensive testing for the load balancer system

import unittest
import json
import threading
import time
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add the src directory to the path so we can import the load balancer
sys.path.insert(
    0, os.path.join(os.path.dirname(__file__), "..", "..", "src", "load-balancer")
)

try:
    from load_balancer import LoadBalancerHandler, LoadBalancerServer, ServiceEndpoint
except ImportError:
    # If the above import fails, try direct import
    from load_balancer import LoadBalancerHandler, LoadBalancerServer, ServiceEndpoint


class TestServiceEndpoint(unittest.TestCase):
    """Test the ServiceEndpoint dataclass"""

    def test_service_endpoint_creation(self):
        """Test creating a service endpoint"""
        service = ServiceEndpoint(
            name="test_service", host="localhost", port=8000, path="/api/v1", weight=1
        )

        self.assertEqual(service.name, "test_service")
        self.assertEqual(service.host, "localhost")
        self.assertEqual(service.port, 8000)
        self.assertEqual(service.path, "/api/v1")
        self.assertEqual(service.weight, 1)
        self.assertTrue(service.healthy)
        self.assertIsNone(service.last_check)


class TestLoadBalancerServer(unittest.TestCase):
    """Test the LoadBalancerServer class"""

    def setUp(self):
        """Set up test fixtures"""
        self.config = {
            "services": {
                "test_service": {
                    "host": "localhost",
                    "port": 8000,
                    "weight": 1,
                    "path": "/api/v1",
                    "health_check_path": "/health",
                }
            },
            "load_balancer": {"host": "0.0.0.0", "port": 8082},
            "logging": {
                "level": "INFO",
                "format": "%(asctime)s - %(levelname)s - %(message)s",
            },
            "health_checks": {
                "enabled": True,
                "interval": 30,
                "timeout": 10,
                "retries": 3,
            },
        }

    def test_initialization(self):
        """Test server initialization"""
        server = LoadBalancerServer(self.config)

        self.assertEqual(len(server.services), 1)
        self.assertIn("test_service", server.services)
        self.assertTrue(server.services["test_service"].healthy)

    def test_health_checker_worker(self):
        """Test the health checker worker thread"""
        server = LoadBalancerServer(self.config)

        # Mock the health check to avoid actual network calls
        with patch.object(server, "_perform_health_checks") as mock_health_checks:
            server._start_health_checker_thread()
            time.sleep(0.1)  # Let the thread run briefly

            # Stop the thread
            for thread in threading.enumerate():
                if thread.name == "MainThread":
                    continue
                if thread.is_alive():
                    thread.join(timeout=0.1)

        # Health checks should have been called
        mock_health_checks.assert_called()


class TestLoadBalancerHandler(unittest.TestCase):
    """Test the LoadBalancerHandler class"""

    def setUp(self):
        """Set up test fixtures"""
        self.config = {
            "services": {
                "test_service": {
                    "host": "localhost",
                    "port": 8000,
                    "weight": 1,
                    "path": "/api/v1",
                    "health_check_path": "/health",
                }
            }
        }

    def test_health_check_response(self):
        """Test the health check endpoint response"""
        handler = LoadBalancerHandler()
        handler.services = {
            "test_service": ServiceEndpoint(
                name="test_service",
                host="localhost",
                port=8000,
                path="/api/v1",
                weight=1,
            )
        }

        # Mock the send_response methods
        handler.send_response = Mock()
        handler.send_header = Mock()
        handler.end_headers = Mock()
        handler.wfile = Mock()

        # Call the health check method
        handler._handle_health_check()

        # Verify the response was sent
        handler.send_response.assert_called_once_with(200)
        handler.send_header.assert_called_with("Content-Type", "application/json")
        handler.end_headers.assert_called_once()

        # Verify the response content
        response_data = {
            "status": "healthy",
            "timestamp": handler._handle_health_check.__globals__["datetime"]
            .now()
            .isoformat(),
            "services": {"test_service": "healthy"},
        }
        expected_response = json.dumps(response_data).encode()
        handler.wfile.write.assert_called_once_with(expected_response)


class TestLoadBalancerIntegration(unittest.TestCase):
    """Integration tests for the load balancer"""

    def setUp(self):
        """Set up test fixtures"""
        self.test_services = {
            "service1": ServiceEndpoint(
                name="service1", host="localhost", port=8001, path="/api/v1", weight=1
            ),
            "service2": ServiceEndpoint(
                name="service2", host="localhost", port=8002, path="/api/v1", weight=1
            ),
        }

    def test_service_selection_round_robin(self):
        """Test round-robin service selection"""
        handler = LoadBalancerHandler()
        handler.services = self.test_services

        # Test multiple selections to verify round-robin behavior
        selected_services = []
        for _ in range(4):
            service = handler._select_service()
            self.assertIsNotNone(service)
            selected_services.append(service.name)

        # With two services, we should see both selected in round-robin fashion
        self.assertIn("service1", selected_services)
        self.assertIn("service2", selected_services)

    def test_error_responses(self):
        """Test error response handling"""
        handler = LoadBalancerHandler()

        # Mock the send_response methods
        handler.send_response = Mock()
        handler.send_header = Mock()
        handler.end_headers = Mock()
        handler.wfile = Mock()

        # Test 503 error
        handler._send_error(503, "Service unavailable")

        # Verify the error response
        handler.send_response.assert_called_once_with(503)
        handler.send_header.assert_called_with("Content-Type", "application/json")
        handler.end_headers.assert_called_once()

        expected_response = json.dumps({"error": "Service unavailable"}).encode()
        handler.wfile.write.assert_called_once_with(expected_response)


class TestLoadBalancerPerformance(unittest.TestCase):
    """Performance tests for the load balancer"""

    def test_concurrent_requests(self):
        """Test handling of concurrent requests"""
        config = {
            "services": {
                "test_service": {
                    "host": "localhost",
                    "port": 8000,
                    "weight": 1,
                    "path": "/api/v1",
                    "health_check_path": "/health",
                }
            },
            "load_balancer": {"host": "0.0.0.0", "port": 8082},
        }

        server = LoadBalancerServer(config)

        # Mock the health check to avoid actual network calls
        with patch.object(server, "_perform_health_checks"):
            # Start the health checker thread
            server._start_health_checker_thread()

            # Test concurrent access to services
            def access_services():
                for _ in range(10):
                    service = server._select_service()
                    self.assertIsNotNone(service)

            threads = []
            for _ in range(5):  # 5 concurrent threads
                thread = threading.Thread(target=access_services)
                threads.append(thread)
                thread.start()

            # Wait for all threads to complete
            for thread in threads:
                thread.join(timeout=5)

            # Stop the health checker thread
            for thread in threading.enumerate():
                if thread.name != "MainThread" and thread.is_alive():
                    thread.join(timeout=0.1)


if __name__ == "__main__":
    # Run the tests
    unittest.main(verbosity=2)
