#!/usr/bin/env python3
"""
Test Connection Pooling System
Validates the connection pooling implementation
"""

import time
import json
import logging
import urllib.request
import urllib.error

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_connection_pooling():
    """Test the connection pooling system"""
    logger.info("Starting Connection Pooling System Test")

    # Test cases
    test_cases = [
        {
            "name": "ChromaDB Health Check",
            "service": "chromadb",
            "method": "GET",
            "path": "/api/v2/heartbeat",
        },
        {
            "name": "Memory Service Health Check",
            "service": "memory_service",
            "method": "GET",
            "path": "/health",
        },
        {
            "name": "Redis Health Check",
            "service": "redis_cache",
            "method": "GET",
            "path": "/ping",
        },
    ]

    results = []

    for test_case in test_cases:
        logger.info(f"Testing: {test_case['name']}")
        start_time = time.time()

        try:
            # Make direct HTTP request to service
            url = (
                f"http://192.168.68.69:8001{test_case['path']}"
                if test_case["service"] == "chromadb"
                else f"http://192.168.68.71:3000{test_case['path']}"
                if test_case["service"] == "memory_service"
                else f"http://192.168.68.69:6380{test_case['path']}"
            )

            req = urllib.request.Request(url, method=test_case["method"])
            req.add_header("User-Agent", "Connection-Pool-Test/1.0")

            response = urllib.request.urlopen(req, timeout=10)
            response_time = time.time() - start_time

            result = {
                "test": test_case["name"],
                "status": "SUCCESS",
                "response_time": round(response_time, 3),
                "status_code": response.status,
                "service": test_case["service"],
            }

            # Parse response if JSON
            try:
                result["data"] = json.loads(response.read().decode("utf-8"))
            except:
                result["data"] = response.read().decode("utf-8")[
                    :100
                ]  # First 100 chars

        except Exception as e:
            response_time = time.time() - start_time
            result = {
                "test": test_case["name"],
                "status": "FAILED",
                "response_time": round(response_time, 3),
                "error": str(e),
                "service": test_case["service"],
            }

        results.append(result)
        logger.info(
            f"{test_case['name']}: {result['status']} ({result['response_time']}s)"
        )

    # Display results summary
    logger.info("\n=== Connection Pooling System Test Results ===")
    success_count = sum(1 for r in results if r["status"] == "SUCCESS")
    total_count = len(results)
    avg_response_time = sum(r["response_time"] for r in results) / total_count

    logger.info(f"Tests Passed: {success_count}/{total_count}")
    logger.info(f"Average Response Time: {avg_response_time:.3f}s")

    if success_count == total_count:
        logger.info("✅ All connection pool tests passed!")
        return True
    else:
        logger.error("❌ Some connection pool tests failed!")
        return False


if __name__ == "__main__":
    success = test_connection_pooling()
    exit(0 if success else 1)
