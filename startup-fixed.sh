#!/bin/bash
set -e

# Create directories if they don't exist
mkdir -p /app/data /app/logs /app/uploads /app/downloads /app/processed /app/temp /app/overlays /app/credentials

# Set proper permissions
chown -R appuser:appuser /app
chmod -R 755 /app

# Start the application
exec node server/index.js
