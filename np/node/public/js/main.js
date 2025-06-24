const searchBtn = document.getElementById('searchBtn');
const keywordInput = document.getElementById('keywordInput');
const sortSelect = document.getElementById('sortSelect');
const newsList = document.getElementById('newsList');
const ytList = document.getElementById('ytList');
const reSummarizeBtn = document.getElementById('reSummarizeBtn');
const finalSummaryDiv = document.getElementById('finalSummary');

// 추가된 요소들: result-flex 컨테이너를 숨기기 위함
const resultFlexContainer = document.querySelector('.result-flex');
const searchBar = document.querySelector('.search-bar'); // 검색 바도 필요하다면 숨기기 위해 추가

// 로딩 표시 함수
function showLoading(element) {
    element.innerHTML = '<li class="loading">로딩 중...</li>';
}

// 뉴스 fetch!!
async function fetchNews(keyword, sort) {
    showLoading(newsList); // 로딩 표시
    try {
        const response = await fetch(`/summaries?q=${encodeURIComponent(keyword)}&sort=${sort}`);
        if (!response.ok) {
            newsList.innerHTML = `<li>뉴스를 불러오지 못했습니다.</li>`;
            return;
        }
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            newsList.innerHTML = `<li>검색 결과가 없습니다.</li>`;
            return;
        }
        newsList.innerHTML = '';
        data.forEach((item) => {
            const li = document.createElement('li');
            li.className = 'news-card';
            li.dataset.original = item.description || "";

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'news-checkbox summary-checkbox';
            checkbox.checked = false;

            const titleLink = document.createElement('a');
            titleLink.href = item.url;
            titleLink.target = '_blank';
            titleLink.textContent = item.title;
            titleLink.className = 'news-title';

            const summaryP = document.createElement('p');
            summaryP.className = 'summary';
            summaryP.innerHTML = item.summary;

            li.appendChild(checkbox);
            li.appendChild(titleLink);
            li.appendChild(summaryP);
            newsList.appendChild(li);
        });
    } catch (error) {
        newsList.innerHTML = `<li>오류가 발생했습니다: ${error.message}</li>`;
    }
}

// 유튜브 fetch
async function fetchYoutube(keyword) {
    showLoading(ytList); // 로딩 표시
    try {
        const response = await fetch(`/youtube-summaries?keyword=${encodeURIComponent(keyword)}`);
        if (!response.ok) {
            ytList.innerHTML = `<li>유튜브 요약을 불러오지 못했습니다.</li>`;
            return;
        }
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            ytList.innerHTML = `<li>검색 결과가 없습니다.</li>`;
            return;
        }
        ytList.innerHTML = '';
        data.forEach((item) => {
            const li = document.createElement('li');
            li.className = 'yt-card';
            li.dataset.original = item.transcript || "";

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'yt-checkbox summary-checkbox';
            checkbox.checked = false;

            const titleLink = document.createElement('a');
            titleLink.href = `https://youtu.be/$${item.video_id}`;
            titleLink.target = '_blank';
            titleLink.textContent = item.title;
            titleLink.className = 'yt-title';

            const summaryP = document.createElement('p');
            summaryP.className = 'yt-summary';
            summaryP.innerHTML = item.summary;

            li.appendChild(checkbox);
            li.appendChild(titleLink);
            li.appendChild(summaryP);
            ytList.appendChild(li);
        });
    } catch (error) {
        ytList.innerHTML = `<li>오류가 발생했습니다: ${error.message}</li>`;
    }
}

// 검색 버튼
searchBtn.addEventListener('click', () => {
    const keyword = keywordInput.value.trim();
    const sort = sortSelect.value;
    if (keyword === '') {
        alert('검색어를 입력하세요.');
        return;
    }
    fetchNews(keyword, sort);
    fetchYoutube(keyword);

    // 새 검색 시 모든 섹션 다시 보이게 하기
    resultFlexContainer.style.display = 'flex'; // 또는 'block' 또는 원래 display 속성으로
    searchBar.style.display = 'flex'; // 검색 바도 보이게
    reSummarizeBtn.style.display = 'block'; // 재요약 버튼도 보이게
    finalSummaryDiv.innerHTML = ''; // 새 검색 시 이전 결과 지우기
});

