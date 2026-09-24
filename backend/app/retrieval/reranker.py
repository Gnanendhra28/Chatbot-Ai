import logging
from typing import List, Dict, Any

logger = logging.getLogger("enterprise_rag.reranker")

_reranker_model = None


def _get_reranker_model():
    global _reranker_model
    if _reranker_model is None:
        try:
            from sentence_transformers import CrossEncoder
            logger.info("Loading CrossEncoder model: cross-encoder/ms-marco-MiniLM-L-6-v2")
            _reranker_model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        except Exception as e:
            logger.warning(f"Failed to load CrossEncoder model ({e}). Using heuristic term-overlap cross score fallback.")
            _reranker_model = "fallback"
    return _reranker_model


class RerankerService:
    """
    Cross-Encoder Reranker Service.
    Evaluates joint attention over (Question, Chunk Content) text pairs to compute high-precision relevance scores.
    Pipeline: Hybrid Search (Top 20) ──► Reranker ──► Top 5.
    """

    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model_name = model_name

    def rerank(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Reranks a candidate list of chunks for a given query and returns the Top K.
        """
        if not chunks:
            return []

        model = _get_reranker_model()

        if model != "fallback":
            pairs = [(query, c["text"]) for c in chunks]
            scores = model.predict(pairs)
            for idx, c in enumerate(chunks):
                c_copy = c.copy()
                c_copy["score"] = round(float(scores[idx]), 4)
                chunks[idx] = c_copy
        else:
            # Fallback heuristic score calculator
            query_words = set(query.lower().split())
            for c in chunks:
                chunk_words = set(c["text"].lower().split())
                overlap = len(query_words.intersection(chunk_words))
                base_score = c.get("score", 0.5)
                c["score"] = round(base_score + (overlap * 0.1), 4)

        # Sort descending by cross-encoder score
        reranked = sorted(chunks, key=lambda c: c["score"], reverse=True)
        return reranked[:top_k]
