"""
NLP Processor — sentiment analysis and tone mapping for dubbing scripts.
Uses NLTK VADER (media-tuned lexicon) for segment-level scoring.
"""

import re
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from langdetect import detect, LangDetectException

# Download required NLTK data on first run
for pkg in ("vader_lexicon", "punkt", "punkt_tab"):
    try:
        nltk.data.find(f"tokenizers/{pkg}" if pkg.startswith("punkt") else f"sentiment/{pkg}")
    except LookupError:
        nltk.download(pkg, quiet=True)


class SentimentSegment:
    def __init__(self, index: int, text: str, scores: dict):
        self.index = index
        self.text = text
        self.compound = scores["compound"]   # -1.0 → 1.0
        self.positive = scores["pos"]
        self.negative = scores["neg"]
        self.neutral = scores["neu"]
        self.label = self._label()

    def _label(self) -> str:
        if self.compound >= 0.05:
            return "positive"
        if self.compound <= -0.05:
            return "negative"
        return "neutral"

    def to_dict(self) -> dict:
        return {
            "index": self.index,
            "text": self.text,
            "compound": round(self.compound, 4),
            "positive": round(self.positive, 4),
            "negative": round(self.negative, 4),
            "neutral": round(self.neutral, 4),
            "label": self.label,
        }


class NLPProcessor:
    def __init__(self):
        self._sia = SentimentIntensityAnalyzer()

    def detect_language(self, text: str) -> str:
        try:
            return detect(text)
        except LangDetectException:
            return "unknown"

    def segment(self, text: str) -> list[str]:
        """Split text into sentence-level segments."""
        sentences = nltk.sent_tokenize(text)
        return [s.strip() for s in sentences if s.strip()]

    def analyze(self, text: str) -> dict:
        """Full sentiment analysis of a script/text block."""
        lang = self.detect_language(text)
        segments_raw = self.segment(text)
        segments = [
            SentimentSegment(i, seg, self._sia.polarity_scores(seg))
            for i, seg in enumerate(segments_raw)
        ]

        compounds = [s.compound for s in segments]
        avg_compound = sum(compounds) / len(compounds) if compounds else 0.0

        # Tone arc: emotional trajectory across segments
        tone_arc = [round(c, 4) for c in compounds]

        # Anomalies: segments where tone shifts > 0.5 from neighbors
        anomalies = []
        for i in range(1, len(segments) - 1):
            delta = abs(segments[i].compound - segments[i - 1].compound)
            if delta > 0.5:
                anomalies.append(segments[i].index)

        return {
            "language": lang,
            "segment_count": len(segments),
            "average_compound": round(avg_compound, 4),
            "overall_label": self._label(avg_compound),
            "tone_arc": tone_arc,
            "anomaly_indices": anomalies,
            "segments": [s.to_dict() for s in segments],
        }

    def compare(self, original: str, dubbed: str) -> dict:
        """Compare sentiment between original and dubbed text."""
        orig_result = self.analyze(original)
        dub_result = self.analyze(dubbed)

        drift = round(dub_result["average_compound"] - orig_result["average_compound"], 4)

        # Segment-level alignment (zip to shorter)
        orig_segs = orig_result["segments"]
        dub_segs = dub_result["segments"]
        alignment = []
        for o, d in zip(orig_segs, dub_segs):
            alignment.append({
                "index": o["index"],
                "original_compound": o["compound"],
                "dubbed_compound": d["compound"],
                "delta": round(d["compound"] - o["compound"], 4),
                "aligned": abs(d["compound"] - o["compound"]) <= 0.2,
            })

        mismatches = [a for a in alignment if not a["aligned"]]

        return {
            "original": orig_result,
            "dubbed": dub_result,
            "sentiment_drift": drift,
            "alignment_score": round(
                sum(1 for a in alignment if a["aligned"]) / len(alignment), 4
            ) if alignment else 1.0,
            "mismatch_count": len(mismatches),
            "mismatches": mismatches,
        }

    @staticmethod
    def _label(compound: float) -> str:
        if compound >= 0.05:
            return "positive"
        if compound <= -0.05:
            return "negative"
        return "neutral"
