import math
from typing import List


def calculate_recall_at_k(retrieved_sources: List[str], expected_source: str, k: int = 5) -> float:
    top_k_sources = retrieved_sources[:k]
    return 1.0 if any(expected_source.lower() in s.lower() for s in top_k_sources) else 0.0


def calculate_precision_at_k(retrieved_sources: List[str], expected_source: str, k: int = 5) -> float:
    top_k_sources = retrieved_sources[:k]
    if not top_k_sources:
        return 0.0
    matches = sum(1 for s in top_k_sources if expected_source.lower() in s.lower())
    return round(matches / len(top_k_sources), 4)


def calculate_mrr(retrieved_sources: List[str], expected_source: str) -> float:
    for idx, source in enumerate(retrieved_sources):
        if expected_source.lower() in source.lower():
            return round(1.0 / (idx + 1), 4)
    return 0.0


def calculate_ndcg(retrieved_sources: List[str], expected_source: str, k: int = 5) -> float:
    top_k_sources = retrieved_sources[:k]
    dcg = 0.0
    for idx, source in enumerate(top_k_sources):
        if expected_source.lower() in source.lower():
            rank = idx + 1
            dcg += 1.0 / math.log2(rank + 1)
    idcg = 1.0  # Ideal DCG for single expected target
    return round(dcg / idcg, 4) if idcg > 0 else 0.0
