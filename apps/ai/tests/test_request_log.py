"""Request correlation (Week 1 addendum, stall diagnosis).

The api forwards X-Request-Id; this service logs start and end under it, so
a stalled request can be placed at Railway's edge (no start logged) or in
this service (start, no end)."""

import logging

import pytest
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.testclient import TestClient

from services.request_log import RequestIdMiddleware


def build_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(RequestIdMiddleware)

    @app.get("/ok")
    def ok():
        return {"ok": True}

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/stream")
    def stream():
        def chunks():
            yield "event: delta\ndata: {}\n\n"
            yield "event: final\ndata: {}\n\n"

        return StreamingResponse(chunks(), media_type="text/event-stream")

    @app.get("/broken")
    def broken():
        def chunks():
            yield "event: delta\ndata: {}\n\n"
            raise RuntimeError("dropped mid-stream")

        return StreamingResponse(chunks(), media_type="text/event-stream")

    return app


def messages(caplog) -> list[str]:
    return [r.getMessage() for r in caplog.records if r.name == "request"]


def test_logs_start_and_end_under_the_forwarded_id_and_echoes_it(caplog):
    caplog.set_level(logging.INFO, logger="request")
    res = TestClient(build_app()).get("/ok", headers={"X-Request-Id": "abc123"})
    assert res.headers["x-request-id"] == "abc123"
    logged = messages(caplog)
    assert logged[0].startswith("request start id=abc123 method=GET path=/ok")
    assert logged[1].startswith("request end id=abc123 status=200")


def test_generates_an_id_when_none_is_sent(caplog):
    caplog.set_level(logging.INFO, logger="request")
    res = TestClient(build_app()).get("/ok")
    assert len(res.headers["x-request-id"]) == 32
    assert f"id={res.headers['x-request-id']}" in messages(caplog)[0]


def test_a_stream_logs_its_end_after_the_last_chunk(caplog):
    caplog.set_level(logging.INFO, logger="request")
    res = TestClient(build_app()).get("/stream", headers={"X-Request-Id": "s1"})
    assert "event: final" in res.text
    logged = messages(caplog)
    assert [m.split(" id=")[0] for m in logged] == ["request start", "request end"]


def test_a_response_that_never_completes_is_logged_as_aborted(caplog):
    caplog.set_level(logging.INFO, logger="request")
    with pytest.raises(Exception):  # surfaces as an ExceptionGroup via anyio
        TestClient(build_app()).get("/broken", headers={"X-Request-Id": "b1"})
    logged = messages(caplog)
    assert logged[0].startswith("request start id=b1")
    assert any(m.startswith("request aborted id=b1") for m in logged)
    assert not any(m.startswith("request end id=b1") for m in logged)


def test_health_checks_are_not_logged(caplog):
    caplog.set_level(logging.INFO, logger="request")
    TestClient(build_app()).get("/health")
    assert messages(caplog) == []
