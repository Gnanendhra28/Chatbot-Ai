import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.db import get_db
from app.core.security import get_current_user_principal, UserPrincipal, PromptInjectionSanitizer
from app.domain.models import Conversation, Message, utc_now
from app.domain.schemas import (
    CreateConversationRequest,
    ConversationResponse,
    ConversationDetailResponse,
    MessageResponse,
    PostMessageRequest,
    PostMessageResponse,
    ChunkCitation,
)
from app.retrieval.vector_search import search_relevant_chunks
from app.retrieval.query_rewriter import QueryRewriter
from app.generation.llm_client import generate_rag_answer

logger = logging.getLogger("enterprise_rag.api.conversations")

router = APIRouter(prefix="/conversations", tags=["conversations"])
query_rewriter = QueryRewriter()


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: Optional[CreateConversationRequest] = None,
    principal: UserPrincipal = Depends(get_current_user_principal),
    db: AsyncSession = Depends(get_db)
):
    try:
        from app.core.db import ensure_user_exists
        await ensure_user_exists(db, principal.user_id)

        raw_title = (payload.title if payload and payload.title else "New Conversation").strip()
        title = PromptInjectionSanitizer.sanitize_text(raw_title)

        conv = Conversation(
            id=str(uuid.uuid4()),
            tenant_id=principal.tenant_id,
            user_id=principal.user_id,
            title=title,
            created_at=utc_now(),
            updated_at=utc_now()
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)

        logger.info(f"[Audit Log] Created conversation: ID={conv.id}, user='{principal.user_id}', tenant='{principal.tenant_id}'")
        return conv
    except Exception as e:
        logger.error(f"Error creating conversation for user '{principal.user_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation session."
        )


@router.get("", response_model=List[ConversationResponse])
async def list_conversations(
    principal: UserPrincipal = Depends(get_current_user_principal),
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(
            select(Conversation)
            .where(Conversation.tenant_id == principal.tenant_id)
            .order_by(Conversation.updated_at.desc())
        )
        conversations = result.scalars().all()
        logger.info(f"[Audit Log] Listed {len(conversations)} conversations for tenant '{principal.tenant_id}' (user: '{principal.user_id}')")
        return conversations
    except Exception as e:
        logger.error(f"Error fetching conversations list for tenant '{principal.tenant_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversations."
        )


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation_detail(
    conversation_id: str,
    principal: UserPrincipal = Depends(get_current_user_principal),
    db: AsyncSession = Depends(get_db)
):
    try:
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
                detail=f"Conversation '{conversation_id}' not found."
            )

        msg_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        messages = msg_result.scalars().all()

        logger.info(f"[Audit Log] Retrieved conversation detail: ID={conversation_id}, user='{principal.user_id}'")
        return ConversationDetailResponse(
            id=conv.id,
            tenant_id=conv.tenant_id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            messages=[MessageResponse.model_validate(m) for m in messages]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching conversation detail for '{conversation_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query conversation detail."
        )


@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    conversation_id: str,
    principal: UserPrincipal = Depends(get_current_user_principal),
    db: AsyncSession = Depends(get_db)
):
    try:
        conv_result = await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == principal.tenant_id
            )
        )
        conv = conv_result.scalar_one_or_none()
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation '{conversation_id}' not found."
            )

        msg_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        messages = msg_result.scalars().all()
        logger.info(f"[Audit Log] Retrieved {len(messages)} messages for conversation '{conversation_id}'")
        return [MessageResponse.model_validate(m) for m in messages]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching messages for conversation '{conversation_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query conversation messages."
        )


@router.post("/{conversation_id}/messages", response_model=PostMessageResponse)
async def post_message_to_conversation(
    conversation_id: str,
    payload: PostMessageRequest,
    principal: UserPrincipal = Depends(get_current_user_principal),
    db: AsyncSession = Depends(get_db)
):
    raw_content = payload.content.strip() if payload.content else ""
    if not raw_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty."
        )

    clean_content = PromptInjectionSanitizer.sanitize_text(raw_content)

    try:
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
                detail=f"Conversation '{conversation_id}' not found."
            )

        past_msg_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        past_messages = past_msg_result.scalars().all()
        history = [{"role": m.role, "content": m.content} for m in past_messages]

        user_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role="user",
            content=clean_content
        )
        db.add(user_msg)
        await db.flush()

        standalone_query = await query_rewriter.rewrite_query(clean_content, history)

        top_chunks = await search_relevant_chunks(
            db=db,
            target=principal,
            query=standalone_query,
            top_k=5
        )

        citations: List[ChunkCitation] = []
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
            citations.append(citation)
            footer_lines.append(f"[{cit_idx}] {c['filename']} — Page {c['page_number']}")

        raw_answer = await generate_rag_answer(clean_content, top_chunks)
        if citations and "Sources:" not in raw_answer:
            formatted_answer = f"{raw_answer}\n\nSources:\n" + "\n".join(footer_lines)
        else:
            formatted_answer = raw_answer

        ai_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role="assistant",
            content=formatted_answer,
            sources=[c.model_dump() for c in citations] if citations else None
        )
        db.add(ai_msg)

        if conv.title == "New Conversation":
            conv.title = clean_content[:30]
        conv.updated_at = utc_now()
        await db.commit()
        await db.refresh(user_msg)
        await db.refresh(ai_msg)

        logger.info(f"[Audit Log] Posted message to conversation '{conversation_id}' by user '{principal.user_id}'")

        return PostMessageResponse(
            user_message=MessageResponse.model_validate(user_msg),
            assistant_message=MessageResponse.model_validate(ai_msg)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error posting message to conversation '{conversation_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process message."
        )


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    principal: UserPrincipal = Depends(get_current_user_principal),
    db: AsyncSession = Depends(get_db)
):
    try:
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
                detail=f"Conversation '{conversation_id}' not found."
            )

        # RBAC Check: admin/manager or owner can delete
        if principal.role not in ["admin", "manager"] and conv.user_id != principal.user_id:
            logger.warning(f"[Security Audit] Unauthorized conversation deletion attempt on '{conversation_id}' by user '{principal.user_id}'")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Cannot delete conversation belonging to another user."
            )

        # Delete associated messages first
        msg_result = await db.execute(
            select(Message).where(Message.conversation_id == conversation_id)
        )
        messages = msg_result.scalars().all()
        for msg in messages:
            await db.delete(msg)

        await db.delete(conv)
        await db.commit()

        logger.info(f"[Audit Log] Deleted conversation '{conversation_id}' and messages by user '{principal.user_id}'")
        return {"success": True, "deleted_id": conversation_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation '{conversation_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete conversation."
        )
