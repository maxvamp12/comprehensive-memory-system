#!/usr/bin/env python3
"""
Test script to verify Load Balancer routing functionality
RED PHASE: These tests should FAIL initially to validate test correctness
"""

import requests
import subprocess
import sys
import time


def test_load_balancer_running():
    """Test that Load Balancer is running"""
    print("🔴 Testing Load Balancer status...")

    try:
        # Check if load balancer process is running
        result = subprocess.run(["ps", "aux"], capture_output=True, text=True)
        if "load-balancer.py" in result.stdout:
            print("✅ Load Balancer process is running")
            return True
        else:
            print("❌ Load Balancer process is NOT running")
            return False
    except Exception as e:
        print(f"❌ Error checking Load Balancer status: {e}")
        return False


def test_load_balancer_health_endpoint():
    """Test Load Balancer health endpoint"""
    print("🔴 Testing Load Balancer health endpoint...")

    try:
        response = requests.get(
            "http://localhost:8082/service/memory_service/health", timeout=5
        )
        if response.status_code == 200:
            print("✅ Load Balancer health check passed")
            return True
        else:
            print(f"❌ Health check returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Load Balancer on localhost:8082")
        return False
    except Exception as e:
        print(f"❌ Error during health check: {e}")
        return False


def test_load_balancer_routing_to_memory_service():
    """Test Load Balancer routing to Memory Service"""
    print("🔴 Testing Load Balancer routing to Memory Service...")

    try:
        # Test routing through load balancer
        response = requests.get(
            "http://localhost:8082/service/memory_service/api/memory", timeout=5
        )
        if response.status_code in [200, 404]:  # 404 is acceptable if no data
            print("✅ Load Balancer routing to Memory Service successful")
            return True
        else:
            print(f"❌ Load Balancer routing returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Load Balancer routing endpoint")
        return False
    except Exception as e:
        print(f"❌ Error during routing test: {e}")
        return False


def test_load_balancer_service_registry():
    """Test Load Balancer service registry configuration"""
    print("🔴 Testing Load Balancer service registry...")

    try:
        # Test if load balancer can route to memory service
        response = requests.get(
            "http://localhost:8082/service/memory_service/health", timeout=5
        )
        if response.status_code == 200:
            print("✅ Memory Service registry configuration verified")
            return True
        else:
            print(f"❌ Service routing returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error checking service registry: {e}")
        return False


def main():
    """Run all tests and report results"""
    print("🔴 RED PHASE: Running failing tests to validate test correctness")
    print("=" * 60)

    tests = [
        ("Load Balancer Running", test_load_balancer_running),
        ("Load Balancer Health Check", test_load_balancer_health_endpoint),
        (
            "Load Balancer Routing to Memory Service",
            test_load_balancer_routing_to_memory_service,
        ),
        ("Load Balancer Service Registry", test_load_balancer_service_registry),
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
