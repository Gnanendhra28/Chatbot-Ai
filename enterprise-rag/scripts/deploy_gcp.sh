#!/usr/bin/env bash
set -euo pipefail

# Enterprise RAG Platform — Automated GCP Cloud Run & Cloud SQL Deployment Script
# Usage: ./scripts/deploy_gcp.sh <PROJECT_ID> <REGION>

PROJECT_ID="${1:-${GCP_PROJECT_ID:-enterprise-rag-gcp}}"
REGION="${2:-${GCP_REGION:-us-central1}}"
DB_INSTANCE_NAME="enterprise-rag-sql"
DB_NAME="enterprise_rag"
DB_USER="postgres"
DB_PASSWORD="${POSTGRES_PASSWORD:-postgrespassword}"
GCS_BUCKET="${PROJECT_ID}-documents"
SERVICE_NAME="enterprise-rag-backend"

echo "=========================================================="
echo " Deploying Enterprise RAG Platform to GCP Cloud Run"
echo " Project ID: ${PROJECT_ID}"
echo " Region: ${REGION}"
echo "=========================================================="

# 1. Set Active GCP Project
gcloud config set project "${PROJECT_ID}"

# 2. Enable Required GCP APIs
echo "[1/5] Enabling GCP APIs (Cloud Run, Cloud SQL, Artifact Registry, Storage)..."
gcloud services enable \
    run.googleapis.com \
    sqladmin.googleapis.com \
    artifactregistry.googleapis.com \
    storage.googleapis.com \
    compute.googleapis.com

# 3. Create GCS Bucket for Document Storage
echo "[2/5] Provisioning GCS Bucket gs://${GCS_BUCKET}..."
if ! gcloud storage buckets describe "gs://${GCS_BUCKET}" &>/dev/null; then
    gcloud storage buckets create "gs://${GCS_BUCKET}" --location="${REGION}" --uniform-bucket-level-access
fi

# 4. Provision Cloud SQL (PostgreSQL 16 with pgvector)
echo "[3/5] Checking Cloud SQL Instance ${DB_INSTANCE_NAME}..."
if ! gcloud sql instances describe "${DB_INSTANCE_NAME}" &>/dev/null; then
    echo "Creating Cloud SQL PostgreSQL 16 instance..."
    gcloud sql instances create "${DB_INSTANCE_NAME}" \
        --database-version=POSTGRES_16 \
        --tier=db-custom-2-7680 \
        --region="${REGION}" \
        --root-password="${DB_PASSWORD}"
fi

# 5. Build and Deploy FastAPI Backend Container to Cloud Run
echo "[4/5] Building & Deploying Backend Service to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
    --source="./backend" \
    --region="${REGION}" \
    --platform=managed \
    --allow-unauthenticated \
    --set-env-vars="POSTGRES_SERVER=/cloudsql/${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME},POSTGRES_USER=${DB_USER},POSTGRES_PASSWORD=${DB_PASSWORD},POSTGRES_DB=${DB_NAME},GCS_BUCKET_NAME=${GCS_BUCKET},STORAGE_TYPE=gcs" \
    --port=8000

# 6. Retrieve Deployed Service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --format='value(status.url)')

echo "=========================================================="
echo " Cloud Run Backend Deployed Successfully!"
echo " Backend Service URL: ${SERVICE_URL}"
echo " Set frontend NEXT_PUBLIC_API_URL=${SERVICE_URL}/api/v1"
echo "=========================================================="
