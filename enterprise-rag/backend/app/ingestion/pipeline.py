import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.domain.models import Document, DocumentChunk
from app.ingestion.parser import DocumentParser
from app.ingestion.chunker import DocumentChunker
from app.ingestion.embedder import EmbeddingService

logger = logging.getLogger("enterprise_rag.pipeline")


class IngestionPipeline:
    """
    Complete Ingestion Pipeline:
    PDF Bytes ──► DocumentParser ──► DocumentChunker ──► EmbeddingService (all-MiniLM-L6-v2) ──► pgvector
    """

    def __init__(self, chunk_size: int = 500, overlap: int = 50):
        self.parser = DocumentParser()
        self.chunker = DocumentChunker(chunk_size=chunk_size, overlap=overlap)
        self.embedder = EmbeddingService()

    async def process_document(
        self,
        db: AsyncSession,
        document_id: str,
        pdf_bytes: bytes,
        tenant_id: str
    ) -> bool:
        """
        Executes end-to-end ingestion pipeline and persists chunks & vectors to pgvector.
        """
    async def update_status(self, db: AsyncSession, document_id: str, status: str, error_message: str = None):
        stmt = select(Document).where(Document.id == document_id)
        result = await db.execute(stmt)
        doc = result.scalar_one_or_none()
        if doc:
            doc.status = status
            if error_message is not None:
                doc.error_message = error_message
            await db.commit()

    async def process_document(
        self,
        db: AsyncSession,
        document_id: str,
        pdf_bytes: bytes,
        tenant_id: str
    ) -> bool:
        """
        Executes end-to-end ingestion pipeline with Phase 25 status lifecycle:
        UPLOADED ──► PROCESSING ──► EMBEDDING ──► COMPLETED (or FAILED)
        """
        try:
            # Stage 1: PROCESSING (Parsing & Chunking)
            await self.update_status(db, document_id, "PROCESSING")

            pages = self.parser.parse_pdf(pdf_bytes)
            if not pages:
                raise ValueError("No extractable text found in PDF document.")

            chunks = self.chunker.chunk_pages(pages)

            # Stage 2: EMBEDDING (Vector Generation)
            await self.update_status(db, document_id, "EMBEDDING")

            embeddings = self.embedder.embed_chunks(chunks)

            # Stage 3: Storage & Persistence
            for idx, chunk in enumerate(chunks):
                chunk_record = DocumentChunk(
                    document_id=document_id,
                    tenant_id=tenant_id,
                    chunk_index=chunk.chunk_index,
                    content=chunk.content,
                    page_number=chunk.page_number,
                    section=chunk.section,
                    chunk_metadata={"token_count": len(chunk.content.split())},
                    embedding=embeddings[idx] if embeddings else None
                )
                db.add(chunk_record)

            # Stage 4: COMPLETED
            await self.update_status(db, document_id, "COMPLETED")
            logger.info(f"Successfully processed document {document_id} ({len(chunks)} chunks indexed in pgvector).")
            return True

        except Exception as e:
            logger.error(f"Ingestion pipeline failed for document {document_id}: {e}")
            await self.update_status(db, document_id, "FAILED", error_message=str(e))
            return False
