import os
import html
import httpx
import re
import uuid
import requests
import time
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, Query, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles # StaticFiles 임포트
from pydantic import BaseModel
import openai
from konlpy.tag import Okt
from requests.exceptions import HTTPError, ConnectionError, Timeout
import uvicorn # uvicorn 임포트 (if __name__ == "__main__": 블록에서 직접 실행 시 필요)


# 환경변수 로드
load_dotenv()

# 환경변수 값 확인 (디버깅용)
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "YOUR_YOUTUBE_API_KEY")
SUPADATA_API_KEY = os.getenv("SUPADATA_API_KEY", "YOUR_SUPADATA_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY")
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID", "YOUR_NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET", "YOUR_NAVER_CLIENT_SECRET")
# ElevenLabs API 키 추가 (환경 변수에서 로드)
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "YOUR_ELEVENLABS_API_KEY")

print(f"YOUTUBE_API_KEY loaded: {'Yes' if YOUTUBE_API_KEY != 'YOUR_YOUTUBE_API_KEY' else 'No (default)'}")
print(f"SUPADATA_API_KEY loaded: {'Yes' if SUPADATA_API_KEY != 'YOUR_SUPADATA_API_KEY' else 'No (default)'}")
print(f"OPENAI_API_KEY loaded: {'Yes' if OPENAI_API_KEY != 'YOUR_OPENAI_API_KEY' else 'No (default)'}")
print(f"NAVER_CLIENT_ID loaded: {'Yes' if NAVER_CLIENT_ID != 'YOUR_NAVER_CLIENT_ID' else 'No (default)'}")
print(f"NAVER_CLIENT_SECRET loaded: {'Yes' if NAVER_CLIENT_SECRET != 'YOUR_NAVER_CLIENT_SECRET' else 'No (default)'}")
print(f"ELEVENLABS_API_KEY loaded: {'Yes' if ELEVENLABS_API_KEY != 'YOUR_ELEVENLABS_API_KEY' else 'No (default)'}")


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

# 음성 파일을 저장할 디렉토리 생성
AUDIO_DIR = Path("audio_summaries")
AUDIO_DIR.mkdir(exist_ok=True, parents=True)

# FastAPI 정적 파일 서빙 설정 (오디오 파일 접근을 위해 필요)
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")


def strip_html_tags(text: str) -> str:
    return re.sub(r'<[^>]+>', '', text)

def extract_nouns(query: str) -> str:
    try:
        nouns = okt.nouns(query)
        filtered = list({noun for noun in nouns if len(noun) >= 2})
        return ' '.join(filtered) if filtered else query
    except Exception as e:
        print(f"[ERROR] 명사 추출 오류: {e}")
        return query

async def fetch_news(query: str, display: int = 3, sort: str = "sim") -> List[dict]:
    url = f"https://openapi.naver.com/v1/search/news.json?query={query}&display={display}&sort={sort}"
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    }
    try:
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.get(url, headers=headers, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            return [
                {
                    "title": strip_html_tags(html.unescape(item["title"])),
                    "description": html.unescape(item["description"]),
                    "url": item.get("originallink") or item["link"],
                }
                for item in data.get("items", [])
            ]
    except httpx.HTTPStatusError as e:
        print(f"[ERROR] 네이버 뉴스 API HTTP 상태 오류: {e.response.status_code} - {e.response.text}")
        return []
    except httpx.RequestError as e:
        print(f"[ERROR] 네이버 뉴스 API 요청 오류 (네트워크/타임아웃): {e}")
        return []
    except Exception as e:
        print(f"[ERROR] 네이버 뉴스 API 호출 중 예기치 않은 오류: {e}")
        return []

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
    except openai.error.AuthenticationError as e:
        print(f"[ERROR] OpenAI 인증 오류: {e}")
        return "(OpenAI 인증 실패)"
    except openai.error.OpenAIError as e:
        print(f"[ERROR] OpenAI API 오류: {e}")
        return "(OpenAI API 오류)"
    except Exception as e:
        print(f"[ERROR] OpenAI 요약 실패 (예기치 않은 오류): {e}")
        return "(요약 실패)"

@app.get("/news/summaries")
async def summarize_news(
    q: str = Query("카리나", min_length=2, max_length=50),
    sort: str = Query("sim", enum=["sim", "date"]),
    smart_search: bool = True
):
    try:
        search_query = extract_nouns(q) if smart_search else q
        articles = await fetch_news(search_query, 3, sort)
        if not articles:
            print("[WARNING] 뉴스 검색 결과가 없습니다.")
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
                "file_id": file_id,
                "description": article["description"]
            })
        return results
    except Exception as e:
        print(f"[CRITICAL ERROR] /news/summaries 엔드포인트 처리 중 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"서버 오류: 뉴스 요약 처리 중 문제가 발생했습니다. {str(e)}"
        )

