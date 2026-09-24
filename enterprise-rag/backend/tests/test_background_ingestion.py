import io
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.db import get_db
from app.domain.models import Document, utc_now
from app.ingestion.pipeline import IngestionPipeline

fake_doc = Document(
    id="doc-test-123",
    tenant_id="default-user-id",
    user_id="default-user-id",
    filename="sample.txt",
    storage_path="/tmp/sample.txt",
    status="UPLOADED",
    created_at=utc_now(),
    updated_at=utc_now()
)

async def mock_get_db():
    db = AsyncMock()
    async def mock_refresh(obj):
        obj.id = "doc-test-123"
        obj.status = getattr(obj, "status", "UPLOADED")
    db.refresh.side_effect = mock_refresh

    def mock_execute(stmt):
        m = MagicMock()
        m.all.return_value = [fake_doc]
        m.scalars.return_value.all.return_value = [fake_doc]
        m.scalar_one_or_none.return_value = fake_doc
        return m

    db.execute.side_effect = mock_execute
    yield db


@pytest.fixture(autouse=True)
def override_db_dependency():
    app.dependency_overrides[get_db] = mock_get_db
    yield
    app.dependency_overrides.clear()


client = TestClient(app)


def test_upload_returns_uploaded_status_immediately():
    file_bytes = b"Background ingestion test content"
    response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("policy.txt", io.BytesIO(file_bytes), "text/plain")}
    )
    assert response.status_code == 201
    data = response.json()
    assert "document_id" in data
    assert data["status"] == "UPLOADED"


def test_get_document_status_endpoint():
    response = client.get("/api/v1/documents/doc-test-123/status")
    assert response.status_code == 200
    data = response.json()
    assert data["document_id"] == "doc-test-123"
    assert "status" in data
    assert "error_message" in data


@pytest.mark.asyncio
async def test_pipeline_status_transitions():
    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = fake_doc
    db.execute.return_value = mock_result

    pipeline = IngestionPipeline()
    await pipeline.update_status(db, "doc-test-123", "PROCESSING")
    assert fake_doc.status == "PROCESSING"

    await pipeline.update_status(db, "doc-test-123", "EMBEDDING")
    assert fake_doc.status == "EMBEDDING"

    await pipeline.update_status(db, "doc-test-123", "COMPLETED")
    assert fake_doc.status == "COMPLETED"

    await pipeline.update_status(db, "doc-test-123", "FAILED", error_message="Parsing error")
    assert fake_doc.status == "FAILED"
    assert fake_doc.error_message == "Parsing error"
