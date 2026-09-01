import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from models.response_models import HealthResponse
from routers import hints, predictions
from routers.challenges import router as challenges_router
from routers.code_eval import router as code_eval_router
from routers.feynman import router as feynman_router

app = FastAPI(title="DSA Tutor AI Service")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["predictions"])
app.include_router(hints.router, prefix="/api/v1/hints", tags=["hints"])
app.include_router(feynman_router, prefix="/api/v1")
app.include_router(challenges_router, prefix="/api/v1")
app.include_router(code_eval_router, prefix="/api/v1")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="dsa-tutor-ai")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )
