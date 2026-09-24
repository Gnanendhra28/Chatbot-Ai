import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger("enterprise_rag.gcs_storage")


class GCSStorageService:
    """
    Google Cloud Storage Client Service:
    Manages document upload, download, and deletion in GCP GCS buckets.
    """

    def __init__(self, bucket_name: Optional[str] = None):
        self.bucket_name = bucket_name or settings.GCS_BUCKET_NAME

    def upload_bytes(self, destination_blob_name: str, content: bytes) -> str:
        """
        Uploads raw bytes to GCS bucket and returns gs:// URI.
        """
        try:
            from google.cloud import storage
            client = storage.Client(project=settings.GCP_PROJECT_ID)
            bucket = client.bucket(self.bucket_name)
            blob = bucket.blob(destination_blob_name)
            blob.upload_from_string(content)
            gcs_uri = f"gs://{self.bucket_name}/{destination_blob_name}"
            logger.info(f"[GCS] Uploaded blob successfully: {gcs_uri}")
            return gcs_uri
        except Exception as e:
            logger.error(f"[GCS] Upload failed for {destination_blob_name}: {e}")
            raise e

    def download_bytes(self, blob_name: str) -> bytes:
        """
        Downloads bytes from GCS bucket.
        """
        try:
            from google.cloud import storage
            client = storage.Client(project=settings.GCP_PROJECT_ID)
            bucket = client.bucket(self.bucket_name)
            blob = bucket.blob(blob_name)
            content = blob.download_as_bytes()
            return content
        except Exception as e:
            logger.error(f"[GCS] Download failed for {blob_name}: {e}")
            raise e

    def delete_blob(self, blob_name: str) -> bool:
        """
        Deletes object from GCS bucket.
        """
        try:
            from google.cloud import storage
            client = storage.Client(project=settings.GCP_PROJECT_ID)
            bucket = client.bucket(self.bucket_name)
            blob = bucket.blob(blob_name)
            blob.delete()
            logger.info(f"[GCS] Deleted blob: {blob_name}")
            return True
        except Exception as e:
            logger.warning(f"[GCS] Failed to delete blob {blob_name}: {e}")
            return False
