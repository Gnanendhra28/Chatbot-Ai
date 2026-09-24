import logging
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("enterprise_rag.query_rewriter")

REWRITE_SYSTEM_PROMPT = (
    "You are an expert query reformulation assistant.\n"
    "Given the conversation history and a follow-up user question, "
    "rewrite the follow-up question into a single, complete, standalone search query "
    "that contains all necessary context without referring to previous turns.\n"
    "Do NOT answer the question. Only return the rewritten standalone search query text."
)


class QueryRewriter:
    """
    QueryRewriter Component:
    Converts ambiguous follow-up questions containing pronouns or implicit context
    into standalone search queries before hybrid retrieval.
    """

    async def rewrite_query(
        self,
        query: str,
        conversation_history: List[Dict[str, str]]
    ) -> str:
        """
        Rewrites a user follow-up query into a standalone query.
        """
        cleaned_query = query.strip()
        if not conversation_history or len(cleaned_query) > 100:
            return cleaned_query

        # If LLM API Key is configured, perform LLM-assisted query rewriting
        if settings.LLM_API_KEY:
            try:
                history_text = "\n".join([
                    f"{m.get('role', 'user').capitalize()}: {m.get('content', '')}"
                    for m in conversation_history[-6:]
                ])

                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {settings.LLM_API_KEY}"},
                        json={
                            "model": settings.LLM_MODEL,
                            "messages": [
                                {"role": "system", "content": REWRITE_SYSTEM_PROMPT},
                                {
                                    "role": "user",
                                    "content": f"CONVERSATION HISTORY:\n{history_text}\n\nFOLLOW-UP QUESTION:\n{cleaned_query}"
                                }
                            ],
                            "temperature": 0.0
                        }
                    )
                    if response.status_code == 200:
                        data = response.json()
                        rewritten = data["choices"][0]["message"]["content"].strip()
                        if rewritten and len(rewritten) > 3:
                            logger.info(f"Query rewritten: '{cleaned_query}' ──► '{rewritten}'")
                            return rewritten
            except Exception as e:
                logger.warning(f"LLM Query Rewriting failed ({e}). Falling back to heuristic context resolution.")

        # Heuristic fallback query resolution
        return self._heuristic_rewrite(cleaned_query, conversation_history)

    def _heuristic_rewrite(self, query: str, history: List[Dict[str, str]]) -> str:
        """
        Heuristic fallback when LLM API is unavailable.
        Resolves common pronouns ('ones', 'them', 'it', 'these') using preceding user questions.
        """
        query_lower = query.lower()
        pronouns = ["ones", "them", "it", "this", "these", "those", "same"]
        tokens = [w.strip("?.!,") for w in query_lower.split()]

        if any(p in tokens for p in pronouns) and history:
            # Find last user question
            last_user_query = ""
            for msg in reversed(history):
                if msg.get("role") == "user":
                    last_user_query = msg.get("content", "")
                    break

            if last_user_query:
                # Strip leading question words from last query
                clean_prev = last_user_query.lower()
                for prefix in ["what is the ", "what is ", "tell me about ", "explain "]:
                    if clean_prev.startswith(prefix):
                        clean_prev = clean_prev[len(prefix):]

                # Synthesize standalone query
                if "what about " in query_lower:
                    topic = query_lower.replace("what about ", "").replace(" ones", "").strip(" ?.")
                    return f"What is the {clean_prev.strip('?.')} for {topic}?"

                return f"{query} regarding {last_user_query}"

        return query
