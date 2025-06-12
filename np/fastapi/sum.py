from fastapi import FastAPI
import os
import html
import httpx
from typing import List
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")

import openai
openai.api_key = OPENAI_API_KEY

async def fetch_news(query: str, display: int = 2) -> List[dict]:
    url = f"https://openapi.naver.com/v1/search/news.json?query={query}&display={display}"
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            print(f"네이버 뉴스 API 오류: {resp.text}")
            return []
        data = resp.json()
        items = data.get("items", [])
        return [
            {
                "title": html.unescape(item["title"]),
                "description": html.unescape(item["description"]),
                "url": item.get("originallink") or item["link"],
            }
            for item in items
        ]

async def summarize_with_openai(content: str) -> str:
    try:
        response = await openai.ChatCompletion.acreate(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "뉴스 기사를 한국어로 매우 상세하고 깊이 있게 요약해 주세요. 가능한 한 많은 핵심 내용을 포함해 5~6문장 이상으로 작성 바랍니다.",
                },
                {"role": "user", "content": content},
            ],
            temperature=0.7,
            max_tokens=600,
        )
        
        return response["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"OpenAI 요약 실패: {e}")
        return "(요약 실패)"

@app.get("/sum2")
async def sum2(q: str = "카리나"):
    articles = await fetch_news(q, 2)
    if not articles:
        return []

    results = []
    for article in articles:
        summary = await summarize_with_openai(article["description"] or article["title"])
        results.append(
            {
                "title": article["title"],
                "url": article["url"],
                "summary": summary,
            }
        )
    return results

        
    return results