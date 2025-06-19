from googleapiclient.discovery import build
from dotenv import load_dotenv
import os

# .env 파일에서 환경변수 불러오기
load_dotenv()

# 환경변수에서 API 키 가져오기
API_KEY = os.getenv('YOUTUBE_API_KEY')
YOUTUBE_API_SERVICE_NAME = 'youtube'
YOUTUBE_API_VERSION = 'v3'

def youtube_search(query, max_results=5):
    """
    유튜브 검색을 실행하고, 영상 제목과 ID 리스트를 반환합니다.
    """
    # API 키가 없으면 에러 발생
    if not API_KEY:
        raise ValueError("YouTube API 키가 환경변수에 설정되어 있지 않습니다.")
    
    youtube = build(YOUTUBE_API_SERVICE_NAME, YOUTUBE_API_VERSION, developerKey=API_KEY)

    request = youtube.search().list(
        q=query,
        part='snippet',
        type='video',  # 영상만 검색
        maxResults=max_results
    )

    response = request.execute()

    videos = []
    for item in response.get('items', []):
        video_id = item['id']['videoId']
        title = item['snippet']['title']
        videos.append({'id': video_id, 'title': title})
    
    return videos

if __name__ == '__main__':
    search_query = 'Python programming tutorial'
    results = youtube_search(search_query, max_results=10)

    if results:
        print(f"'{search_query}' 검색 결과:")
        for video in results:
            print(f"  제목: {video['title']}")
            print(f"  영상 ID: {video['id']}\n")
    else:
        print("검색 결과가 없습니다.")