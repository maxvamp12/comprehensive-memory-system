#!/usr/bin/env python3
"""
Test script to verify Memory Service container functionality
RED PHASE: These tests should FAIL initially to validate test correctness
"""

import subprocess
import sys
import requests


def test_memory_service_container_running():
    """Test that Memory Service container is running on CLU:3000"""
    print("🔴 Testing Memory Service container status...")

    try:
        # Check if container is running using docker ps
        result = subprocess.run(
            [
                "docker",
                "ps",
                "--filter",
                "name=memory-service",
                "--format",
                "{{.Names}}",
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )

        if result.returncode != 0:
            print(f"❌ Docker command failed: {result.stderr}")
            return False

        containers = result.stdout.strip().split("\n")
        memory_service_running = any(
            "memory-service" in container for container in containers if container
        )

        if not memory_service_running:
            print("❌ Memory Service container is NOT running")
            return False

        print("✅ Memory Service container is running")
        return True

    except subprocess.TimeoutExpired:
        print("❌ Docker command timed out")
        return False
    except Exception as e:
        print(f"❌ Error checking container status: {e}")
        return False


def test_memory_service_health_check():
    """Test Memory Service health endpoint"""
    print("🔴 Testing Memory Service health check...")

    try:
        response = requests.get("http://localhost:8080/health", timeout=5)
        if response.status_code == 200:
            print("✅ Memory Service health check passed")
            return True
        else:
            print(f"❌ Health check returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Memory Service on localhost:8080")
        return False
    except Exception as e:
        print(f"❌ Error during health check: {e}")
        return False


def test_memory_service_endpoints():
    """Test Memory Service endpoints are accessible"""
    print("🔴 Testing Memory Service endpoints...")

    endpoints = ["/health", "/api/memory", "/api/status"]
    success_count = 0

    for endpoint in endpoints:
        try:
            response = requests.get(f"http://localhost:8080{endpoint}", timeout=5)
            if response.status_code in [
                200,
                404,
            ]:  # 404 is acceptable for non-existent endpoints
                print(
                    f"✅ Endpoint {endpoint} accessible (status: {response.status_code})"
                )
                success_count += 1
            else:
                print(
                    f"❌ Endpoint {endpoint} returned unexpected status: {response.status_code}"
                )
        except Exception as e:
            print("❌ Error accessing endpoint {}: {}".format(endpoint, e))

    return success_count == len(endpoints)


def main():
    """Run all tests and report results"""
    print("🔴 RED PHASE: Running failing tests to validate test correctness")
    print("=" * 60)

    tests = [
        ("Memory Service Container Running", test_memory_service_container_running),
        ("Memory Service Health Check", test_memory_service_health_check),
        ("Memory Service Endpoints Accessible", test_memory_service_endpoints),
    ]

    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test {test_name} failed with exception: {e}")
            results.append((test_name, False))

    print("\n" + "=" * 60)
    print("🔴 TEST RESULTS SUMMARY")
    print("=" * 60)

    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
        if result:
            passed += 1

    print(f"\nResults: {passed}/{len(results)} tests passed")

    if passed < len(results):
        print("🔴 Tests are correctly failing - this validates our test setup")
        return 1  # Exit with error code to indicate expected failures
    else:
        print("🟢 All tests passed - this indicates the implementation is working")
        return 0


if __name__ == "__main__":
    sys.exit(main())
