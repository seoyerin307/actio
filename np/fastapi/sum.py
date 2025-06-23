import os
import html
import httpx
import re
import uuid
from pathlib import Path
from typing import List
from dotenv import load_dotenv
from fastapi import FastAPI, Query, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import openai
from elevenlabs.client import ElevenLabs
from konlpy.tag import Okt

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

openai.api_key = OPENAI_API_KEY
client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
okt = Okt()

SUMMARY_DIR = Path("summaries")
SUMMARY_DIR.mkdir(exist_ok=True, parents=True)

def strip_html_tags(text: str) -> str:
    return re.sub(r'<[^>]+>', '', text)

def extract_nouns(query: str) -> str:
    try:
        nouns = okt.nouns(query)
        filtered = list({noun for noun in nouns if len(noun) >= 2})
        return ' '.join(filtered) if filtered else query
    except Exception as e:
        print(f"명사 추출 오류: {e}")
        return query

async def fetch_news(query: str, display: int = 2, sort: str = "sim") -> List[dict]:
    url = f"https://openapi.naver.com/v1/search/news.json?query={query}&display={display}&sort={sort}"
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    }
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(url, headers=headers)
        if resp.status_code != 200:
            print(f"네이버 뉴스 API 오류: {resp.text}")
            return []
        data = resp.json()
        return [
            {
                "title": strip_html_tags(html.unescape(item["title"])),
                "description": html.unescape(item["description"]),
                "url": item.get("originallink") or item["link"],
            }
            for item in data.get("items", [])
        ]

async def summarize_with_openai(content: str, keyword: str) -> str:
    try:
        response = await openai.ChatCompletion.acreate(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "뉴스 기사를 한국어 존댓말로 매우 상세하고 깊이 있게 요약해 주세요. "
                        f"반드시 '{keyword}'에 관한 핵심 내용을 포함해 3~4문장으로 작성해 주세요. "
                        "문체는 일관된 존댓말을 사용해 주세요."
                    ),
                },
                {"role": "user", "content": content},
            ],
            temperature=0.3,
            max_tokens=800,
        )
        summary = response["choices"][0]["message"]["content"]
        return strip_html_tags(summary)
    except Exception as e:
        print(f"OpenAI 요약 실패: {e}")
        return "(요약 실패)"

@app.get("/summaries")
async def summarize_news(
    q: str = Query("카리나", min_length=2, max_length=50),
    sort: str = Query("sim", enum=["sim", "date"]),
    smart_search: bool = True
):
    search_query = extract_nouns(q) if smart_search else q
    articles = await fetch_news(search_query, 2, sort)
    if not articles:
        return []
    results = []
    for idx, article in enumerate(articles):
        summary = await summarize_with_openai(
            article["description"] or article["title"], q
        )
        file_id = f"{uuid.uuid4().hex}.txt"
        filepath = SUMMARY_DIR / file_id
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(summary)
        results.append({
            "title": article["title"],
            "url": article["url"],
            "summary": summary,
            "file_id": file_id
        })
    return results

@app.get("/tts")
async def text_to_speech(
    file_id: str = Query(..., description="summaries에서 받은 파일명"),
    voice_id: str = Query("21m00Tcm4TlvDq8ikWAM")
):
    filepath = SUMMARY_DIR / file_id
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()
    try:
        audio = client.text_to_speech.convert(
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            text=text,
            output_format="mp3_44100_128",
        )
        audio_bytes = b"".join(audio)
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Content-Disposition": f"inline; filename={file_id}.mp3"}
        )
    except Exception as e:
        print(f"TTS 변환 오류: {e}")
        raise HTTPException(status_code=500, detail="TTS processing failed")