// 엔터키 검색
keywordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

// "선택한 본문 재요약" 버튼 이벤트
reSummarizeBtn.addEventListener('click', async () => {
    showLoading(finalSummaryDiv); // 로딩 표시

    // 핵심 변경: 재요약 시작 시 다른 섹션들 숨기기
    resultFlexContainer.style.display = 'none'; // 뉴스/유튜브 리스트 숨김
    searchBar.style.display = 'none'; // 검색 바 숨김 (선택 사항)
    reSummarizeBtn.style.display = 'none'; // 재요약 버튼 자체도 숨김 (선택 사항)

    const selectedNews = Array.from(document.querySelectorAll('.news-checkbox:checked'))
        .map(cb => cb.closest('.news-card').dataset.original);

    const selectedYt = Array.from(document.querySelectorAll('.yt-checkbox:checked'))
        .map(cb => cb.closest('.yt-card').dataset.original);

    const selectedOriginals = [...selectedNews, ...selectedYt].filter(Boolean);

    if (selectedOriginals.length === 0) {
        alert('최소 하나 이상의 본문을 선택하세요!');
        // 선택된 본문이 없을 경우 다시 보이게
        resultFlexContainer.style.display = 'flex';
        searchBar.style.display = 'flex';
        reSummarizeBtn.style.display = 'block';
        finalSummaryDiv.innerHTML = ''; // 로딩 메시지 지우기
        return;
    }

    try {
        const response = await fetch('/summarize-originals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ originals: selectedOriginals })
        });

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const text = await response.text();
            finalSummaryDiv.innerHTML = `<div class="final-summary-card" style="color:red;">서버 오류: <pre>${text.slice(0, 500)}</pre></div>`;
        } else {
            const result = await response.json();
            if (!result.summary) {
                finalSummaryDiv.innerHTML = `<div class="final-summary-card" style="color:red;">요약 결과가 없습니다.</div>`;
            } else {
                finalSummaryDiv.innerHTML = `
                    <div class="final-summary-card">
                        <h3>최종 요약 결과</h3>
                        <p>${result.summary}</p>
                        <button id="backToSearchBtn" class="back-btn">새로운 검색</button>
                    </div>
                `;
                // '새로운 검색' 버튼 이벤트 리스너 추가
                document.getElementById('backToSearchBtn').addEventListener('click', () => {
                    // 모든 섹션 다시 보이게
                    resultFlexContainer.style.display = 'flex';
                    searchBar.style.display = 'flex';
                    reSummarizeBtn.style.display = 'block';
                    finalSummaryDiv.innerHTML = ''; // 최종 요약 결과 지우기
                    keywordInput.value = ''; // 검색어 입력창 초기화
                    newsList.innerHTML = ''; // 뉴스 목록 초기화
                    ytList.innerHTML = ''; // 유튜브 목록 초기화
                });
            }
        }
        // 결과가 표시된 후 최종 요약 섹션으로 스크롤
        finalSummaryDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        finalSummaryDiv.innerHTML = `<div class="final-summary-card" style="color:red;">재요약 중 오류: ${error.message}</div>`;
        // 에러 발생 시에도 스크롤
        finalSummaryDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});

// 전체 선택 버튼 (뉴스)
document.getElementById('selectAllNews')?.addEventListener('click', () => {
    document.querySelectorAll('.news-checkbox').forEach(cb => cb.checked = true);
});
// 전체 선택 버튼 (유튜브)
document.getElementById('selectAllYt')?.addEventListener('click', () => {
    document.querySelectorAll('.yt-checkbox').forEach(cb => cb.checked = true);
});
