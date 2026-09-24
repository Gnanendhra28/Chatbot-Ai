from app.retrieval.rrf_service import RRFService
from app.retrieval.hybrid_retriever import HybridRetriever
from app.retrieval.vector_retriever import VectorRetriever
from app.retrieval.bm25_retriever import BM25Retriever


def test_rrf_service_class():
    service = RRFService(k=60)

    vector_results = [
        {"chunk_id": "v1", "document_id": "d1", "filename": "doc.pdf", "page_number": 1, "text": "Semantic match"},
        {"chunk_id": "v2", "document_id": "d1", "filename": "doc.pdf", "page_number": 2, "text": "Error Code 500"}
    ]

    bm25_results = [
        {"chunk_id": "v2", "document_id": "d1", "filename": "doc.pdf", "page_number": 2, "text": "Error Code 500"},
        {"chunk_id": "b1", "document_id": "d2", "filename": "guide.pdf", "page_number": 4, "text": "Product ID 100"}
    ]

    fused = service.fuse(vector_results, bm25_results, top_k=2)

    assert len(fused) == 2
    assert fused[0]["chunk_id"] == "v2"  # Highest RRF score since it appeared in both lists
    assert fused[0]["score"] > fused[1]["score"]


def test_hybrid_retriever_instantiation():
    retriever = HybridRetriever()
    assert isinstance(retriever.vector_retriever, VectorRetriever)
    assert isinstance(retriever.bm25_retriever, BM25Retriever)
    assert isinstance(retriever.rrf_service, RRFService)
