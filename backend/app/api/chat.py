import json
import uuid
import asyncio
import logging
from typing import List, Dict, Any, AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.db import get_db
from app.core.config import settings
from app.core.security import get_current_user_principal, UserPrincipal, PromptInjectionSanitizer
from app.domain.models import Conversation, Message
from app.domain.schemas import (
    ChatQuestionRequest,
    ChatQuestionResponse,
    ChatRequest,
    ChatResponse,
    ChunkCitation,
)
from app.retrieval.vector_search import search_relevant_chunks
from app.generation.llm_client import generate_rag_answer

logger = logging.getLogger("enterprise_rag.api.chat")

router = APIRouter(tags=["chat"])


async def stream_rag_tokens(
    question_text: str,
    top_chunks: List[Dict[str, Any]],
    sources: List[ChunkCitation]
) -> AsyncGenerator[str, None]:
    """
    Async SSE Generator streaming initial citations JSON followed by word-by-word LLM token stream.
    """
    try:
        # Event 1: Initial Citations Event
        citations_data = [s.model_dump() for s in sources]
        yield f"data: {json.dumps({'citations': citations_data})}\n\n"
        await asyncio.sleep(0.01)

        # Event 2: Stream Token Response
        full_answer = await generate_rag_answer(question_text, top_chunks)
        words = full_answer.split(" ")

        for idx, word in enumerate(words):
            token_str = word + (" " if idx < len(words) - 1 else "")
            chunk_event = {"token": token_str}
            yield f"data: {json.dumps(chunk_event)}\n\n"
            await asyncio.sleep(0.02)  # Simulate real-time LLM token generation stream

        # Event 3: Done Signal
        yield "data: [DONE]\n\n"
    except Exception as e:
        logger.error(f"Error in SSE stream generation: {e}")
        yield f"data: {json.dumps({'error': 'Stream generation interrupted'})}\n\n"
        yield "data: [DONE]\n\n"


@router.post("/chat/stream")
async def chat_stream_endpoint(
    payload: ChatQuestionRequest,
    principal: UserPrincipal = Depends(get_current_user_principal),
    db: AsyncSession = Depends(get_db)
):
    """
    Phase 21 — Server-Sent Events (SSE) Streaming Endpoint:
    POST /api/v1/chat/stream
    Streams tokens in real-time between FastAPI and Next.js.
    """
    raw_question = payload.question.strip() if payload.question else ""
    if not raw_question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question is required."
        )

    # Prompt Injection Sanitization
    question_text = PromptInjectionSanitizer.sanitize_text(raw_question)

    logger.info(f"[Audit Log] User '{principal.user_id}' (Tenant: '{principal.tenant_id}') initiated chat stream query.")

    try:
        top_chunks = await search_relevant_chunks(
            db=db,
            target=principal,
            query=question_text,
            top_k=5
        )

        sources: List[ChunkCitation] = []
        for idx, c in enumerate(top_chunks):
            sources.append(
                ChunkCitation(
                    citation_index=idx + 1,
                    document_id=c["document_id"],
                    chunk_id=c["chunk_id"],
                    filename=c["filename"],
                    page_number=c["page_number"],
                    section=c.get("section"),
                    text_snippet=c["text"][:200],
                    score=c["score"]
                )
            )

        return StreamingResponse(
            stream_rag_tokens(question_text, top_chunks, sources),
            media_type="text/event-stream"
        )
    except Exception as e:
        logger.error(f"Error executing chat stream search for user '{principal.user_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat stream query."
        )


@router.post("/chat", response_model=ChatQuestionResponse)
async def simple_rag_chat(
    payload: ChatQuestionRequest,
    principal: UserPrincipal = Depends(get_current_user_principal),
    db: AsyncSession = Depends(get_db)
):
    raw_question = payload.question.strip() if payload.question else ""
    if not raw_question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty."
        )

    question_text = PromptInjectionSanitizer.sanitize_text(raw_question)

    logger.info(f"[Audit Log] User '{principal.user_id}' (Tenant: '{principal.tenant_id}') asked simple RAG question.")

    try:
        top_chunks = await search_relevant_chunks(
            db=db,
            target=principal,
            query=question_text,
            top_k=5
        )

        sources: List[ChunkCitation] = []
        footer_lines: List[str] = []

        for idx, c in enumerate(top_chunks):
            cit_idx = idx + 1
            citation = ChunkCitation(
                citation_index=cit_idx,
                document_id=c["document_id"],
                chunk_id=c["chunk_id"],
                filename=c["filename"],
                page_number=c["page_number"],
                section=c.get("section"),
                text_snippet=c["text"][:200],
                score=c["score"]
            )
            sources.append(citation)
            footer_lines.append(f"[{cit_idx}] {c['filename']} — Page {c['page_number']}")

        raw_answer = await generate_rag_answer(question_text, top_chunks)
        if sources and "Sources:" not in raw_answer:
            formatted_answer = f"{raw_answer}\n\nSources:\n" + "\n".join(footer_lines)
        else:
            formatted_answer = raw_answer

        return ChatQuestionResponse(
            answer=formatted_answer,
            sources=sources
        )
    except Exception as e:
        logger.error(f"Error executing RAG chat for user '{principal.user_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process RAG chat query."
        )


