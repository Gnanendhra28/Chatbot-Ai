import re
from typing import List, Dict, Any


def calculate_faithfulness(generated_answer: str, context_text: str) -> float:
    """
    Measures ratio of generated claim terms grounded in context.
    """
    if not generated_answer or not context_text:
        return 0.0
    ans_words = set(re.findall(r"\w+", generated_answer.lower()))
    ctx_words = set(re.findall(r"\w+", context_text.lower()))
    if not ans_words:
        return 0.0
    grounded = ans_words.intersection(ctx_words)
    return round(len(grounded) / len(ans_words), 4)


def calculate_answer_relevance(generated_answer: str, expected_answer: str) -> float:
    """
    Measures term overlap relevance between generated and ground-truth answer.
    """
    if not generated_answer or not expected_answer:
        return 0.0
    gen_words = set(re.findall(r"\w+", generated_answer.lower()))
    exp_words = set(re.findall(r"\w+", expected_answer.lower()))
    if not exp_words:
        return 0.0
    overlap = gen_words.intersection(exp_words)
    return round(len(overlap) / len(exp_words), 4)


def calculate_context_relevance(context_text: str, question: str) -> float:
    """
    Measures query term presence inside retrieved context.
    """
    if not context_text or not question:
        return 0.0
    q_words = set(re.findall(r"\w+", question.lower()))
    ctx_words = set(re.findall(r"\w+", context_text.lower()))
    if not q_words:
        return 0.0
    found = q_words.intersection(ctx_words)
    return round(len(found) / len(q_words), 4)


def calculate_citation_accuracy(generated_answer: str, sources: List[Dict[str, Any]]) -> float:
    """
    Measures accuracy of bracketed source citations [1], [2].
    """
    if not sources:
        return 1.0 if "Sources:" not in generated_answer else 0.0

    citations = re.findall(r"\[(\d+)\]", generated_answer)
    if not citations:
        return 0.0

    valid_count = sum(1 for c in citations if 1 <= int(c) <= len(sources))
    return round(valid_count / len(citations), 4)
