from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_includes_csp_header() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.headers["Content-Security-Policy"] == (
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; "
        "connect-src 'self'; img-src 'self'; script-src 'self'; style-src 'self'"
    )
