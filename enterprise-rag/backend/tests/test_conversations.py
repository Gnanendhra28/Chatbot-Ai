from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.db import get_db
from app.domain.models import Conversation, utc_now

async def mock_get_db():
    db = AsyncMock()
    now = utc_now()
    fake_conv = Conversation(
        id="conv-12345",
        title="Test Session",
        tenant_id="default-tenant-id",
        user_id="default-user-id",
        created_at=now,
        updated_at=now,
        messages=[]
    )

    async def mock_refresh(obj):
        obj.id = "conv-12345"
        obj.title = getattr(obj, "title", "Test Session")
        obj.messages = []
    db.refresh.side_effect = mock_refresh

    def mock_execute(stmt):
        m = MagicMock()
        m.all.return_value = [fake_conv]
        m.scalar_one_or_none.return_value = fake_conv
        stmt_str = str(stmt).lower()
        if "messages" in stmt_str:
            m.scalars.return_value.all.return_value = []
        else:
            m.scalars.return_value.all.return_value = [fake_conv]
        return m

    db.execute.side_effect = mock_execute
    yield db

import pytest

@pytest.fixture(autouse=True)
def override_db_dependency():
    app.dependency_overrides[get_db] = mock_get_db
    yield
    app.dependency_overrides.clear()

client = TestClient(app)


def test_conversation_lifecycle():
    # 1. Create Conversation
    create_res = client.post("/api/v1/conversations", json={"title": "Test Session"})
    assert create_res.status_code == 201
    conv_data = create_res.json()
    assert "id" in conv_data
    conv_id = conv_data["id"]

    # 2. List Conversations
    list_res = client.get("/api/v1/conversations")
    assert list_res.status_code == 200
    conversations = list_res.json()
    assert isinstance(conversations, list)

    # 3. Get Conversation Details
    detail_res = client.get(f"/api/v1/conversations/{conv_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert "id" in detail_data
    assert "messages" in detail_data
