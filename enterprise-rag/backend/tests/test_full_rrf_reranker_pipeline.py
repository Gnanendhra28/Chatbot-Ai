import pytest
from app.retrieval.rrf_service import RRFService
from app.retrieval.reranker import RerankerService
from app.retrieval.hybrid_search import reciprocal_rank_fusion


def test_rrf_fusion_reciprocal_scoring():
    service = RRFService(k=60)

    # Vector results rank c1 higher than c2
    vector_results = [
        {"chunk_id": "c1", "text": "High semantic similarity text for enterprise security.", "score": 0.95},
        {"chunk_id": "c2", "text": "API rate limits are 50 requests per second.", "score": 0.80}
    ]

    # BM25 results rank c2 higher than c1 due to exact keyword 'rate limits'
    bm25_results = [
        {"chunk_id": "c2", "text": "API rate limits are 50 requests per second.", "score": 0.90},
        {"chunk_id": "c3", "text": "Unrelated document text.", "score": 0.50}
    ]

    fused = service.fuse(vector_results, bm25_results, top_k=3)

    assert len(fused) == 3
    # c2 appeared in both vector (rank 2) and BM25 (rank 1), so its fused RRF score should be highest
    assert fused[0]["chunk_id"] == "c2"
    expected_c2_score = round((1.0 / (60 + 2)) + (1.0 / (60 + 1)), 4)
    assert fused[0]["score"] == expected_c2_score


def test_cross_encoder_reranker_pipeline():
    reranker = RerankerService()
    query = "What is the exact API rate limit per second?"

    candidates = [
        {"chunk_id": "c1", "text": "Enterprise security policies cover password complexity requirements.", "score": 0.85},
        {"chunk_id": "c2", "text": "System maintenance windows occur every Sunday at 02:00 UTC.", "score": 0.82},
        {"chunk_id": "c3", "text": "API rate limit is strictly 50 requests per second.", "score": 0.70}
    ]

    # Reranker should elevate c3 to rank 1 because it directly answers the query
    reranked = reranker.rerank(query, candidates, top_k=2)

    assert len(reranked) == 2
    assert reranked[0]["chunk_id"] == "c3"
    assert "50 requests per second" in reranked[0]["text"]


def test_end_to_end_rrf_and_reranker_integration():
    rrf = RRFService(k=60)
    reranker = RerankerService()
    query = "How to request a refund for enterprise subscription?"

    vector_chunks = [
        {"chunk_id": "v1", "text": "Subscriptions can be canceled in the billing portal.", "score": 0.90},
        {"chunk_id": "v2", "text": "Refund requests are processed within 14 business days.", "score": 0.88}
    ]

    bm25_chunks = [
        {"chunk_id": "b1", "text": "Refund policy details for annual accounts.", "score": 0.92},
        {"chunk_id": "v2", "text": "Refund requests are processed within 14 business days.", "score": 0.85}
    ]

    # 1. RRF Fusion Stage
    fused = rrf.fuse(vector_chunks, bm25_chunks, top_k=10)
    assert len(fused) == 3
    assert fused[0]["chunk_id"] == "v2"  # In both lists

    # 2. Reranker Stage
    final_top_k = reranker.rerank(query, fused, top_k=2)
    assert len(final_top_k) == 2
    assert "refund" in final_top_k[0]["text"].lower()
