from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings
from app.generation.prompt_builder import PromptBuilder


async def generate_rag_answer(
    message: str,
    context_chunks: List[Dict[str, Any]],
    model_name: Optional[str] = None,
    prompt_builder: Optional[PromptBuilder] = None
) -> str:
    """
    Multi-LLM RAG Generation Client supporting Groq, Google Gemini, and OpenAI.
    """
    builder = prompt_builder or PromptBuilder()
    messages = builder.build_chat_messages(message, context_chunks)
    
    target_model = model_name or settings.LLM_MODEL
    target_model_lower = target_model.lower()

    # Route based on selected model
    if "gemini" in target_model_lower:
        api_key = settings.GEMINI_API_KEY or settings.LLM_API_KEY
        
        # Build candidate Gemini models
        candidate_models = []
        if "flash-lite" in target_model_lower:
            candidate_models = ["gemini-3.5-flash-lite", "gemini-3.5-flash"]
        elif "flash" in target_model_lower or "gemini" in target_model_lower:
            candidate_models = ["gemini-3.5-flash", "gemini-3.5-flash-lite"]
        else:
            candidate_models = ["gemini-3.5-flash", "gemini-3.5-flash-lite"]

        if api_key and api_key != "your_llm_api_key_here":
            for gemini_model in candidate_models:
                try:
                    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={api_key}"
                    system_text = messages[0]["content"] if messages and messages[0]["role"] == "system" else ""
                    user_text = messages[-1]["content"] if messages else message
                    combined_prompt = f"{system_text}\n\nUser Question:\n{user_text}"

                    payload = {
                        "contents": [{
                            "parts": [{"text": combined_prompt}]
                        }],
                        "generationConfig": {
                            "temperature": 0.2,
                            "maxOutputTokens": 1024
                        }
                    }

                    async with httpx.AsyncClient(timeout=35.0) as client:
                        response = await client.post(gemini_url, json=payload)
                        if response.status_code == 200:
                            data = response.json()
                            candidates = data.get("candidates", [])
                            if candidates:
                                parts = candidates[0].get("content", {}).get("parts", [])
                                if parts:
                                    return parts[0].get("text", "")
                        else:
                            print(f"[Gemini API Error] Model '{gemini_model}' Status {response.status_code}: {response.text}")
                except Exception as e:
                    print(f"[Gemini Client Error] Model '{gemini_model}': {e}")

    elif "llama" in target_model_lower or "groq" in target_model_lower or "qwen" in target_model_lower or "mixtral" in target_model_lower or "gpt-oss" in target_model_lower or settings.LLM_PROVIDER == "groq":
        url = "https://api.groq.com/openai/v1/chat/completions"
        api_key = settings.GROQ_API_KEY or settings.LLM_API_KEY
        
        # Build candidate Groq models
        candidate_models = []
        if "120b" in target_model_lower:
            candidate_models = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]
        elif "/" in target_model:
            candidate_models = [target_model, "qwen/qwen3.8-27b", "openai/gpt-oss-120b"]
        else:
            candidate_models = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]

        if api_key and api_key != "your_llm_api_key_here":
            for resolved_model in candidate_models:
                try:
                    async with httpx.AsyncClient(timeout=35.0) as client:
                        response = await client.post(
                            url,
                            headers={"Authorization": f"Bearer {api_key}"},
                            json={
                                "model": resolved_model,
                                "messages": messages,
                                "temperature": 0.2,
                                "max_tokens": 1024
                            }
                        )
                        if response.status_code == 200:
                            data = response.json()
                            return data["choices"][0]["message"]["content"]
                        else:
                            print(f"[Groq API Error] Model '{resolved_model}' Status {response.status_code}: {response.text}")
                except Exception as e:
                    print(f"[Groq Client Error] Model '{resolved_model}': {e}")

    else:
        url = "https://api.openai.com/v1/chat/completions"
        api_key = settings.LLM_API_KEY
        resolved_model = target_model if "gpt" in target_model_lower else "gpt-4o-mini"
        if api_key and api_key != "your_llm_api_key_here":
            try:
                async with httpx.AsyncClient(timeout=35.0) as client:
                    response = await client.post(
                        url,
                        headers={"Authorization": f"Bearer {api_key}"},
                        json={
                            "model": resolved_model,
                            "messages": messages,
                            "temperature": 0.2,
                            "max_tokens": 1024
                        }
                    )
                    if response.status_code == 200:
                        data = response.json()
                        return data["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"[OpenAI Client Error] {e}")

    # Fallback response generator when context is present but LLM API key fails or is unconfigured
    if not context_chunks:
        return "I do not have enough relevant document information to answer this question. Please upload PDF/Markdown files to the Knowledge Base."

    sources_summary = ", ".join(f"{c['filename']} (Page {c['page_number']})" for c in context_chunks)
    return (
        f"Based on your enterprise documents ({sources_summary}):\n\n"
        f"Regarding your query '{message}', the system retrieved matching document chunks via pgvector. "
        f"To enable full LLM generative text synthesis, please verify your GROQ_API_KEY or GEMINI_API_KEY in your backend .env file.\n\n"
        f"[Grounding Sources: {sources_summary}]"
    )
