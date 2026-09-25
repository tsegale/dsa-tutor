import logging
import time
import uuid

logger = logging.getLogger("request")

_SKIP_PATHS = {"/health"}


class RequestIdMiddleware:
    """Logs every request's start and end under a correlation id, so a stall
    can be placed: the api forwards the same id it logged, and an id with no
    "request start" here never reached this service (Railway's edge), while
    a start with no "request end" stalled inside it. Streams log their end
    when the last body chunk is sent, or "request aborted" if the response
    never completed (client gone, or an error mid-stream).

    Pure ASGI rather than BaseHTTPMiddleware so streamed responses pass
    through untouched."""

    def __init__(self, app) -> None:
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http" or scope.get("path") in _SKIP_PATHS:
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        request_id = headers.get(b"x-request-id", b"").decode("latin-1")[:100] or uuid.uuid4().hex
        start = time.monotonic()
        state = {"status": None, "done": False}
        logger.info("request start id=%s method=%s path=%s", request_id, scope.get("method"), scope.get("path"))

        async def send_with_id(message) -> None:
            if message["type"] == "http.response.start":
                state["status"] = message["status"]
                message = {**message, "headers": [*message.get("headers", []), (b"x-request-id", request_id.encode())]}
            await send(message)
            if message["type"] == "http.response.body" and not message.get("more_body", False):
                state["done"] = True
                logger.info(
                    "request end id=%s status=%s ms=%d",
                    request_id, state["status"], round((time.monotonic() - start) * 1000),
                )

        try:
            await self.app(scope, receive, send_with_id)
        finally:
            if not state["done"]:
                logger.warning(
                    "request aborted id=%s status=%s ms=%d",
                    request_id, state["status"], round((time.monotonic() - start) * 1000),
                )
