#!/usr/bin/env python3
"""
System Verification Framework
Ensures all system implementations are verified before claiming completion
Prevents documentation vs reality mismatches
"""

import subprocess
import json
import os
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime
import logging

# Optional imports - handle gracefully if not available
try:
    import requests
except ImportError:
    requests = None
    print("Warning: 'requests' module not available - HTTP health checks disabled")

try:
    import yaml
except ImportError:
    yaml = None
    print("Warning: 'yaml' module not available - YAML validation disabled")


class SystemVerificationFramework:
    """Core verification framework for all system implementations"""

    def __init__(self, config_path: str = "src/config/verification-config.yml"):
        self.config = self._load_config(config_path)
        self.logger = self._setup_logging()
        self.evidence_dir = Path("documents/verification-evidence")
        self.evidence_dir.mkdir(exist_ok=True)

def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load verification configuration"""
        try:
            with open(config_path, 'r') as f:
                if yaml:
                    return yaml.safe_load(f)
                else:
                    # Fallback to JSON parsing if YAML not available
                    import json
                    return json.load(f)
        except FileNotFoundError:
            return self._default_config()
        except Exception as e:
            print(f"Error loading config: {e}")
            return self._default_config()

    def _default_config(self) -> Dict[str, Any]:
        """Default verification configuration"""
        return {
            "verification_timeout": 30,
            "health_check_interval": 5,
            "max_retries": 3,
            "required_evidence": [
                "service_status",
                "config_validation",
                "data_integrity",
            ],
            "services": {
                "chromadb": {
                    "host": "192.168.68.69",
                    "port": 8001,
                    "endpoint": "/api/v1/heartbeat",
                },
                "memory_service": {
                    "host": "192.168.68.71",
                    "port": 3000,
                    "endpoint": "/health",
                },
                "vllm_head": {
                    "host": "192.168.68.69",
                    "port": 8000,
                    "endpoint": "/health",
                },
                "load_balancer": {
                    "host": "192.168.68.69",
                    "port": 8080,
                    "endpoint": "/health",
                },
            },
        }

    def _setup_logging(self) -> logging.Logger:
        """Setup logging framework"""
        logger = logging.getLogger("SystemVerification")
        logger.setLevel(logging.INFO)

        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        return logger

    def verify_service_health(self, service_name: str) -> Dict[str, Any]:
        """Verify health of a specific service"""
        service_config = self.config["services"].get(service_name)
        if not service_config:
            return {
                "status": "error",
                "message": f"Service {service_name} not configured",
            }

        url = f"http://{service_config['host']}:{service_config['port']}{service_config['endpoint']}"
        evidence = {
            "service": service_name,
            "timestamp": datetime.now().isoformat(),
            "url": url,
            "attempts": [],
            "status": "unknown",
        }

        for attempt in range(self.config["max_retries"]):
            try:
                response = requests.get(
                    url, timeout=self.config["verification_timeout"]
                )
                evidence["attempts"].append(
                    {
                        "attempt": attempt + 1,
                        "status_code": response.status_code,
                        "response_time": response.elapsed.total_seconds(),
                    }
                )

                if response.status_code == 200:
                    evidence["status"] = "healthy"
                    evidence["message"] = f"Service {service_name} is healthy"
                    break
                else:
                    evidence["status"] = "unhealthy"
                    evidence["message"] = (
                        f"Service {service_name} returned {response.status_code}"
                    )

            except Exception as e:
                evidence["attempts"].append(
                    {"attempt": attempt + 1, "error": str(e), "status_code": None}
                )
                evidence["status"] = "error"
                evidence["message"] = (
                    f"Service {service_name} connection failed: {str(e)}"
                )

        self._save_evidence(evidence, f"service-health-{service_name}")
        return evidence

    def verify_configuration_files(self, config_paths: List[str]) -> Dict[str, Any]:
        """Verify configuration files exist and are valid"""
        evidence = {
            "timestamp": datetime.now().isoformat(),
            "config_files": [],
            "overall_status": "unknown",
        }

        all_valid = True

        for config_path in config_paths:
            file_evidence = {
                "path": config_path,
                "exists": False,
                "valid": False,
                "errors": [],
            }

            if os.path.exists(config_path):
                file_evidence["exists"] = True
                try:
                    with open(config_path, "r") as f:
                        content = f.read()
                        if config_path.endswith(".yml") or config_path.endswith(
                            ".yaml"
                        ):
                            yaml.safe_load(content)
                        elif config_path.endswith(".json"):
                            json.loads(content)
                    file_evidence["valid"] = True
                except Exception as e:
                    file_evidence["errors"].append(f"Invalid format: {str(e)}")
                    all_valid = False
            else:
                file_evidence["errors"].append("File does not exist")
                all_valid = False

            evidence["config_files"].append(file_evidence)

        evidence["overall_status"] = "valid" if all_valid else "invalid"
        self._save_evidence(evidence, "configuration-validation")
        return evidence

    def verify_data_integrity(self, data_paths: List[str]) -> Dict[str, Any]:
        """Verify data integrity for specified paths"""
        evidence = {
            "timestamp": datetime.now().isoformat(),
            "data_paths": [],
            "overall_status": "unknown",
        }

        all_healthy = True

        for data_path in data_paths:
            path_evidence = {
                "path": data_path,
                "exists": False,
                "accessible": False,
                "size_bytes": 0,
                "errors": [],
            }

            if os.path.exists(data_path):
                path_evidence["exists"] = True
                try:
                    if os.path.isdir(data_path):
                        # Check if directory is readable
                        test_file = os.path.join(data_path, ".test_write")
                        with open(test_file, "w") as f:
                            f.write("test")
                        os.remove(test_file)
                        path_evidence["accessible"] = True
                    else:
                        # Check if file is readable
                        with open(data_path, "r") as f:
                            content = f.read()
                        path_evidence["accessible"] = True
                        path_evidence["size_bytes"] = len(content)
                except Exception as e:
                    path_evidence["errors"].append(f"Access failed: {str(e)}")
                    all_healthy = False
            else:
                path_evidence["errors"].append("Path does not exist")
                all_healthy = False

            evidence["data_paths"].append(path_evidence)

        evidence["overall_status"] = "healthy" if all_healthy else "unhealthy"
        self._save_evidence(evidence, "data-integrity")
        return evidence

    def verify_service_connectivity(
        self, services: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """Verify connectivity between services"""
        evidence = {
            "timestamp": datetime.now().isoformat(),
            "connectivity_tests": [],
            "overall_status": "unknown",
        }

        all_connected = True

        for service in services:
            test_evidence = {
                "from": service.get("from", "unknown"),
                "to": service.get("to", "unknown"),
                "status": "unknown",
                "errors": [],
            }

            try:
                # Test basic connectivity
                result = subprocess.run(
                    [
                        "nc",
                        "-z",
                        "-w",
                        "5",
                        service.get("host", "127.0.0.1"),
                        str(service.get("port", 80)),
                    ],
                    capture_output=True,
                    text=True,
                )

                if result.returncode == 0:
                    test_evidence["status"] = "connected"
                else:
                    test_evidence["status"] = "disconnected"
                    test_evidence["errors"].append("Connection failed")
                    all_connected = False

            except Exception as e:
                test_evidence["status"] = "error"
                test_evidence["errors"].append(f"Test failed: {str(e)}")
                all_connected = False

            evidence["connectivity_tests"].append(test_evidence)

        evidence["overall_status"] = "connected" if all_connected else "disconnected"
        self._save_evidence(evidence, "service-connectivity")
        return evidence

    def _save_evidence(self, evidence: Dict[str, Any], filename: str):
        """Save evidence to file"""
        evidence_path = (
            self.evidence_dir
            / f"{filename}-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(evidence_path, "w") as f:
            json.dump(evidence, f, indent=2)
        self.logger.info(f"Evidence saved: {evidence_path}")

    def generate_verification_report(self) -> Dict[str, Any]:
        """Generate comprehensive verification report"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "verification_status": "unknown",
            "components": {},
        }

        all_healthy = True

        # Verify all configured services
        for service_name in self.config["services"].keys():
            health_result = self.verify_service_health(service_name)
            report["components"][service_name] = health_result

            if health_result["status"] != "healthy":
                all_healthy = False

        # Verify configuration files
        config_files = [
            "src/config/storage-performance.yml",
            "src/config/verification-config.yml",
            "docker-compose.yml",
        ]
        config_result = self.verify_configuration_files(config_files)
        report["components"]["configuration"] = config_result

        if config_result["overall_status"] != "valid":
            all_healthy = False

        # Verify data paths
        data_paths = ["~/chroma-enhanced-data/", "~/memory-service-data/", "~/logs/"]
        data_result = self.verify_data_integrity(data_paths)
        report["components"]["data_integrity"] = data_result

        if data_result["overall_status"] != "healthy":
            all_healthy = False

        report["verification_status"] = "verified" if all_healthy else "failed"
        self._save_evidence(report, "comprehensive-verification-report")

        return report

    def verify_documentation_accuracy(self, docs_path: str) -> Dict[str, Any]:
        """Verify documentation accuracy vs actual implementation"""
        evidence = {
            "timestamp": datetime.now().isoformat(),
            "documentation_check": {},
            "overall_status": "unknown",
        }

        # This would implement specific documentation verification logic
        # For now, it's a placeholder for future implementation
        evidence["documentation_check"] = {
            "status": "placeholder",
            "message": "Documentation verification not yet implemented",
        }
        evidence["overall_status"] = "unknown"

        self._save_evidence(evidence, "documentation-accuracy")
        return evidence


if __name__ == "__main__":
    # Initialize verification framework
    verifier = SystemVerificationFramework()

    # Generate comprehensive verification report
    print("Generating comprehensive verification report...")
    report = verifier.generate_verification_report()

    print(f"Verification Status: {report['verification_status']}")
    print(
        "Verification complete. Evidence files saved to documents/verification-evidence/"
    )
