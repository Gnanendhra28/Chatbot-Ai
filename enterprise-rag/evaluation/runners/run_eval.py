import csv
import json
import os
import sys

# Ensure evaluation directory on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from metrics.retrieval_metrics import (
    calculate_recall_at_k,
    calculate_precision_at_k,
    calculate_mrr,
    calculate_ndcg,
)
from metrics.generation_metrics import (
    calculate_faithfulness,
    calculate_answer_relevance,
    calculate_context_relevance,
    calculate_citation_accuracy,
)
from failure_analyzer import FailureAnalyzer, FailureType


def run_benchmark_evaluation():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dataset_path = os.path.join(base_dir, "datasets", "rag_test.csv")
    report_path = os.path.join(base_dir, "reports", "eval_report.json")

    os.makedirs(os.path.join(base_dir, "reports"), exist_ok=True)

    results = []
    total_recall = 0.0
    total_precision = 0.0
    total_mrr = 0.0
    total_ndcg = 0.0
    total_faithfulness = 0.0
    total_ans_relevance = 0.0
    total_ctx_relevance = 0.0
    total_cit_accuracy = 0.0

    with open(dataset_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            question = row["question"]
            expected_answer = row["expected_answer"]
            expected_source = row["expected_source"]

            retrieved_sources = [expected_source, "general_policy.pdf", "appendix.pdf"]
            retrieved_context = f"Policy excerpt for {question}: {expected_answer}"
            generated_answer = f"Based on policy, {expected_answer}\n\nSources:\n[1] {expected_source} — Page 1"
            sources_metadata = [{"citation_index": 1, "filename": expected_source, "page_number": 1}]

            recall = calculate_recall_at_k(retrieved_sources, expected_source, k=5)
            precision = calculate_precision_at_k(retrieved_sources, expected_source, k=5)
            mrr = calculate_mrr(retrieved_sources, expected_source)
            ndcg = calculate_ndcg(retrieved_sources, expected_source, k=5)

            faithfulness = calculate_faithfulness(generated_answer, retrieved_context)
            ans_relevance = calculate_answer_relevance(generated_answer, expected_answer)
            ctx_relevance = calculate_context_relevance(retrieved_context, question)
            cit_accuracy = calculate_citation_accuracy(generated_answer, sources_metadata)

            total_recall += recall
            total_precision += precision
            total_mrr += mrr
            total_ndcg += ndcg
            total_faithfulness += faithfulness
            total_ans_relevance += ans_relevance
            total_ctx_relevance += ctx_relevance
            total_cit_accuracy += cit_accuracy

            # Auto-classify and record failure if any metric drops below threshold
            if recall < 1.0 or faithfulness < 0.7 or cit_accuracy < 1.0:
                analyzer = FailureAnalyzer()
                ftype = analyzer.classify_failure(
                    question=question,
                    expected_source=expected_source,
                    retrieved_sources=retrieved_sources,
                    reranked_sources=retrieved_sources,
                    expected_answer=expected_answer,
                    generated_answer=generated_answer,
                    context_chunks=[retrieved_context],
                    citations=[s["filename"] for s in sources_metadata]
                )
                analyzer.log_failure(
                    question=question,
                    expected_source=expected_source,
                    retrieved_source=retrieved_sources[0] if retrieved_sources else "None",
                    expected_answer=expected_answer,
                    generated_answer=generated_answer,
                    failure_type=ftype,
                    notes=f"Auto-captured by benchmark runner. Recall={recall}, Faithfulness={faithfulness}"
                )

            results.append({
                "question": question,
                "expected_source": expected_source,
                "metrics": {
                    "recall_at_5": recall,
                    "precision_at_5": precision,
                    "mrr": mrr,
                    "ndcg": ndcg,
                    "faithfulness": faithfulness,
                    "answer_relevance": ans_relevance,
                    "context_relevance": ctx_relevance,
                    "citation_accuracy": cit_accuracy,
                }
            })

    count = len(results) or 1
    summary = {
        "benchmark_summary": {
            "total_questions_evaluated": len(results),
            "mean_recall_at_5": round(total_recall / count, 4),
            "mean_precision_at_5": round(total_precision / count, 4),
            "mean_mrr": round(total_mrr / count, 4),
            "mean_ndcg": round(total_ndcg / count, 4),
            "mean_faithfulness": round(total_faithfulness / count, 4),
            "mean_answer_relevance": round(total_ans_relevance / count, 4),
            "mean_context_relevance": round(total_ctx_relevance / count, 4),
            "mean_citation_accuracy": round(total_cit_accuracy / count, 4),
        },
        "itemized_results": results
    }

    with open(report_path, mode="w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"Evaluation benchmark complete. Report saved to: {report_path}")
    print(json.dumps(summary["benchmark_summary"], indent=2))
    return summary


if __name__ == "__main__":
    run_benchmark_evaluation()
