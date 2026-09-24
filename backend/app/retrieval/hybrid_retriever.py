from typing import List, Dict, Any, Union
from sqlalchemy.ext.asyncio import AsyncSession
from app.retrieval.base import BaseRetriever
from app.retrieval.vector_retriever import VectorRetriever
from app.retrieval.bm25_retriever import BM25Retriever
from app.retrieval.rrf_service import RRFService
from app.retrieval.reranker import RerankerService
from app.domain.schemas import MetadataFilter


class HybridRetriever(BaseRetriever):
    """
    HybridRetriever Orchestrator with Metadata Filtering:
    Applies MetadataFilter (tenant_id, document_id, document_type, department, access_level, version)
    to Vector & BM25 retrievers before RRF Fusion and Cross-Encoder Reranking.
    """

    def __init__(self, k: int = 60):
        self.vector_retriever = VectorRetriever()
        self.bm25_retriever = BM25Retriever()
        self.rrf_service = RRFService(k=k)
        self.reranker_service = RerankerService()

    async def retrieve(
        self,
        db: AsyncSession,
        target: Union[str, MetadataFilter, Any],
        query: str,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        if isinstance(target, MetadataFilter):
            filters = target
        elif hasattr(target, "tenant_id"):
            filters = MetadataFilter(tenant_id=getattr(target, "tenant_id"))
        else:
            filters = MetadataFilter(tenant_id=str(target))

        vector_results = await self.vector_retriever.retrieve(db, filters, query, top_k=20)
        bm25_results = await self.bm25_retriever.retrieve(db, filters, query, top_k=20)

        if not bm25_results:
            fused_candidates = vector_results[:20]
        elif not vector_results:
            fused_candidates = bm25_results[:20]
        else:
            fused_candidates = self.rrf_service.fuse(vector_results, bm25_results, top_k=20)

        if not fused_candidates:
            return []

        return self.reranker_service.rerank(query, fused_candidates, top_k=top_k)
