from app.retrieval.hybrid_search import reciprocal_rank_fusion


def test_reciprocal_rank_fusion_formula():
    vector_results = [
        {"chunk_id": "c1", "document_id": "d1", "filename": "doc1.pdf", "page_number": 1, "text": "Semantic text match for RAG"},
        {"chunk_id": "c2", "document_id": "d1", "filename": "doc1.pdf", "page_number": 2, "text": "Error Code ERR_502 Gateway Failure"}
    ]

    bm25_results = [
        {"chunk_id": "c2", "document_id": "d1", "filename": "doc1.pdf", "page_number": 2, "text": "Error Code ERR_502 Gateway Failure"},
        {"chunk_id": "c3", "document_id": "d2", "filename": "doc2.pdf", "page_number": 5, "text": "Product ID PROD_8891 Details"}
    ]

    fused = reciprocal_rank_fusion(vector_results, bm25_results, k=60, top_k=3)

    assert len(fused) == 3
    # c2 appears in both lists (vector rank 2, BM25 rank 1), so its RRF score should be highest
    assert fused[0]["chunk_id"] == "c2"
    assert "ERR_502" in fused[0]["text"]
