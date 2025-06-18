import urllib.request
import urllib.parse
import json
import html
import requests
import os
import time

# 네이버 API 키
client_id = "bCovPC7wNjEApG0cQfSl"
client_secret = "4rVLgMBI4Z"

# Kagi API 키 (환경 변수에서 불러오기)
KAGI_API_KEY = os.environ.get("KAGI_API_KEY")
if not KAGI_API_KEY:
    raise ValueError("KAGI_API_KEY 환경 변수 설정 필요")

# 검색어와 네이버 뉴스 호출
query = "미국증시"
enc_query = urllib.parse.quote(query)
display = 5  # 너무 많으면 Kagi에 부담 → 테스트는 적게

naver_url = f"https://openapi.naver.com/v1/search/news.json?query={enc_query}&display={display}"
request = urllib.request.Request(naver_url)
request.add_header("X-Naver-Client-Id", client_id)
request.add_header("X-Naver-Client-Secret", client_secret)

try:
    response = urllib.request.urlopen(request)
    response_body = response.read().decode('utf-8')
    result = json.loads(response_body)

    for idx, item in enumerate(result['items']):
        title = html.unescape(item['title'])
        originallink = item.get('originallink', item.get('link'))

        print(f"\n[{idx+1}] 📌 제목: {title}")
        print(f"🔗 기사 링크: {originallink}")

        # Kagi Summarizer API 호출
        try:
            kagi_response = requests.get(
                "https://kagi.com/api/v0/summarize",
                headers={"Authorization": "Bot " + KAGI_API_KEY},
                params={"url": originallink, "target_language": "KO"}
            )
            kagi_response.raise_for_status()
            summary = kagi_response.json()['data']['output']
            print(f"📝 요약 내용:\n{summary}")
        except Exception as ke:
            print(f"❗ Kagi 요약 실패: {ke}")

        print("-" * 100)
        time.sleep(1.5)  # 너무 빠른 요청 방지 (Kagi API 정책 고려)

except urllib.error.HTTPError as e:
    print(f"❌ HTTPError: {e.code} - {e.reason}")
    print(e.read().decode())