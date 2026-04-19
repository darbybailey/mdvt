"""
Translation Engine — wraps MyMemory free translation API.
MVP: no API key required, 5000 chars/day free tier.
Swap backend URL for DeepL or LibreTranslate in production.
"""

import httpx
from langdetect import detect, LangDetectException

MYMEMORY_URL = "https://api.mymemory.translated.net/get"

SUPPORTED_LANGUAGES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese (Simplified)",
    "ru": "Russian",
    "ar": "Arabic",
    "nl": "Dutch",
    "pl": "Polish",
    "sv": "Swedish",
    "tr": "Turkish",
}


class TranslationEngine:
    def __init__(self, timeout: float = 10.0):
        self._timeout = timeout

    def supported_languages(self) -> dict:
        return SUPPORTED_LANGUAGES

    def detect(self, text: str) -> str:
        try:
            return detect(text)
        except LangDetectException:
            return "unknown"

    async def translate(self, text: str, target_lang: str, source_lang: str = "auto") -> dict:
        """Translate text via MyMemory API."""
        if source_lang == "auto":
            source_lang = self.detect(text)

        lang_pair = f"{source_lang}|{target_lang}"

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.get(
                MYMEMORY_URL,
                params={"q": text, "langpair": lang_pair},
            )
            resp.raise_for_status()
            data = resp.json()

        translated = data.get("responseData", {}).get("translatedText", "")
        match_score = data.get("responseData", {}).get("match", 0)

        return {
            "original": text,
            "translated": translated,
            "source_language": source_lang,
            "target_language": target_lang,
            "match_score": match_score,
        }

    async def translate_segments(
        self, segments: list[str], target_lang: str, source_lang: str = "auto"
    ) -> list[dict]:
        """Translate a list of segments (sentences) individually."""
        results = []
        for seg in segments:
            result = await self.translate(seg, target_lang, source_lang)
            results.append(result)
        return results
