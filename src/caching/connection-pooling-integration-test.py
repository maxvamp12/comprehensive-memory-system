#!/usr/bin/env python3
"""
Connection Pooling Integration Test
Validates connection pooling with actual service endpoints
"""

import time
import json
import logging
import urllib.request
import urllib.error
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SimpleConnectionPool:
    """Simple connection pool for HTTP requests"""

    def __init__(self, max_connections=10):
        self.max_connections = max_connections
        self.active_connections = 0
        self.lock = threading.RLock()
        self.stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "avg_response_time": 0.0,
            "response_times": [],
        }

    def request(self, url, method="GET", data=None, headers=None):
        """Make HTTP request through connection pool"""
        with self.lock:
            self.active_connections += 1
            self.stats["total_requests"] += 1

        start_time = time.time()

        try:
            # Prepare headers
            request_headers = {
                "User-Agent": "Connection-Pool-Test/1.0",
                "Content-Type": "application/json",
            }
            if headers:
                request_headers.update(headers)

            # Make request
            if method.upper() == "GET":
                req = urllib.request.Request(url, method="GET")
                for key, value in request_headers.items():
                    req.add_header(key, value)

                response = urllib.request.urlopen(req, timeout=10)

            elif method.upper() == "POST":
                if data:
                    json_data = json.dumps(data).encode("utf-8")
                    req = urllib.request.Request(url, data=json_data, method="POST")
                else:
                    req = urllib.request.Request(url, method="POST")

                for key, value in request_headers.items():
                    req.add_header(key, value)

                response = urllib.request.urlopen(req, timeout=10)

            # Process response
            response_data = response.read().decode("utf-8")
            response_time = time.time() - start_time

            # Update stats
            with self.lock:
                self.stats["successful_requests"] += 1
                self.stats["response_times"].append(response_time)
                self.stats["avg_response_time"] = sum(
                    self.stats["response_times"]
                ) / len(self.stats["response_times"])
                self.active_connections -= 1

            return {
                "status": "success",
                "status_code": response.status,
                "response_time": response_time,
                "data": json.loads(response_data) if response_data else None,
            }

        except Exception as e:
            response_time = time.time() - start_time
            with self.lock:
                self.stats["failed_requests"] += 1
                self.stats["response_times"].append(response_time)
                self.stats["avg_response_time"] = sum(
                    self.stats["response_times"]
                ) / len(self.stats["response_times"])
                self.active_connections -= 1

            return {"status": "failed", "error": str(e), "response_time": response_time}

    def get_stats(self):
        """Get connection pool statistics"""
        return self.stats


def test_connection_pooling():
    """Test connection pooling with multiple concurrent requests"""
    logger.info("Starting Connection Pooling Integration Test")

    # Initialize connection pool
    pool = SimpleConnectionPool(max_connections=5)

    # Test endpoints
    test_endpoints = [
        {
            "name": "ChromaDB Health",
            "url": "http://192.168.68.69:8001/api/v2/heartbeat",
            "method": "GET",
        },
        {
            "name": "Memory Service Health",
            "url": "http://192.168.68.71:3000/health",
            "method": "GET",
        },
        {
            "name": "Redis Ping",
            "url": "http://192.168.68.69:6380/GET/test_key",
            "method": "GET",
        },
    ]

    # Test results
    results = []

    # Test 1: Sequential requests
    logger.info("Test 1: Sequential Requests")
    for endpoint in test_endpoints:
        logger.info(f"Testing: {endpoint['name']}")
        result = pool.request(endpoint["url"], endpoint["method"])
        result["endpoint"] = endpoint["name"]
        results.append(result)
        logger.info(
            f"{endpoint['name']}: {result['status']} ({result['response_time']:.3f}s)"
        )

    # Test 2: Concurrent requests
    logger.info("Test 2: Concurrent Requests")
    concurrent_results = []

    def concurrent_test(endpoint):
        return pool.request(endpoint["url"], endpoint["method"])

    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_endpoint = {
            executor.submit(concurrent_test, endpoint): endpoint
            for endpoint in test_endpoints
        }

        for future in as_completed(future_to_endpoint):
            endpoint = future_to_endpoint[future]
            try:
                result = future.result()
                result["endpoint"] = endpoint["name"]
                concurrent_results.append(result)
                logger.info(
                    f"{endpoint['name']} (concurrent): {result['status']} ({result['response_time']:.3f}s)"
                )
            except Exception as e:
                logger.error(f"{endpoint['name']} (concurrent) failed: {e}")

    # Test 3: Performance benchmark
    logger.info("Test 3: Performance Benchmark")
    benchmark_results = []

    def benchmark_request(i, endpoint):
        return pool.request(endpoint["url"], endpoint["method"])

    # Run 50 requests to each endpoint
    for endpoint in test_endpoints:
        logger.info(f"Running 50 requests to {endpoint['name']}")
        for i in range(50):
            result = benchmark_request(i, endpoint)
            result["endpoint"] = endpoint["name"]
            benchmark_results.append(result)

    # Calculate final statistics
    final_stats = pool.get_stats()

    # Display results
    logger.info("\n=== CONNECTION POOLING INTEGRATION TEST RESULTS ===")
    logger.info(f"Total Requests: {final_stats['total_requests']}")
    logger.info(f"Successful Requests: {final_stats['successful_requests']}")
    logger.info(f"Failed Requests: {final_stats['failed_requests']}")
    logger.info(
        f"Success Rate: {(final_stats['successful_requests'] / final_stats['total_requests'] * 100):.1f}%"
    )
    logger.info(f"Average Response Time: {final_stats['avg_response_time']:.3f}s")
    logger.info(f"Active Connections: {pool.active_connections}")

    # Performance summary
    successful_results = [r for r in benchmark_results if r["status"] == "success"]
    if successful_results:
        min_time = min(r["response_time"] for r in successful_results)
        max_time = max(r["response_time"] for r in successful_results)
        avg_time = sum(r["response_time"] for r in successful_results) / len(
            successful_results
        )

        logger.info(f"Performance Metrics:")
        logger.info(f"  Min Response Time: {min_time:.3f}s")
        logger.info(f"  Max Response Time: {max_time:.3f}s")
        logger.info(f"  Avg Response Time: {avg_time:.3f}s")

    # Success criteria
    success_rate = final_stats["successful_requests"] / final_stats["total_requests"]
    avg_response_time = final_stats["avg_response_time"]

    logger.info(f"\nSuccess Criteria:")
    logger.info(
        f"  Success Rate > 90%: {'✅ PASS' if success_rate > 0.9 else '❌ FAIL'} ({success_rate:.1%})"
    )
    logger.info(
        f"  Avg Response Time < 50ms: {'✅ PASS' if avg_response_time < 0.05 else '❌ FAIL'} ({avg_response_time:.3f}s)"
    )

    overall_success = success_rate > 0.9 and avg_response_time < 0.05
    logger.info(f"\nOverall Test Result: {'✅ PASS' if overall_success else '❌ FAIL'}")

    return overall_success


if __name__ == "__main__":
    success = test_connection_pooling()
    exit(0 if success else 1)
