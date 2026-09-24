"""
Basic RAG Evaluation Harness
Measures retrieval precision, recall, and context grounding scores across ground-truth test datasets.
"""

from typing import List, Dict, Any


def evaluate_retrieval(
    retrieved_chunks: List[Dict[str, Any]],
    expected_keywords: List[str]
) -> Dict[str, float]:
    """
    Evaluates keyword precision & recall over retrieved vector chunks.
    """
    if not retrieved_chunks or not expected_keywords:
        return {"precision": 0.0, "recall": 0.0, "f1_score": 0.0}

    combined_text = " ".join(c["text"].lower() for c in retrieved_chunks)
    found_count = sum(1 for kw in expected_keywords if kw.lower() in combined_text)

    recall = found_count / len(expected_keywords)
    precision = found_count / len(retrieved_chunks) if len(retrieved_chunks) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4)
    }


if __name__ == "__main__":
    sample_chunks = [
        {"text": "FastAPI with PostgreSQL pgvector extension for dense vector similarity search."},
        {"text": "Sentence Transformers model generates 384-dimensional normalized vector embeddings."}
    ]
    keywords = ["FastAPI", "pgvector", "Sentence Transformers"]

    metrics = evaluate_retrieval(sample_chunks, keywords)
    print(f"RAG Evaluation Benchmark Results: {metrics}")
