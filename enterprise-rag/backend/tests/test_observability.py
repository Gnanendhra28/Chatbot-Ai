from app.core.observability import ObservabilityTracer


def test_observability_tracer_fields():
    tracer = ObservabilityTracer(
        user_id="user_123",
        tenant_id="company_A",
        query="What is the refund period?",
        model="gpt-4o-mini"
    )

    tracer.record_retrieval([{"chunk_id": "c1", "score": 0.88}])
    tracer.record_rerank([{"chunk_id": "c1", "score": 0.96}])
    tracer.record_llm_response("Refunds are allowed within 30 days.", prompt_tokens=100, completion_tokens=25)
    tracer.record_citations([{"filename": "refund.pdf", "page_number": 1}])

    assert tracer.request_id.startswith("req_")
    assert tracer.user_id == "user_123"
    assert tracer.tenant_id == "company_A"
    assert tracer.query == "What is the refund period?"
    assert tracer.retrieved_chunks == ["c1"]
    assert tracer.reranker_scores == [0.96]
    assert tracer.token_usage["total_tokens"] == 125
    assert len(tracer.citations) == 1
