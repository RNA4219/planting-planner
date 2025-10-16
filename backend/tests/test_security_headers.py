from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_includes_csp_header() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.headers["Content-Security-Policy"] == (
        "default-src 'self'; connect-src 'self'; img-src 'self' data:; script-src 'self' "
        "'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; "
        "base-uri 'none'; form-action 'none'"
    )
