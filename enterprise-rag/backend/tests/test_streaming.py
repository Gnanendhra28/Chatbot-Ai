from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.db import get_db

async def mock_get_db():
    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.all.return_value = []
    mock_result.scalars.return_value.all.return_value = []
    mock_result.scalar_one_or_none.return_value = None
    db.execute.return_value = mock_result
    yield db

import pytest

@pytest.fixture(autouse=True)
def override_db_dependency():
    app.dependency_overrides[get_db] = mock_get_db
    yield
    app.dependency_overrides.clear()

client = TestClient(app)


def test_chat_stream_endpoint():
    response = client.post(
        "/api/v1/chat/stream",
        json={"question": "What is the refund policy?"}
    )
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    assert "data:" in response.text
    assert "[DONE]" in response.text