@router.post("/chat/completions", response_model=ChatResponse)
async def chat_completion(
    payload: ChatRequest,
    principal: UserPrincipal = Depends(get_current_user_principal),
    db: AsyncSession = Depends(get_db)
):
    raw_query = payload.question or payload.message or ""
    if not raw_query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message or question is required."
        )

    query_text = PromptInjectionSanitizer.sanitize_text(raw_query.strip())

    try:
        request_id = f"req_{uuid.uuid4().hex[:12]}"
        logger.info(f"[request_id: {request_id}] Starting RAG completion for user '{principal.user_id}', tenant '{principal.tenant_id}'")

        conversation_id = payload.conversation_id
        if conversation_id:
            result = await db.execute(
                select(Conversation).where(
                    Conversation.id == conversation_id,
                    Conversation.tenant_id == principal.tenant_id
                )
            )
            conv = result.scalar_one_or_none()
            if not conv:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found."
                )
        else:
            from app.core.db import ensure_user_exists
            await ensure_user_exists(db, principal.user_id)
            conv = Conversation(
                tenant_id=principal.tenant_id,
                user_id=principal.user_id,
                title=query_text[:30]
            )
            db.add(conv)
            await db.commit()
            await db.refresh(conv)
            conversation_id = conv.id

        user_msg = Message(
            conversation_id=conversation_id,
            role="user",
            content=query_text
        )
        db.add(user_msg)

        citations: List[ChunkCitation] = []
        context_chunks: List[Dict[str, Any]] = []
        footer_lines: List[str] = []

        if payload.rag_enabled:
            context_chunks = await search_relevant_chunks(
                db=db,
                target=principal,
                query=query_text,
                top_k=payload.top_k or 5
            )
            for idx, c in enumerate(context_chunks):
                cit_idx = idx + 1
                citations.append(ChunkCitation(
                    citation_index=cit_idx,
                    document_id=c["document_id"],
                    chunk_id=c["chunk_id"],
                    filename=c["filename"],
                    page_number=c["page_number"],
                    section=c.get("section"),
                    text_snippet=c["text"][:200],
                    score=c["score"]
                ))
                footer_lines.append(f"[{cit_idx}] {c['filename']} — Page {c['page_number']}")

        raw_answer = await generate_rag_answer(query_text, context_chunks, model_name=payload.model)
        if citations and "Sources:" not in raw_answer:
            formatted_answer = f"{raw_answer}\n\nSources:\n" + "\n".join(footer_lines)
        else:
            formatted_answer = raw_answer

        ai_msg = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=formatted_answer,
            sources=[c.model_dump() for c in citations] if citations else None
        )
        db.add(ai_msg)

        from app.domain.models import RetrievalLog
        import uuid as uuid_mod
        retrieval_log = RetrievalLog(
            id=str(uuid_mod.uuid4()),
            request_id=request_id,
            user_id=principal.user_id,
            tenant_id=principal.tenant_id,
            query=query_text,
            retrieved_chunks=[{k: v for k, v in c.items() if k != 'embedding'} for c in context_chunks],
            model=payload.model or settings.LLM_MODEL,
            answer=formatted_answer,
            citations=[c.model_dump() for c in citations] if citations else None
        )
        db.add(retrieval_log)

        await db.commit()

        logger.info(f"[request_id: {request_id}] Completed RAG completion & saved retrieval_log entry for user '{principal.user_id}'")

        return ChatResponse(
            conversation_id=conversation_id,
            answer=formatted_answer,
            message=formatted_answer,
            citations=citations,
            sources=citations
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat completions for user '{principal.user_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate completion."
        )
