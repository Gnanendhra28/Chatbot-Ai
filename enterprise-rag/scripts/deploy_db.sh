#!/usr/bin/env bash
set -e

echo "=== Enterprise RAG Production Database Initialization ==="

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set."
  exit 1
fi

echo "[1/2] Verifying pgvector extension..."
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "[2/2] Running Alembic database migrations..."
cd backend
alembic upgrade head

echo "=== Production Database Setup Complete! ==="
