import os
import html
import httpx
import re
import uuid
import requests
import time
from pathlib import Path
from typing import List
from dotenv import load_dotenv
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
from konlpy.tag import Okt
from requests.exceptions import HTTPError

# 환경변수 로드
load_dotenv()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "YOUR_YOUTUBE_API_KEY")
SUPADATA_API_KEY = os.getenv("SUPADATA_API_KEY", "YOUR_SUPADATA_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY")
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID", "YOUR_NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET", "YOUR_NAVER_CLIENT_SECRET")

app = FastAPI(
    title="통합 미디어 요약 API",
    description="뉴스 요약 + 유튜브 영상 요약 서비스",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

openai.api_key = OPENAI_API_KEY
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
        summary = response.choices[0].message['content']
        return strip_html_tags(summary)
    except Exception as e:
        print(f"OpenAI 요약 실패: {e}")
        return "(요약 실패)"

@app.get("/news/summaries")
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
    for article in articles:
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

class VideoSummary(BaseModel):
    video_id: str
    title: str
    summary: str

def search_youtube_videos(keyword: str) -> list:
    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "q": keyword,
        "type": "video",
        "maxResults": 3,
        "key": YOUTUBE_API_KEY,
        "order": "relevance"
    }
    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        return [
            {'id': item['id']['videoId'], 'title': item['snippet']['title']}
            for item in data.get('items', [])
            if item['id'].get('videoId')
        ]
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"유튜브 검색 오류: {str(e)}"
        )

def get_auto_captions(video_id: str, retry_count: int = 3) -> str:
    url = "https://api.supadata.ai/v1/youtube/transcript"
    params = {"videoId": video_id}
    headers = {"x-api-key": SUPADATA_API_KEY}
    for attempt in range(retry_count):
        try:
            response = requests.get(url, params=params, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            content = data.get("content", "")
            if isinstance(content, list):
                return " ".join([item.get('text', '') for item in content])
            elif isinstance(content, str):
                return content
            return ""
        except HTTPError as e:
            if hasattr(e.response, "status_code") and e.response.status_code == 429:
                wait_time = 2 ** (attempt + 1)
                print(f"429 오류 발생. {wait_time}초 후 재시도...")
                time.sleep(wait_time)
                continue
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"자막 추출 오류 ({video_id}): {str(e)}"
                )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"자막 추출 오류 ({video_id}): {str(e)}"
            )
    return "자막 추출 실패(429 Too Many Requests)"

def summarize_youtube_text(text: str) -> str:
    if not text or len(text.strip()) == 0:
        return "자막 내용 없음"
    prompt = (
        "아래 유튜브 영상 자막 내용을 한국어로 3~4줄로 요약해줘.\n"
        "자막:\n" + text[:8000]
    )
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes text in Korean."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.3
        )
        return response.choices[0].message['content'].strip()
    except Exception as e:
        return f"요약 오류: {str(e)}"

@app.get("/youtube/summarize", response_model=List[VideoSummary])
async def summarize_videos(
    keyword: str = Query(..., description="검색할 키워드 (예: 인공지능)")
):
    try:
        videos = search_youtube_videos(keyword)
        if not videos:
            raise HTTPException(
                status_code=404,
                detail="검색 결과가 없습니다."
            )
        results = []
        for video in videos[:3]:  # 3개만 처리
            try:
                transcript = get_auto_captions(video['id'])
                summary = summarize_youtube_text(transcript) if transcript else "자막 없음"
                results.append(VideoSummary(
                    video_id=video['id'],
                    title=video['title'],
                    summary=summary
                ))
            except HTTPException as e:
                print(f"영상 {video['id']} 처리 실패: {e.detail}")
                results.append(VideoSummary(
                    video_id=video['id'],
                    title=video['title'],
                    summary=f"요약 불가: {e.detail[:50]}"
                ))
        return results
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"서버 오류: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)