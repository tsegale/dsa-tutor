from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_always_accessible_even_when_internal_key_configured(monkeypatch):
    monkeypatch.setenv("INTERNAL_API_KEY", "super-secret-internal-key")
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_metrics_and_api_require_internal_service_key_when_configured(monkeypatch):
    monkeypatch.setenv("INTERNAL_API_KEY", "super-secret-internal-key")

    missing = client.get("/metrics")
    assert missing.status_code == 403

    wrong = client.get("/metrics", headers={"X-Internal-Service-Key": "wrong-key"})
    assert wrong.status_code == 403

    valid = client.get("/metrics", headers={"X-Internal-Service-Key": "super-secret-internal-key"})
    assert valid.status_code == 200
