from evaluation.metrics.retrieval_metrics import (
    calculate_recall_at_k,
    calculate_precision_at_k,
    calculate_mrr,
    calculate_ndcg,
)
from evaluation.metrics.generation_metrics import (
    calculate_faithfulness,
    calculate_answer_relevance,
    calculate_context_relevance,
    calculate_citation_accuracy,
)


def test_retrieval_metrics_calculation():
    retrieved = ["refund.pdf", "policy.pdf", "terms.pdf"]
    expected = "refund.pdf"

    assert calculate_recall_at_k(retrieved, expected, k=5) == 1.0
    assert calculate_precision_at_k(retrieved, expected, k=3) == 0.3333
    assert calculate_mrr(retrieved, expected) == 1.0
    assert calculate_ndcg(retrieved, expected, k=5) == 1.0


def test_generation_metrics_calculation():
    answer = "Customers can request refunds within 30 days.\n\nSources:\n[1] refund.pdf — Page 1"
    context = "Refund policy: Customers can request refunds within 30 days of purchase."
    expected_ans = "Customers can request refunds within 30 days."

    assert calculate_faithfulness(answer, context) >= 0.5
    assert calculate_answer_relevance(answer, expected_ans) >= 0.5
    assert calculate_context_relevance(context, "What is the refund policy?") >= 0.4
    assert calculate_citation_accuracy(answer, [{"filename": "refund.pdf"}]) == 1.0
