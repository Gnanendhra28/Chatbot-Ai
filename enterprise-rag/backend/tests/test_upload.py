import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_upload_invalid_extension_fails():
    file_bytes = b"Executable or binary content"
    response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("test.exe", io.BytesIO(file_bytes), "application/octet-stream")}
    )
    assert response.status_code == 400
    assert "Security Violation" in response.json()["detail"] or "prohibited" in response.json()["detail"]
