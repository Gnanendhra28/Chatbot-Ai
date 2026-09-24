import os
import uuid
import logging
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.db import get_db
from app.core.security import get_current_user_principal, UserPrincipal, sanitize_filename
from app.core.config import settings
from app.domain.models import Document
from app.domain.schemas import DocumentResponse, UploadResponse
from app.worker.tasks import run_background_ingestion

logger = logging.getLogger("enterprise_rag.api.documents")

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".md", ".txt"}
FORBIDDEN_EXTENSIONS = {".exe", ".sh", ".bat", ".elf", ".py", ".js", ".bin", ".dll", ".so", ".dmg"}
ALLOWED_ROLES_UPLOAD = {"admin", "manager", "employee"}
ALLOWED_ROLES_DELETE = {"admin", "manager"}


@router.post("", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    principal: UserPrincipal = Depends(get_current_user_principal),
    db: AsyncSession = Depends(get_db)
):
    # RBAC Authorization Check
    if principal.role not in ALLOWED_ROLES_UPLOAD:
        logger.warning(f"[Security Audit] Unauthorized upload attempt by user '{principal.user_id}' with role '{principal.role}'")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Role '{principal.role}' is not authorized to upload documents."
        )

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename."
        )

    safe_filename = sanitize_filename(file.filename)
    _, ext = os.path.splitext(safe_filename.lower())

    if ext in FORBIDDEN_EXTENSIONS:
        logger.warning(f"[Security Audit] Blocked forbidden file upload extension '{ext}' by user '{principal.user_id}'")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security Violation: Executable file type '{ext}' is strictly prohibited."
        )

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: PDF, DOCX, MD, TXT."
        )

    try:
        content = await file.read()
    except Exception as e:
        logger.error(f"Failed to read upload stream: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded file stream."
        )

    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the maximum 25 MB limit."
        )

    os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)
    file_path = os.path.join(settings.LOCAL_STORAGE_DIR, safe_filename)
    try:
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        logger.error(f"Failed to save uploaded file to disk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal storage write failure."
        )

    storage_path = file_path
    if settings.use_gcs and settings.GCS_BUCKET_NAME:
        try:
            from app.infrastructure.gcs_storage import GCSStorageService
            gcs_service = GCSStorageService()
            blob_name = f"{principal.tenant_id}/{safe_filename}"
            storage_path = gcs_service.upload_bytes(blob_name, content)
            logger.info(f"[GCS] Stored original file in GCS: {storage_path}")
        except Exception as e:
            logger.error(f"[GCS] GCS storage upload failed: {e}")

    from app.core.db import ensure_user_exists
    await ensure_user_exists(db, principal.user_id)

    doc = Document(
        id=str(uuid.uuid4()),
        tenant_id=principal.tenant_id,
        user_id=principal.user_id,
        filename=safe_filename,
        file_type=file.content_type or "application/pdf",
        storage_path=storage_path,
        status="UPLOADED",
        version=1
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    logger.info(
        f"[Audit Log] Document uploaded successfully: ID={doc.id}, file='{safe_filename}', "
        f"user='{principal.user_id}', tenant='{principal.tenant_id}', role='{principal.role}'"
    )

    background_tasks.add_task(run_background_ingestion, doc.id, file_path, principal.user_id)

    return UploadResponse(
        document_id=doc.id,
        status="UPLOADED"
    )


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    principal: UserPrincipal = Depends(get_current_user_principal),
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(
            select(Document)
            .where(Document.tenant_id == principal.tenant_id)
            .order_by(Document.created_at.desc())
        )
        docs = result.scalars().all()
        logger.info(f"[Audit Log] Listed {len(docs)} documents for tenant '{principal.tenant_id}' (user: '{principal.user_id}')")
        return docs
    except Exception as e:
        logger.error(f"Error listing documents for tenant '{principal.tenant_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document registry."
        )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document_detail(
    document_id: str,
    principal: UserPrincipal = Depends(get_current_user_principal),
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(
            select(Document).where(Document.id == document_id, Document.tenant_id == principal.tenant_id)
        )
        doc = result.scalar_one_or_none()
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document '{document_id}' not found."
            )

        logger.info(f"[Audit Log] Retrieved document detail: ID={document_id}, user='{principal.user_id}', tenant='{principal.tenant_id}'")
        return doc
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document detail for '{document_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query document detail."
        )


@router.get("/{document_id}/status")
async def get_document_status(
    document_id: str,
    principal: UserPrincipal = Depends(get_current_user_principal),
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(
            select(Document).where(Document.id == document_id, Document.tenant_id == principal.tenant_id)
        )
        doc = result.scalar_one_or_none()
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document '{document_id}' not found."
            )

        logger.info(f"[Audit Log] Checked document status: ID={document_id}, status='{doc.status}'")
        return {
            "document_id": doc.id,
            "status": doc.status,
            "error_message": doc.error_message
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document status for '{document_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query document status."
        )


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    principal: UserPrincipal = Depends(get_current_user_principal),
    db: AsyncSession = Depends(get_db)
):
    # RBAC Authorization Check
    if principal.role not in ALLOWED_ROLES_DELETE:
        logger.warning(
            f"[Security Audit] Unauthorized delete attempt on document '{document_id}' "
            f"by user '{principal.user_id}' with role '{principal.role}'"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Role '{principal.role}' does not have delete privileges."
        )

    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.tenant_id == principal.tenant_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found."
        )

    # Clean up local file if stored
    if doc.storage_path and os.path.exists(doc.storage_path):
        try:
            os.remove(doc.storage_path)
        except Exception as file_err:
            logger.warning(f"Could not remove local file '{doc.storage_path}': {file_err}")

    await db.delete(doc)
    await db.commit()

    logger.info(
        f"[Audit Log] Document deleted: ID={document_id}, user='{principal.user_id}', "
        f"tenant='{principal.tenant_id}', role='{principal.role}'"
    )
    return {"success": True, "deleted_id": document_id}
