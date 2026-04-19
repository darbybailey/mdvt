"""
MDVT API — FastAPI endpoints for NLP analysis and translation.
Run: uvicorn src.api.endpoints:app --reload
Docs: http://localhost:8000/docs
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.core.nlp_processor import NLPProcessor
from src.core.translation_engine import TranslationEngine

app = FastAPI(
    title="MDVT — Media Dubbing Visualization Toolkit",
    description="NLP-powered sentiment analysis and tone matching for multilingual dubbing workflows.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

nlp = NLPProcessor()
translator = TranslationEngine()


# ── Request / Response Models ─────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000, description="Script or dialogue text")

class CompareRequest(BaseModel):
    original: str = Field(..., min_length=1, max_length=50000)
    dubbed: str = Field(..., min_length=1, max_length=50000)

class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    target_language: str = Field(..., description="ISO 639-1 code, e.g. 'es', 'fr', 'de'")
    source_language: str = Field("auto", description="ISO 639-1 code or 'auto'")

class TranslateAndAnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    target_language: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}


@app.get("/languages")
def languages():
    """List supported translation languages."""
    return {"languages": translator.supported_languages()}


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    """
    Analyze sentiment of a script or dialogue block.
    Returns per-segment scores, tone arc, and anomaly indices.
    """
    try:
        result = nlp.analyze(req.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/compare")
def compare(req: CompareRequest):
    """
    Compare sentiment between original and dubbed text.
    Returns alignment score, sentiment drift, and per-segment mismatches.
    """
    try:
        result = nlp.compare(req.original, req.dubbed)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/translate")
async def translate(req: TranslateRequest):
    """Translate text to target language via MyMemory API."""
    if req.target_language not in translator.supported_languages():
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported target language: {req.target_language}. "
                   f"Supported: {list(translator.supported_languages().keys())}",
        )
    try:
        result = await translator.translate(req.text, req.target_language, req.source_language)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Translation API error: {e}")


@app.post("/translate-and-analyze")
async def translate_and_analyze(req: TranslateAndAnalyzeRequest):
    """
    Translate text then run full sentiment comparison between original and translation.
    One-shot endpoint for the dashboard workflow.
    """
    try:
        translation = await translator.translate(req.text, req.target_language)
        comparison = nlp.compare(req.text, translation["translated"])
        return {
            "translation": translation,
            "comparison": comparison,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
