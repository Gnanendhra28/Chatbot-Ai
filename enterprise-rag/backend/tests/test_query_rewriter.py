import pytest
from app.retrieval.query_rewriter import QueryRewriter


@pytest.mark.asyncio
async def test_query_rewriter_standalone():
    rewriter = QueryRewriter()
    query = "What is the refund policy?"
    result = await rewriter.rewrite_query(query, [])
    assert result == "What is the refund policy?"


@pytest.mark.asyncio
async def test_query_rewriter_pronoun_resolution():
    rewriter = QueryRewriter()
    history = [
        {"role": "user", "content": "What is the refund policy?"},
        {"role": "assistant", "content": "Customers can request refunds within 30 days."}
    ]
    follow_up = "What about enterprise ones?"
    rewritten = await rewriter.rewrite_query(follow_up, history)

    # Verify query contains expanded standalone context (e.g. refund policy + enterprise)
    assert "refund policy" in rewritten.lower()
    assert "enterprise" in rewritten.lower()
