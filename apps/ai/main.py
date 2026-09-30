import json
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# Without this, uvicorn leaves the root logger at WARNING and every
# logger.info line in this service (call latency, retry reasons, request
# correlation) is silently dropped.
class JsonFormatter(logging.Formatter):
    """One JSON object per line (Week 4 4D.4), matching the api's logEvent
    lines so the two services' logs can be joined on request_id."""

    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key in ("request_id", "event", "status", "ms", "path"):
            if hasattr(record, key):
                entry[key] = getattr(record, key)
        if record.exc_info:
            entry["exc"] = self.formatException(record.exc_info)
        return json.dumps(entry)


_handler = logging.StreamHandler()
_handler.setFormatter(JsonFormatter())
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), handlers=[_handler])

from models.response_models import HealthResponse
from routers import hints, predictions
from routers.challenges import router as challenges_router
from routers.code_eval import router as code_eval_router
from routers.feynman import router as feynman_router
from routers.self_explanation import router as self_explanation_router
from routers.summaries import router as summaries_router
from services import metrics
from services.request_log import RequestIdMiddleware

app = FastAPI(title="DSA Tutor AI Service")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIdMiddleware)

app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["predictions"])
app.include_router(hints.router, prefix="/api/v1/hints", tags=["hints"])
app.include_router(feynman_router, prefix="/api/v1")
app.include_router(challenges_router, prefix="/api/v1")
app.include_router(code_eval_router, prefix="/api/v1")
app.include_router(summaries_router, prefix="/api/v1")
app.include_router(self_explanation_router, prefix="/api/v1")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="dsa-tutor-ai")


@app.get("/metrics")
def service_metrics() -> dict:
    """Claude call counters since this instance started: counts only."""
    return metrics.snapshot()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )
