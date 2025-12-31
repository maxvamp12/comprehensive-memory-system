# Project Structure Documentation

This document describes the organized project structure for the Comprehensive Memory System.

## Directory Structure

```
comprehensive-memory-system/
├── src/                           # Source code
│   ├── load-balancer/            # Load balancer implementation
│   │   ├── load-balancer.py      # Main load balancer code
│   │   ├── load-balancer-configurable.py  # Configurable version
│   │   └── Dockerfile           # Docker configuration
│   ├── caching/                  # Caching system
│   │   └── storage-caching.py   # Caching implementation
│   ├── config/                   # Configuration files
│   │   └── storage-performance.yml  # Performance configuration
│   └── utils/                    # Utility functions (empty for now)
├── config/                        # Configuration management
│   ├── templates/                # Configuration templates
│   │   ├── load-balancer-config.yml  # Load balancer config template
│   │   └── .env.example         # Environment variables template
│   └── environments/            # Environment-specific configs
│       ├── .env.development      # Development environment
│       ├── .env.production       # Production environment
│       └── .env.staging         # Staging environment
├── docs/                         # Documentation
│   ├── architecture/            # Architecture documentation
│   │   ├── enhanced-infrastructure-architecture.md
│   │   ├── storage-optimization-plan.md
│   │   ├── network-optimization-strategy.md
│   │   ├── resource-allocation-matrix.md
│   │   └── test-infrastructure-architecture.md
│   ├── deployment/              # Deployment documentation
│   │   ├── dgx-configuration-collection-prompt.md
│   │   ├── integration-points.md
│   │   ├── recommendations.md
│   │   ├── server-overview.md
│   │   ├── RAG_SYSTEM_QUICK_REFERENCE.md
│   │   ├── prometheus-grafana-deployment-plan.md
│   │   └── task-synchronization-verification-report.md
│   ├── api/                    # API documentation (empty for now)
│   ├── AGENTS.md              # BMAD personas documentation
│   ├── CONSTITUTION.md         # Project constitution
│   └── SESSION_RESUME_CONTEXT.md # Session context
├── scripts/                     # Deployment and utility scripts
│   ├── deploy/                # Deployment scripts
│   │   ├── load-balancer-deployer.py  # Advanced deployment
│   │   └── quick-deploy.py   # Simple deployment
│   ├── monitoring/            # Monitoring scripts (empty for now)
│   └── backup/                # Backup scripts (empty for now)
├── tests/                      # Test files
│   ├── unit/                  # Unit tests
│   │   └── test_load_balancer.py
│   └── integration/           # Integration tests (empty for now)
├── examples/                   # Example configurations (empty for now)
├── .gitignore                 # Git ignore file
├── .mcp.json                  # MCP configuration
├── README.md                  # Project README
├── docker-compose.yml         # Docker Compose configuration
├── docker-compose.prod.yml    # Production Docker Compose
├── package.json              # Node.js dependencies (if any)
├── requirements.txt          # Python dependencies (if any)
└── LICENSE                   # License file (if any)
```

## Key Components

