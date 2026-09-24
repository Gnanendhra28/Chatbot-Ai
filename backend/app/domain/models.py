import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.core.db import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    documents: Mapped[List["Document"]] = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), index=True, nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), default="application/pdf")
    document_type: Mapped[str] = mapped_column(String(100), default="pdf", index=True)
    department: Mapped[str] = mapped_column(String(100), default="General", index=True)
    access_level: Mapped[str] = mapped_column(String(50), default="internal", index=True)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="UPLOADED")
    version: Mapped[int] = mapped_column(Integer, default=1, index=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user: Mapped["User"] = relationship("User", back_populates="documents")
    chunks: Mapped[List["DocumentChunk"]] = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("documents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    tenant_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    document_type: Mapped[str] = mapped_column(String(100), default="pdf", index=True)
    department: Mapped[str] = mapped_column(String(100), default="General", index=True)
    access_level: Mapped[str] = mapped_column(String(50), default="internal", index=True)
    version: Mapped[int] = mapped_column(Integer, default=1, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding = mapped_column(Vector(384), nullable=True)
    page_number: Mapped[int] = mapped_column(Integer, default=1)
    section: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    chunk_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    document: Mapped["Document"] = relationship("Document", back_populates="chunks")


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="New Conversation")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user: Mapped["User"] = relationship("User", back_populates="conversations")
    messages: Mapped[List["Message"]] = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sources: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")


class RetrievalLog(Base):
    """
    Phase 20 Observability Log Table:
    Tracks request_id, user_id, tenant_id, query, retrieved_chunks, scores,
    reranker_scores, model, token_usage, latency, answer, and citations.
    """
    __tablename__ = "retrieval_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    query: Mapped[str] = mapped_column(Text, nullable=False)
    retrieved_chunks: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    scores: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    reranker_scores: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    model: Mapped[str] = mapped_column(String(100), default="gpt-4o-mini")
    token_usage: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    latency: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
