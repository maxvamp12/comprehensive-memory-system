FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy application files
COPY load-balancer.py .
COPY storage-performance.yml .
COPY storage-caching.py .

# Create data directories
RUN mkdir -p /data /logs /config

# Expose port
EXPOSE 8082

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8082/health || exit 1

# Start the load balancer
CMD ["python3", "load-balancer.py"]