### 1. Source Code (`src/`)
- **load-balancer/**: HTTP load balancer with health checks
- **caching/**: Intelligent caching system with LRU eviction
- **config/**: Configuration management
- **utils/**: Utility functions (to be expanded)

### 2. Configuration (`config/`)
- **templates/**: Template configurations for different environments
- **environments/**: Environment-specific settings (development, production, staging)

### 3. Documentation (`docs/`)
- **architecture/**: Technical architecture and design documents
- **deployment/**: Deployment guides and operational documentation
- **api/**: API documentation (to be expanded)
- **AGENTS.md**: BMAD personas and activation protocols
- **CONSTITUTION.md**: Project constitution and governance rules
- **SESSION_RESUME_CONTEXT.md**: Current development status and context

### 4. Scripts (`scripts/`)
- **deploy/**: Deployment automation scripts
- **monitoring/**: System monitoring scripts (to be expanded)
- **backup/**: Backup and recovery scripts (to be expanded)

### 5. Tests (`tests/`)
- **unit/**: Unit tests for individual components
- **integration/**: Integration tests for system components (to be expanded)

## Configuration Management

### Environment-Specific Configuration
The project uses environment-specific configuration files:

- **Development**: `config/environments/.env.development`
- **Production**: `config/environments/.env.production`
- **Staging**: `config/environments/.env.staging`

### Configuration Files
- **load-balancer-config.yml**: Main configuration for load balancer
- **.env.example**: Template for environment variables
- **storage-performance.yml**: Performance optimization settings

## Deployment Strategy

### Docker Deployment
- **Dockerfile**: Container configuration for load balancer
- **docker-compose.yml**: Local development environment
- **docker-compose.prod.yml**: Production deployment environment

### Deployment Modes
1. **Quick Deployment**: Use `scripts/deploy/quick-deploy.py` for simple deployments
2. **Advanced Deployment**: Use `scripts/deploy/load-balancer-deployer.py` for complex deployments
3. **Docker Compose**: Use `docker-compose.yml` for local development
4. **Production**: Use `docker-compose.prod.yml` for production deployments

## File Organization Principles

### Source Code Organization
- **Load Balancer**: `src/load-balancer/`
- **Caching System**: `src/caching/`
- **Configuration**: `src/config/`
- **Utilities**: `src/utils/`

### Documentation Organization
- **Architecture**: `docs/architecture/`
- **Deployment**: `docs/deployment/`
- **API**: `docs/api/`
- **Constitution**: `docs/CONSTITUTION.md`
- **Session Context**: `docs/SESSION_RESUME_CONTEXT.md`

### Script Organization
- **Deployment**: `scripts/deploy/`
- **Monitoring**: `scripts/monitoring/`
- **Backup**: `scripts/backup/`

### Test Organization
- **Unit Tests**: `tests/unit/`
- **Integration Tests**: `tests/integration/`

## Configuration File Locations

### Template Configuration
- **Load Balancer**: `config/templates/load-balancer-config.yml`
- **Environment Variables**: `config/templates/.env.example`

### Environment Configuration
- **Development**: `config/environments/.env.development`
- **Production**: `config/environments/.env.production`
- **Staging**: `config/environments/.env.staging`

### Performance Configuration
- **Storage Performance**: `src/config/storage-performance.yml`

## Deployment File Locations

### Docker Files
- **Load Balancer Dockerfile**: `src/load-balancer/Dockerfile`
- **Docker Compose**: `docker-compose.yml` (development)
- **Production Docker Compose**: `docker-compose.prod.yml`

### Deployment Scripts
- **Quick Deploy**: `scripts/deploy/quick-deploy.py`
- **Advanced Deploy**: `scripts/deploy/load-balancer-deployer.py`

## File Naming Conventions

### Source Code
- **Python Files**: `snake_case.py`
- **Configuration Files**: `kebab-case.yml`
- **Template Files**: `kebab-case.template` or `kebab-case.example`

### Documentation
- **Markdown Files**: `kebab-case.md`
- **Configuration Files**: `kebab-case.yml`
- **Template Files**: `kebab-case.template` or `kebab-case.example`

### Scripts
- **Python Scripts**: `kebab-case.py`
- **Shell Scripts**: `kebab-case.sh`
- **Configuration Files**: `kebab-case.yml`

## Git Ignore Rules

### Ignored Files
- **Temporary Files**: `*.tmp`, `*.temp`
- **Log Files**: `logs/`, `*.log`
- **Cache Files**: `cache/`, `.cache/`
- **Build Files**: `build/`, `dist/`
- **Test Files**: `test-results/`, `coverage/`
- **Environment Files**: `.env`, `.env.local`
- **IDE Files**: `.vscode/`, `.idea/`
- **OS Files**: `.DS_Store`, `Thumbs.db`

### Tracked Files
- **Source Code**: `src/`, `tests/`
- **Configuration**: `config/`, `templates/`
- **Documentation**: `docs/`
- **Scripts**: `scripts/`
- **Docker Files**: `Dockerfile`, `docker-compose.yml`
- **README Files**: `README.md`, `CONSTITUTION.md`

## Environment Variable Management

### Environment Variables
- **Load Balancer**: `LOAD_BALANCER_HOST`, `LOAD_BALANCER_PORT`
- **Service Endpoints**: `CHROMADB_HOST`, `CHROMADB_PORT`, `MEMORY_SERVICE_HOST`, `MEMORY_SERVICE_PORT`
- **Health Checks**: `HEALTH_CHECK_INTERVAL`, `HEALTH_CHECK_TIMEOUT`
- **Logging**: `LOG_LEVEL`, `LOG_FORMAT`

### Configuration File Locations
- **Templates**: `config/templates/`
- **Environment Files**: `config/environments/`
- **Runtime Configuration**: `src/config/`

## Backup and Recovery

### Backup Locations
- **Configuration**: `config/backups/`
- **Data**: `data/backups/`
- **Logs**: `logs/backups/`

### Backup Scripts
- **Configuration Backup**: `scripts/backup/config-backup.sh`
- **Data Backup**: `scripts/backup/data-backup.sh`
- **Log Backup**: `scripts/backup/log-backup.sh`

## Monitoring and Logging

### Log Locations
- **Application Logs**: `logs/`
- **System Logs**: `/var/log/`
- **Docker Logs**: `docker logs`

### Monitoring Scripts
- **Health Checks**: `scripts/monitoring/health-checks.py`
- **Performance Monitoring**: `scripts/monitoring/performance-monitoring.py`
- **Log Analysis**: `scripts/monitoring/log-analysis.py`

## Security Considerations

### File Permissions
- **Configuration Files**: `600` (owner read/write only)
- **Private Keys**: `400` (owner read only)
- **Public Keys**: `644` (owner read/write, group/others read)
- **Scripts**: `700` (owner read/write/execute)

### Configuration Security
- **Sensitive Data**: Use environment variables or encrypted configuration
- **Access Control**: Restrict access to sensitive files
- **Audit Logging**: Log access to sensitive configurations

## Performance Optimization

### Configuration Optimization
- **Load Balancer**: `src/config/storage-performance.yml`
- **Caching**: `src/caching/storage-caching.py`
- **Network**: `config/templates/network-optimization.yml`

### Performance Monitoring
- **Metrics**: `scripts/monitoring/metrics-collector.py`
- **Alerts**: `scripts/monitoring/alert-manager.py`
- **Reports**: `scripts/monitoring/performance-reports.py`

## Deployment Automation

### Deployment Scripts
- **Quick Deploy**: `scripts/deploy/quick-deploy.py`
- **Advanced Deploy**: `scripts/deploy/load-balancer-deployer.py`
- **Rollback**: `scripts/deploy/rollback.py`

### Configuration Management
- **Templates**: `config/templates/`
- **Environments**: `config/environments/`
- **Runtime**: `src/config/`

## Maintenance and Updates

### Update Procedures
- **Configuration Updates**: Update `config/environments/` files
- **Code Updates**: Update `src/` files
- **Documentation Updates**: Update `docs/` files
- **Script Updates**: Update `scripts/` files

### Maintenance Tasks
- **Log Rotation**: `scripts/monitoring/log-rotation.sh`
- **Cache Cleanup**: `scripts/monitoring/cache-cleanup.py`
- **Backup Verification**: `scripts/backup/verify-backups.sh`

This project structure provides a clean, organized, and maintainable codebase that is easy to deploy and configure for different environments.