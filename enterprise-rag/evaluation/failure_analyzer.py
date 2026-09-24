import json
import os
from enum import Enum
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone


class FailureType(str, Enum):
    RETRIEVAL_FAILURE = "Retrieval failure"
    RERANKING_FAILURE = "Reranking failure"
    CHUNKING_FAILURE = "Chunking failure"
    QUERY_REWRITING_FAILURE = "Query rewriting failure"
    CONTEXT_CONSTRUCTION_FAILURE = "Context construction failure"
    GENERATION_FAILURE = "Generation failure"
    CITATION_FAILURE = "Citation failure"
    NO_ANSWER_DETECTION_FAILURE = "No-answer detection failure"


class FailureRecord:
    def __init__(
        self,
        question: str,
        expected_source: str,
        retrieved_source: str,
        expected_answer: str,
        generated_answer: str,
        failure_type: FailureType,
        notes: Optional[str] = None
    ):
        self.question = question
        self.expected_source = expected_source
        self.retrieved_source = retrieved_source
        self.expected_answer = expected_answer
        self.generated_answer = generated_answer
        self.failure_type = failure_type.value if isinstance(failure_type, FailureType) else failure_type
        self.notes = notes or ""
        self.timestamp = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "question": self.question,
            "expected_source": self.expected_source,
            "retrieved_source": self.retrieved_source,
            "expected_answer": self.expected_answer,
            "generated_answer": self.generated_answer,
            "failure_type": self.failure_type,
            "notes": self.notes,
            "timestamp": self.timestamp
        }


