from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import os
import requests
from dotenv import load_dotenv
import openai

# 환경변수 로드
load_dotenv()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "YOUR_YOUTUBE_API_KEY")
SUPADATA_API_KEY = os.getenv("SUPADATA_API_KEY", "YOUR_SUPADATA_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY")

app = FastAPI(
    title="YouTube 영상 요약 API",
    description="키워드로 유튜브 상위 영상 검색 후 자막 요약",
    version="1.0.0"
)

# 응답 모델 정의
class VideoSummary(BaseModel):
    video_id: str
    title: str
    summary: str

class ErrorResponse(BaseModel):
    detail: str

def search_youtube_videos(keyword: str) -> list:
    """유튜브 상위 영상 검색"""
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

def get_auto_captions(video_id: str) -> str:
    """자막 추출"""
    url = "https://api.supadata.ai/v1/youtube/transcript"
    params = {"videoId": video_id}
    headers = {"x-api-key": SUPADATA_API_KEY}
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
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"자막 추출 오류 ({video_id}): {str(e)}"
        )

def summarize_text(text: str) -> str:
    """텍스트 요약"""
    if not text or len(text.strip()) == 0:
        return "자막 내용 없음"
    
    openai.api_key = OPENAI_API_KEY
    prompt = (
        "아래 유튜브 영상 자막 내용을 한국어로 3~4줄로 요약해줘.\n"
        "자막:\n" + text[:8000]  # 긴 자막 처리
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
        raise HTTPException(
            status_code=500,
            detail=f"요약 오류: {str(e)}"
        )

@app.get("/summarize", 
         response_model=list[VideoSummary],
         responses={404: {"model": ErrorResponse}})
async def summarize_videos(
    keyword: str = Query(..., description="검색할 키워드 (예: 인공지능)")
):
    """
    YouTube 영상 요약 API
    
    - **keyword**: 검색할 키워드
    - **반환값**: 요약 정보 리스트 (최대 3개)
    """
    try:
        # 영상 검색
        videos = search_youtube_videos(keyword)
        if not videos:
            raise HTTPException(
                status_code=404,
                detail="검색 결과가 없습니다."
            )
        
        results = []
        for video in videos:
            # 자막 추출
            transcript = get_auto_captions(video['id'])
            
            # 요약
            summary = summarize_text(transcript) if transcript else "자막 없음"
            
            results.append(VideoSummary(
                video_id=video['id'],
                title=video['title'],
                summary=summary
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