class VideoSummary(BaseModel):
    video_id: str
    title: str
    summary: str
    transcript: str = ""

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
    except HTTPError as e:
        print(f"[ERROR] 유튜브 검색 HTTP 오류: {e.response.status_code} - {e.response.text}")
        raise HTTPException(
            status_code=400,
            detail=f"유튜브 검색 API 오류 (HTTP): {str(e.response.text)}"
        )
    except (ConnectionError, Timeout) as e:
        print(f"[ERROR] 유튜브 검색 네트워크/타임아웃 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"유튜브 검색 API 네트워크 오류: {str(e)}"
        )
    except Exception as e:
        print(f"[ERROR] 유튜브 검색 중 예기치 않은 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"유튜브 검색 API 오류: {str(e)}"
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
            if hasattr(e.response, "status_code"):
                print(f"[ERROR] SupaData 자막 추출 HTTP 오류 ({video_id}): {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 429:
                wait_time = 2 ** (attempt + 1)
                print(f"429 오류 발생. {wait_time}초 후 재시도...")
                time.sleep(wait_time)
                continue
            elif e.response.status_code in [401, 403]:
                raise HTTPException(
                    status_code=500,
                    detail=f"SupaData 자막 API 인증 오류 ({video_id}): {str(e.response.text)}"
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"SupaData 자막 추출 오류 ({video_id}): {str(e)}"
                )
        except (ConnectionError, Timeout) as e:
            print(f"[ERROR] SupaData 자막 추출 네트워크/타임아웃 오류 ({video_id}): {e}")
            raise HTTPException(
                status_code=500,
                detail=f"SupaData 자막 추출 네트워크 오류 ({video_id}): {str(e)}"
            )
        except Exception as e:
            print(f"[ERROR] SupaData 자막 추출 중 예기치 않은 오류 ({video_id}): {e}")
            raise HTTPException(
                status_code=500,
                detail=f"자막 추출 오류 ({video_id}): {str(e)}"
            )
    return "자막 추출 실패(429 Too Many Requests)"

def summarize_youtube_text(text: str) -> str:
    if not text or len(text.strip()) == 0:
        return "자막 내용 없음"
    prompt = (
        "아래 유튜브 영상 자막 내용을 한국어로 1줄로 요약해줘.\n"
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
    except openai.error.AuthenticationError as e:
        print(f"[ERROR] OpenAI 요약 (자막) 인증 오류: {e}")
        return f"요약 오류: OpenAI 인증 실패"
    except openai.error.OpenAIError as e:
        print(f"[ERROR] OpenAI 요약 (자막) API 오류: {e}")
        return f"요약 오류: OpenAI API 문제"
    except Exception as e:
        print(f"[ERROR] OpenAI 요약 (자막) 실패 (예기치 않은 오류): {e}")
        return f"요약 오류: {str(e)}"

# ElevenLabs 음성 합성 함수
async def generate_audio_from_text(text: str, voice_id: str = "21m00Tcm4TlvDpxAtCSJ", stability: float = 0.5, clarity: float = 0.75) -> Optional[str]:
    """
    ElevenLabs API를 사용하여 텍스트를 오디오로 변환하고, 파일 경로를 반환합니다.
    voice_id는 함수 호출 시 전달되는 값 또는 기본값 (Adam)을 사용합니다.
    """
    if not ELEVENLABS_API_KEY or ELEVENLABS_API_KEY == "YOUR_ELEVENLABS_API_KEY":
        print("[ERROR] ElevenLabs API 키가 설정되지 않았습니다.")
        return None


    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "accept": "audio/mpeg"
    }
    data = {
        "text": text,
        "model_id": "eleven_multilingual_v2", # 한국어 지원 모델 사용
        "voice_settings": {
            "stability": stability,
            "similarity_boost": clarity
        }
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client_http: # 타임아웃 추가
            response = await client_http.post(url, headers=headers, json=data)
            response.raise_for_status() # HTTP 오류가 발생하면 예외 발생

            audio_file_name = f"summary_{uuid.uuid4().hex}.mp3"
            audio_file_path = AUDIO_DIR / audio_file_name

            with open(audio_file_path, "wb") as f:
                f.write(response.content)
            
            # 클라이언트가 접근할 수 있는 URL 반환
            return f"/audio/{audio_file_name}"
    except httpx.HTTPStatusError as e:
        print(f"[ERROR] ElevenLabs API HTTP 오류: {e.response.status_code} - {e.response.text}")
        return None
    except httpx.RequestError as e:
        print(f"[ERROR] ElevenLabs API 요청 오류 (네트워크/타임아웃): {e}")
        return None
    except Exception as e:
        print(f"[ERROR] ElevenLabs 음성 합성 중 예기치 않은 오류: {e}")
        return None


@app.get("/youtube-summaries", response_model=List[VideoSummary])
async def summarize_videos(
    keyword: str = Query(..., description="검색할 키워드 (예: 인공지능)")
):
    try:
        videos = search_youtube_videos(keyword)
        if not videos:
            print("[WARNING] 유튜브 검색 결과가 없습니다.")
            raise HTTPException(
                status_code=404,
                detail="검색 결과가 없습니다."
            )
        results = []
        for video in videos[:3]:
            try:
                transcript = get_auto_captions(video['id'])
                summary = summarize_youtube_text(transcript) if transcript else "자막 없음"
                results.append(VideoSummary(
                    video_id=video['id'],
                    title=video['title'],
                    summary=summary,
                    transcript=transcript
                ))
            except HTTPException as e:
                print(f"[ERROR] 영상 {video['id']} 처리 실패: {e.detail}")
                results.append(VideoSummary(
                    video_id=video['id'],
                    title=video['title'],
                    summary=f"요약 불가: {e.detail[:50]}...",
                    transcript=""
                ))
        return results
    except HTTPException as he:
        print(f"[CRITICAL ERROR] /youtube-summaries 엔드포인트에서 HTTPException 발생: {he.detail}")
        raise he
    except Exception as e:
        print(f"[CRITICAL ERROR] /youtube-summaries 엔드포인트 처리 중 예기치 않은 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"서버 오류: 유튜브 요약 처리 중 문제가 발생했습니다. {str(e)}"
        )

@app.post("/summarize-originals")
async def summarize_originals(originals: dict = Body(...)):
    """
    originals = {"originals": [ ... ]}
    """
    originals_list = originals.get("originals", [])
    if not originals_list:
        return {"summary": "선택된 본문이 없습니다.", "audio_url": None} # audio_url 추가
    combined_text = "\n\n".join(originals_list)
    
    summary = ""
    audio_url = None

    try:
        if len(combined_text) > 3500:
            combined_text = combined_text[:3500] + "... [중략]"
        
        response = await openai.ChatCompletion.acreate(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "다음 여러 뉴스 기사와 유튜브 영상 본문을 종합해 핵심 내용을 한국어로 상세하게 요약해 주세요. "
                        "각 줄은 핵심 내용을 담아야 하며, 불필요하게 문장을 늘리지 마세요."
                        "중복되는 내용은 한 번만 포함하고, 전체 흐름을 자연스럽게 정리하되, 반드시 15줄 이상으로 요약해 주세요."
                    )
                },
                {"role": "user", "content": combined_text}
            ],
            temperature=0.2,
            max_tokens=3000
        )
        summary = response.choices[0].message['content']

        if summary:
            # 이 부분을 직접 Voice ID로 교체합니다.
            korean_voice_id = "fLvpMIGwcTmxzsUF4z1U" # 직접 'Bella' 음성 ID 삽입
            audio_url = await generate_audio_from_text(summary, voice_id=korean_voice_id)
            if not audio_url:
                print("[WARNING] ElevenLabs 음성 생성에 실패했습니다.")


        return {"summary": summary, "audio_url": audio_url}

    except openai.error.AuthenticationError as e:
        print(f"[ERROR] 재요약 OpenAI 인증 오류: {e}")
        return {"summary": f"재요약 실패: OpenAI 인증 문제 - {e}", "audio_url": None}
    except openai.error.OpenAIError as e:
        print(f"[ERROR] 재요약 OpenAI API 오류: {e}")
        return {"summary": f"재요약 실패: OpenAI API 문제 - {e}", "audio_url": None}
    except Exception as e:
        print(f"[CRITICAL ERROR] /summarize-originals 엔드포인트 처리 중 예기치 않은 오류: {e}")
        return {"summary": f"재요약 실패: {str(e)}", "audio_url": None}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)