class FailureAnalyzer:
    """
    RAG Failure Analysis & Engineering Feedback Loop Service.
    Inspects, logs, classifies, and reports system failures across the 8 RAG failure modes.
    """

    def __init__(self, log_path: Optional[str] = None):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__)))
        self.log_path = log_path or os.path.join(base_dir, "reports", "failure_analysis_report.json")

    def classify_failure(
        self,
        question: str,
        expected_source: str,
        retrieved_sources: List[str],
        reranked_sources: List[str],
        expected_answer: str,
        generated_answer: str,
        context_chunks: List[str],
        citations: List[str],
        rewritten_query: Optional[str] = None
    ) -> FailureType:
        """
        Automated classification heuristic across the 8 RAG failure types.
        """
        expected_src_lower = expected_source.lower()
        
        # 1. Query Rewriting Failure
        if rewritten_query and ("unrelated" in rewritten_query.lower() or len(rewritten_query.strip()) < 3):
            return FailureType.QUERY_REWRITING_FAILURE

        # 2. Retrieval Failure (target not found in initial vector/BM25 retrieval candidate set)
        all_retrieved_str = " ".join(retrieved_sources).lower()
        if expected_src_lower not in all_retrieved_str:
            return FailureType.RETRIEVAL_FAILURE

        # 3. Reranking Failure (target present in initial retrieval, but dropped/ranked out of top reranked context)
        top_reranked_str = " ".join(reranked_sources[:3]).lower() if reranked_sources else ""
        if expected_src_lower in all_retrieved_str and expected_src_lower not in top_reranked_str:
            return FailureType.RERANKING_FAILURE

        # 4. Chunking Failure (target source retrieved, but essential content split or missing from chunk text)
        combined_context = " ".join(context_chunks).lower()
        key_answer_words = [w.lower() for w in expected_answer.split() if len(w) > 4]
        missing_keywords = [w for w in key_answer_words if w not in combined_context]
        if len(missing_keywords) > len(key_answer_words) * 0.5:
            return FailureType.CHUNKING_FAILURE

        # 5. Context Construction Failure (context truncation / token window overflow)
        if len(combined_context) > 12000:
            return FailureType.CONTEXT_CONSTRUCTION_FAILURE

        # 6. No-answer detection failure (refusal when context exists, or hallucinating answer when context missing)
        refusal_phrases = ["do not have enough information", "no relevant document", "cannot answer"]
        is_refusal = any(p in generated_answer.lower() for p in refusal_phrases)
        if is_refusal and len(combined_context) > 50:
            return FailureType.NO_ANSWER_DETECTION_FAILURE

        # 7. Citation Failure (generated answer correct but cited wrong source or omitted citations)
        cit_str = " ".join(citations).lower()
        if expected_src_lower not in cit_str:
            return FailureType.CITATION_FAILURE

        # 8. Generation Failure (target context was provided, but LLM generated inaccurate/hallucinated answer)
        return FailureType.GENERATION_FAILURE

    def log_failure(
        self,
        question: str,
        expected_source: str,
        retrieved_source: str,
        expected_answer: str,
        generated_answer: str,
        failure_type: FailureType,
        notes: Optional[str] = None
    ) -> FailureRecord:
        record = FailureRecord(
            question=question,
            expected_source=expected_source,
            retrieved_source=retrieved_source,
            expected_answer=expected_answer,
            generated_answer=generated_answer,
            failure_type=failure_type,
            notes=notes
        )
        self._append_to_report(record)
        return record

    def _append_to_report(self, record: FailureRecord):
        os.makedirs(os.path.dirname(self.log_path), exist_ok=True)
        data = {"records": [], "breakdown": {}}
        if os.path.exists(self.log_path):
            try:
                with open(self.log_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                data = {"records": [], "breakdown": {}}

        records = data.get("records", [])
        records.append(record.to_dict())

        # Recalculate breakdown statistics
        breakdown = {}
        for r in records:
            ft = r.get("failure_type", "Unknown")
            breakdown[ft] = breakdown.get(ft, 0) + 1

        summary = {
            "total_failures_recorded": len(records),
            "breakdown": breakdown,
            "records": records
        }

        with open(self.log_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)

    def print_markdown_report(self) -> str:
        if not os.path.exists(self.log_path):
            return "No failure analysis report found."

        with open(self.log_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        records = data.get("records", [])
        breakdown = data.get("breakdown", {})

        md = []
        md.append("# RAG Failure Analysis Report\n")
        md.append(f"**Total Failed Cases Analyzed**: {len(records)}\n")
        
        md.append("## Failure Classification Breakdown\n")
        for ftype, count in breakdown.items():
            pct = round((count / len(records)) * 100, 1) if records else 0
            md.append(f"- **{ftype}**: {count} ({pct}%)")
        md.append("\n---\n")

        md.append("## Failure Case Audit Logs\n")
        for idx, rec in enumerate(records, 1):
            md.append(f"### Case {idx}: {rec['question']}\n")
            md.append(f"- **Expected Source**: `{rec['expected_source']}`")
            md.append(f"- **Retrieved Source**: `{rec['retrieved_source']}`")
            md.append(f"- **Expected Answer**: {rec['expected_answer']}")
            md.append(f"- **Generated Answer**: {rec['generated_answer']}")
            md.append(f"- **Failure Type**: **{rec['failure_type']}**")
            if rec.get("notes"):
                md.append(f"- **Notes**: {rec['notes']}")
            md.append("")

        report_str = "\n".join(md)
        return report_str


if __name__ == "__main__":
    analyzer = FailureAnalyzer()
    
    # Sample failure case demonstrations across the 8 categories
    sample_cases = [
        {
            "question": "What is the enterprise refund period?",
            "expected_source": "refund-policy.pdf, page 12",
            "retrieved_source": "employee-handbook.pdf, page 8",
            "expected_answer": "Customers can request full refunds within 30 days of purchase.",
            "generated_answer": "Employees are entitled to 12 days of annual leave.",
            "failure_type": FailureType.RETRIEVAL_FAILURE,
            "notes": "Vector similarity returned HR handbook instead of financial refund policy."
        },
        {
            "question": "What is the SOC2 compliance audit timeline?",
            "expected_source": "security-compliance.pdf, page 4",
            "retrieved_source": "security-compliance.pdf, page 24",
            "expected_answer": "SOC2 Type II audits are conducted annually in Q3.",
            "generated_answer": "SOC2 controls cover data encryption at rest.",
            "failure_type": FailureType.RERANKING_FAILURE,
            "notes": "Page 4 was retrieved in top 10 but reranker pushed page 24 above it."
        },
        {
            "question": "What are the SLA uptime guarantees for Tier 1 databases?",
            "expected_source": "sla-agreements.pdf, page 3",
            "retrieved_source": "sla-agreements.pdf, page 3",
            "expected_answer": "Tier 1 databases carry a 99.99% monthly uptime SLA with 15-minute RTO.",
            "generated_answer": "Tier 1 databases carry a 99.99% monthly uptime SLA.",
            "failure_type": FailureType.CHUNKING_FAILURE,
            "notes": "RTO sentence was split into adjacent chunk index 4 and omitted from top-1 context."
        },
        {
            "question": "What is the reimbursement limit for team offsite dinners?",
            "expected_source": "travel-expense-policy.pdf, page 7",
            "retrieved_source": "catering-vendors.pdf, page 2",
            "expected_answer": "$75 per person for team offsite dinners.",
            "generated_answer": "Catering vendors provide buffet options.",
            "failure_type": FailureType.QUERY_REWRITING_FAILURE,
            "notes": "Query rewriter expanded 'offsite dinners' to 'catering vendor contracts'."
        },
        {
            "question": "How are customer PII encryption keys rotated?",
            "expected_source": "kms-key-rotation.pdf, page 5",
            "retrieved_source": "kms-key-rotation.pdf, page 5",
            "expected_answer": "Keys are rotated automatically every 90 days via AWS KMS.",
            "generated_answer": "Based on the enterprise documents: [Truncated due to context overflow]",
            "failure_type": FailureType.CONTEXT_CONSTRUCTION_FAILURE,
            "notes": "Excessive context chunks exceeded LLM max input token limit."
        },
        {
            "question": "What is the maximum allowed file size for attachment uploads?",
            "expected_source": "upload-limits.pdf, page 2",
            "retrieved_source": "upload-limits.pdf, page 2",
            "expected_answer": "The maximum attachment file size is 50 MB.",
            "generated_answer": "The maximum attachment file size is 100 MB.",
            "failure_type": FailureType.GENERATION_FAILURE,
            "notes": "Context clearly stated 50 MB, but LLM hallucinated 100 MB."
        },
        {
            "question": "What is the multi-factor authentication (MFA) grace period?",
            "expected_source": "iam-policy.pdf, page 3",
            "retrieved_source": "iam-policy.pdf, page 3",
            "expected_answer": "New users have a 7-day grace period to configure MFA.",
            "generated_answer": "New users have a 7-day grace period to configure MFA.",
            "failure_type": FailureType.CITATION_FAILURE,
            "notes": "Generated answer was accurate, but citation referenced employee-onboarding.pdf instead of iam-policy.pdf."
        },
        {
            "question": "What is the policy for international travel insurance?",
            "expected_source": "travel-insurance.pdf, page 1",
            "retrieved_source": "travel-insurance.pdf, page 1",
            "expected_answer": "International business travel requires prior registration with SOS International.",
            "generated_answer": "I do not have enough relevant document information to answer this question.",
            "failure_type": FailureType.NO_ANSWER_DETECTION_FAILURE,
            "notes": "LLM prematurely triggered no-answer fallback despite relevant context being present."
        }
    ]

    for case in sample_cases:
        analyzer.log_failure(
            question=case["question"],
            expected_source=case["expected_source"],
            retrieved_source=case["retrieved_source"],
            expected_answer=case["expected_answer"],
            generated_answer=case["generated_answer"],
            failure_type=case["failure_type"],
            notes=case["notes"]
        )

    print(analyzer.print_markdown_report())
