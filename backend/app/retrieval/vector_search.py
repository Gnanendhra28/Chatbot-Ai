from typing import List, Dict, Any, Union
from sqlalchemy.ext.asyncio import AsyncSession
from app.retrieval.hybrid_retriever import HybridRetriever
from app.domain.schemas import MetadataFilter

_hybrid_retriever_instance = HybridRetriever()


async def search_relevant_chunks(
    db: AsyncSession,
    target: Union[str, MetadataFilter],
    query: str,
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Primary chunk retrieval entrypoint accepting tenant_id or MetadataFilter object.
    """
    return await _hybrid_retriever_instance.retrieve(db, target, query, top_k=top_k)
