import os
import logging
from app.core.db import AsyncSessionLocal
from app.ingestion.pipeline import IngestionPipeline

logger = logging.getLogger("enterprise_rag.worker")


async def run_background_ingestion(document_id: str, file_path: str, tenant_id: str):
    """
    Phase 25 Background Worker Task:
    Executes parsing, chunking, embedding generation, and vector indexing asynchronously.
    """
    logger.info(f"[Worker] Starting background ingestion task for document {document_id}")
    async with AsyncSessionLocal() as db:
        try:
            if not os.path.exists(file_path):
                pipeline = IngestionPipeline()
                await pipeline.update_status(db, document_id, "FAILED", error_message="File not found on disk.")
                return

            with open(file_path, "rb") as f:
                pdf_bytes = f.read()

            pipeline = IngestionPipeline()
            success = await pipeline.process_document(
                db=db,
                document_id=document_id,
                pdf_bytes=pdf_bytes,
                tenant_id=tenant_id
            )
            if success:
                logger.info(f"[Worker] Successfully completed background ingestion for document {document_id}")
            else:
                logger.warning(f"[Worker] Background ingestion failed for document {document_id}")

        except Exception as e:
            logger.error(f"[Worker] Exception in background worker task for document {document_id}: {e}")
            try:
                pipeline = IngestionPipeline()
                await pipeline.update_status(db, document_id, "FAILED", error_message=str(e))
            except Exception as inner_e:
                logger.error(f"[Worker] Could not update status to FAILED: {inner_e}")
