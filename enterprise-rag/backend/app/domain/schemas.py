from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime


class DocumentBase(BaseModel):
    filename: str
    file_type: str = "application/pdf"
    document_type: str = "pdf"
    department: str = "General"
    access_level: str = "internal"
    storage_path: Optional[str] = None
    version: int = 1


class UploadResponse(BaseModel):
    document_id: str
    status: str


class DocumentResponse(DocumentBase):
    id: str
    tenant_id: str
    user_id: str
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MetadataFilter(BaseModel):
    tenant_id: Optional[str] = None
    document_id: Optional[str] = None
    document_type: Optional[str] = None
    department: Optional[str] = None
    access_level: Optional[str] = None
    version: Optional[int] = None


class ChunkCitation(BaseModel):
    citation_index: int = 1
    document_id: str
    chunk_id: str
    filename: str
    page_number: int
    section: Optional[str] = None
    text_snippet: str
    score: float


class ChatQuestionRequest(BaseModel):
    question: str = Field(..., min_length=1)
    filters: Optional[MetadataFilter] = None


class ChatQuestionResponse(BaseModel):
    answer: str
    sources: List[ChunkCitation] = []


class ChatRequest(BaseModel):
    message: Optional[str] = None
    question: Optional[str] = None
    conversation_id: Optional[str] = None
    model: Optional[str] = None
    rag_enabled: bool = True
    top_k: int = 5
    filters: Optional[MetadataFilter] = None


class ChatResponse(BaseModel):
    conversation_id: Optional[str] = None
    answer: Optional[str] = None
    message: Optional[str] = None
    citations: List[ChunkCitation] = []
    sources: List[ChunkCitation] = []


class CreateConversationRequest(BaseModel):
    title: Optional[str] = None


class ConversationResponse(BaseModel):
    id: str
    tenant_id: str
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    sources: Optional[Any] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationDetailResponse(ConversationResponse):
    messages: List[MessageResponse] = []


class PostMessageRequest(BaseModel):
    content: str = Field(..., min_length=1)
    filters: Optional[MetadataFilter] = None


class PostMessageResponse(BaseModel):
    user_message: MessageResponse
    assistant_message: MessageResponse
