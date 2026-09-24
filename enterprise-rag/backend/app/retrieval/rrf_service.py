from typing import List, Dict, Any


class RRFService:
    """
    Dedicated Reciprocal Rank Fusion (RRF) Service (RRFFusion).
    Input: Vector results (Top N), BM25 results (Top N)
    Output: Combined re-ranked results
    RRF_Score(d) = sum(1 / (k + rank_m(d)))
    """

    def __init__(self, k: int = 60):
        self.k = k

    def fuse(
        self,
        vector_results: List[Dict[str, Any]],
        bm25_results: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        rrf_scores: Dict[str, float] = {}
        chunk_map: Dict[str, Dict[str, Any]] = {}

        # Process Vector Ranks
        for rank, chunk in enumerate(vector_results):
            cid = chunk["chunk_id"]
            chunk_map[cid] = chunk
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (self.k + (rank + 1)))

        # Process BM25 Ranks
        for rank, chunk in enumerate(bm25_results):
            cid = chunk["chunk_id"]
            chunk_map[cid] = chunk
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (self.k + (rank + 1)))

        # Sort chunk IDs descending by fused RRF score
        sorted_ids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)

        fused_results: List[Dict[str, Any]] = []
        for cid in sorted_ids[:top_k]:
            item = chunk_map[cid].copy()
            item["score"] = round(rrf_scores[cid], 4)
            fused_results.append(item)

        return fused_results
