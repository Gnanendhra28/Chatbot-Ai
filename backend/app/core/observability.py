import time
import uuid
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.models import RetrievalLog

logger = logging.getLogger("enterprise_rag.observability")


class ObservabilityTracer:
    """
    Phase 20 End-to-End Pipeline Observability Tracer.
    Tracks query execution across all stages:
    Query ──► Embedding ──► Vector Search ──► BM25 ──► RRF ──► Reranker ──► LLM.
    """

    def __init__(self, user_id: str, tenant_id: str, query: str, model: str = "gpt-4o-mini"):
        self.request_id = f"req_{uuid.uuid4().hex[:12]}"
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.query = query
        self.model = model

        self.start_time = time.time()
        self.stage_timestamps: Dict[str, float] = {}
        
        self.retrieved_chunks: List[str] = []
        self.scores: List[float] = []
        self.reranker_scores: List[float] = []
        self.token_usage: Dict[str, int] = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        self.citations: List[Dict[str, Any]] = []
        self.answer: str = ""

    def mark_stage(self, stage_name: str):
        self.stage_timestamps[stage_name] = time.time()

    def record_retrieval(self, chunks: List[Dict[str, Any]]):
        self.retrieved_chunks = [c.get("chunk_id", "") for c in chunks]
        self.scores = [c.get("score", 0.0) for c in chunks]

    def record_rerank(self, reranked_chunks: List[Dict[str, Any]]):
        self.reranker_scores = [c.get("score", 0.0) for c in reranked_chunks]
        self.retrieved_chunks = [c.get("chunk_id", "") for c in reranked_chunks]

    def record_llm_response(self, answer: str, prompt_tokens: int = 150, completion_tokens: int = 40):
        self.answer = answer
        self.token_usage = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens
        }

    def record_citations(self, citations: List[Dict[str, Any]]):
        self.citations = citations

    def get_latency_breakdown(self) -> Dict[str, float]:
        now = time.time()
        total_ms = round((now - self.start_time) * 1000, 2)
        return {
            "retrieval_ms": round(self.stage_timestamps.get("retrieval_end", now) - self.start_time, 4) * 1000,
            "rerank_ms": round(self.stage_timestamps.get("rerank_end", now) - self.stage_timestamps.get("retrieval_end", self.start_time), 4) * 1000,
            "llm_ms": round(now - self.stage_timestamps.get("rerank_end", self.start_time), 4) * 1000,
            "total_ms": total_ms
        }

    async def persist_trace(self, db: AsyncSession):
        """
        Persists structured trace log record into PostgreSQL retrieval_logs table.
        """
        try:
            latency_data = self.get_latency_breakdown()
            log_record = RetrievalLog(
                request_id=self.request_id,
                user_id=self.user_id,
                tenant_id=self.tenant_id,
                query=self.query,
                retrieved_chunks={"chunk_ids": self.retrieved_chunks},
                scores={"initial_scores": self.scores},
                reranker_scores={"reranker_scores": self.reranker_scores},
                model=self.model,
                token_usage=self.token_usage,
                latency=latency_data,
                answer=self.answer,
                citations={"citations": self.citations}
            )
            db.add(log_record)
            await db.commit()
            logger.info(f"[ObservabilityTracer] Logged trace request_id={self.request_id} total_ms={latency_data['total_ms']}")
        except Exception as e:
            logger.error(f"[ObservabilityTracer] Failed to persist trace: {e}")
