FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy application code
COPY load-balancer.py .
COPY storage-caching.py .
COPY storage-performance.yml .

# Create necessary directories
RUN mkdir -p /data /logs /config

# Create non-root user
RUN useradd -m -u 1000 loadbalancer && chown -R loadbalancer:loadbalancer /app
USER loadbalancer

# Expose port
EXPOSE 8082

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8082/health || exit 1

# Run the application
CMD ["python3", "load-balancer.py"]