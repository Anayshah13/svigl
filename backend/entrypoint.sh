#!/bin/sh
set -e

PORT="${PORT:-8000}"

echo "Running database migrations..."
alembic upgrade head

if [ "$#" -gt 0 ]; then
  echo "Starting with custom command: $*"
  exec "$@"
fi

echo "Starting API on 0.0.0.0:${PORT} (Railway public domain target port must match this)"
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT}" \
  --proxy-headers \
  --forwarded-allow-ips='*'
