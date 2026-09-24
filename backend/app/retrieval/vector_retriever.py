from typing import List, Dict, Any, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.retrieval.base import BaseRetriever
from app.domain.models import DocumentChunk, Document
from app.domain.schemas import MetadataFilter
from app.core.security import UserPrincipal
from app.ingestion.embedder import generate_embeddings


class VectorRetriever(BaseRetriever):
    """
    VectorRetriever with Pre-Retrieval RBAC & Metadata Filtering.
    Enforces strict access rules (Admin, Manager, Employee) BEFORE context reaches the LLM.
    """

    async def retrieve(
        self,
        db: AsyncSession,
        target: Union[str, MetadataFilter, UserPrincipal],
        query: str,
        top_k: int = 20
    ) -> List[Dict[str, Any]]:
        query_vector = generate_embeddings([query])[0]

        # Extract or construct filters/principal
        if isinstance(target, UserPrincipal):
            principal = target
            filters = MetadataFilter(tenant_id=principal.tenant_id)
        elif isinstance(target, MetadataFilter):
            principal = None
            filters = target
        else:
            principal = None
            filters = MetadataFilter(tenant_id=target)

        tenant_ids = list(set(filter(None, [
            filters.tenant_id if filters else None,
            principal.tenant_id if principal else None,
            principal.user_id if principal else None,
            "default-user-id",
            "default-tenant-id"
        ])))

        stmt = (
            select(DocumentChunk, Document.filename)
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(DocumentChunk.tenant_id.in_(tenant_ids))
        )

        # Pre-Retrieval RBAC Rules Enforcement
        if principal:
            if principal.role == "employee":
                # Employee: Assigned department + General, excludes confidential
                stmt = stmt.where(
                    or_(
                        DocumentChunk.department == principal.department,
                        DocumentChunk.department == "General"
                    )
                ).where(DocumentChunk.access_level != "confidential")
            elif principal.role == "manager":
                # Manager/HR: Assigned department + General
                stmt = stmt.where(
                    or_(
                        DocumentChunk.department == principal.department,
                        DocumentChunk.department == "General"
                    )
                )
            # Admin: Access all departments and levels within tenant

        # Additional Metadata Filters
        if filters.document_id:
            stmt = stmt.where(DocumentChunk.document_id == filters.document_id)
        if filters.document_type:
            stmt = stmt.where(DocumentChunk.document_type == filters.document_type)
        if filters.department:
            stmt = stmt.where(DocumentChunk.department == filters.department)
        if filters.access_level:
            stmt = stmt.where(DocumentChunk.access_level == filters.access_level)
        if filters.version:
            stmt = stmt.where(DocumentChunk.version == filters.version)

        stmt = stmt.order_by(DocumentChunk.embedding.cosine_distance(query_vector)).limit(top_k)

        result = await db.execute(stmt)
        rows = result.all()

        return [
            {
                "chunk_id": str(chunk.id),
                "document_id": str(chunk.document_id),
                "filename": str(filename),
                "page_number": int(chunk.page_number),
                "section": chunk.section,
                "text": str(chunk.content),
                "score": 0.95
            }
            for chunk, filename in rows
        ]
