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


def test_chat_question_endpoint():
    response = client.post(
        "/api/v1/chat",
        json={"question": "How many casual leaves are available?"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "sources" in data
    assert isinstance(data["sources"], list)


def test_empty_question_fails():
    response = client.post(
        "/api/v1/chat",
        json={"question": "   "}
    )
    assert response.status_code in (400, 422)
