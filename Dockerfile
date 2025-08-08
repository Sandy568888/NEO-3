# =================================
# Build Stage - Client
# =================================
FROM node:20-bookworm-slim AS client-builder

WORKDIR /app/client

# Install build dependencies
RUN apt-get update && apt-get install -y python3 make g++

# Copy package files
COPY client/package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm install

# Copy client source
COPY client/ .

# Build client
RUN npm run build

# =================================
# Production Stage
# =================================
FROM node:20-bookworm-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    sox \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user and set up directories
RUN groupadd -r appuser && useradd -r -g appuser appuser
WORKDIR /app

# Create necessary directories with correct permissions
RUN mkdir -p /app/data /app/logs /app/uploads /app/downloads /app/processed /app/temp /app/overlays /app/credentials \
    && chown -R appuser:appuser /app/data /app/logs /app/uploads /app/downloads /app/processed /app/temp /app/overlays /app/credentials

# Create and activate Python virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy built client
COPY --from=client-builder /app/client/build ./client/build

# Copy server files
COPY server/ ./server/
COPY config/ ./config/
COPY .sequelizerc ./
COPY startup.sh ./

# Set permissions
RUN chmod +x /app/startup.sh

# Switch to non-root user
USER appuser

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application using the startup script
CMD ["/app/startup.sh"]
