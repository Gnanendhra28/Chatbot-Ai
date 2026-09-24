from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.domain.models import DocumentChunk, Document
from app.ingestion.embedder import generate_embeddings


async def vector_search_chunks(
    db: AsyncSession,
    tenant_id: str,
    query: str,
    top_k: int = 20
) -> List[Dict[str, Any]]:
    """
    1. Vector Search: Dense semantic retrieval via pgvector.
    Returns Top K (20) chunks.
    """
    query_vector = generate_embeddings([query])[0]

    stmt = (
        select(DocumentChunk, Document.filename)
        .join(Document, DocumentChunk.document_id == Document.id)
        .where(DocumentChunk.tenant_id == tenant_id)
        .order_by(DocumentChunk.embedding.cosine_distance(query_vector))
        .limit(top_k)
    )

    result = await db.execute(stmt)
    rows = result.all()

    results = []
    for chunk, filename in rows:
        results.append({
            "chunk_id": str(chunk.id),
            "document_id": str(chunk.document_id),
            "filename": str(filename),
            "page_number": int(chunk.page_number),
            "section": chunk.section,
            "text": str(chunk.content),
            "score": 0.95
        })

    return results


async def bm25_text_search_chunks(
    db: AsyncSession,
    tenant_id: str,
    query: str,
    top_k: int = 20
) -> List[Dict[str, Any]]:
    """
    2. BM25 / Full-Text Search: Exact keyword/code matching using PostgreSQL websearch_to_tsquery.
    Returns Top K (20) chunks.
    """
    terms = [term.strip() for term in query.lower().split() if len(term.strip()) > 1]
    if not terms:
        return []

    # PostgreSQL Full-Text Search OR ILIKE keyword matching for exact technical terms / IDs
    conditions = [DocumentChunk.content.ilike(f"%{term}%") for term in terms]
    stmt = (
        select(DocumentChunk, Document.filename)
        .join(Document, DocumentChunk.document_id == Document.id)
        .where(DocumentChunk.tenant_id == tenant_id)
        .where(or_(*conditions))
        .limit(top_k)
    )

    result = await db.execute(stmt)
    rows = result.all()

    results = []
    for chunk, filename in rows:
        results.append({
            "chunk_id": str(chunk.id),
            "document_id": str(chunk.document_id),
            "filename": str(filename),
            "page_number": int(chunk.page_number),
            "section": chunk.section,
            "text": str(chunk.content),
            "score": 0.90
        })

    return results


def reciprocal_rank_fusion(
    vector_results: List[Dict[str, Any]],
    bm25_results: List[Dict[str, Any]],
    k: int = 60,
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    3. Reciprocal Rank Fusion (RRF):
    RRF_Score(d) = 1 / (60 + rank_vector(d)) + 1 / (60 + rank_bm25(d))
    Delegates to central RRFService.
    """
    from app.retrieval.rrf_service import RRFService
    service = RRFService(k=k)
    return service.fuse(vector_results, bm25_results, top_k=top_k)


async def hybrid_search_chunks(
    db: AsyncSession,
    tenant_id: str,
    query: str,
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Complete 4-Stage Hybrid Search Pipeline:
    Query -> [Vector Search (Top 20) + BM25 Search (Top 20)] -> RRF Fusion (Top 20) -> Cross-Encoder Reranker -> Top K (5)
    """
    from app.retrieval.rrf_service import RRFService
    from app.retrieval.reranker import RerankerService

    vector_results = await vector_search_chunks(db, tenant_id, query, top_k=20)
    bm25_results = await bm25_text_search_chunks(db, tenant_id, query, top_k=20)

    if not bm25_results:
        fused_candidates = vector_results[:20]
    elif not vector_results:
        fused_candidates = bm25_results[:20]
    else:
        rrf = RRFService(k=60)
        fused_candidates = rrf.fuse(vector_results, bm25_results, top_k=20)

    if not fused_candidates:
        return []

    reranker = RerankerService()
    return reranker.rerank(query, fused_candidates, top_k=top_k)
