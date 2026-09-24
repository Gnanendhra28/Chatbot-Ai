from app.retrieval.reranker import RerankerService


def test_reranker_service_scoring():
    service = RerankerService()

    query = "How many casual leaves are available?"
    candidates = [
        {"chunk_id": "c1", "text": "Company travel policy rules and expense reimbursement guidelines.", "score": 0.5},
        {"chunk_id": "c2", "text": "Employees are entitled to 12 days of casual leave per calendar year.", "score": 0.4},
        {"chunk_id": "c3", "text": "Office working hours are Monday through Friday, 9am to 5pm.", "score": 0.3}
    ]

    reranked = service.rerank(query, candidates, top_k=2)

    assert len(reranked) == 2
    # c2 contains exact details answering the query, so it should be reranked to position 1
    assert reranked[0]["chunk_id"] == "c2"
    assert "casual leave" in reranked[0]["text"]
