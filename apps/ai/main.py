from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="DSA Tutor AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictionRequest(BaseModel):
    algorithmName: str
    stepIndex: int
    currentState: dict | list | None = None
    studentAnswer: str | None = None
    errorHistory: list[str] = []
    scaffoldingLevel: str


class PredictionResponse(BaseModel):
    correct: bool
    misconceptionCategory: str | None = None
    consequenceExplanation: str
    socraticHint: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "dsa-tutor-ai"}


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    # Placeholder logic — the primary algorithm is Bubble Sort; all
    # scaffolding/misconception logic should be built and validated
    # against it first before extending to other algorithms.
    return PredictionResponse(
        correct=False,
        misconceptionCategory=None,
        consequenceExplanation="Not yet implemented.",
        socraticHint="What happens when you compare these two adjacent elements?",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )
