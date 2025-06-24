const searchBtn = document.getElementById('searchBtn');
const keywordInput = document.getElementById('keywordInput');
const sortSelect = document.getElementById('sortSelect');
const newsList = document.getElementById('newsList');
const ytList = document.getElementById('ytList');
const reSummarizeBtn = document.getElementById('reSummarizeBtn');
const finalSummaryDiv = document.getElementById('finalSummary');

// 뉴스 fetch!!
async function fetchNews(keyword, sort) {
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

      // 체크박스
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'news-checkbox summary-checkbox';
      checkbox.checked = true;

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

      // 체크박스
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'yt-checkbox summary-checkbox';
      checkbox.checked = true;

      const titleLink = document.createElement('a');
      titleLink.href = `https://youtu.be/${item.video_id}`;
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
  // 선택된 뉴스 본문
  const selectedNews = Array.from(document.querySelectorAll('.news-checkbox:checked'))
    .map(cb => cb.closest('.news-card').dataset.original);

  // 선택된 유튜브 본문
  const selectedYt = Array.from(document.querySelectorAll('.yt-checkbox:checked'))
    .map(cb => cb.closest('.yt-card').dataset.original);

  const selectedOriginals = [...selectedNews, ...selectedYt].filter(Boolean);

  if (selectedOriginals.length === 0) {
    alert('최소 하나 이상의 본문을 선택하세요!');
    return;
  }

  try {
    const response = await fetch('/summarize-originals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originals: selectedOriginals })
    });

    // JSON 응답이 아닐 때 예외 처리
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      finalSummaryDiv.innerHTML = `<div class="final-summary-card" style="color:red;">서버 오류: <pre>${text.slice(0, 500)}</pre></div>`;
      return;
    }

    const result = await response.json();
    if (!result.summary) {
      finalSummaryDiv.innerHTML = `<div class="final-summary-card" style="color:red;">요약 결과가 없습니다.</div>`;
      return;
    }
    finalSummaryDiv.innerHTML = `
      <div class="final-summary-card">
        <h3>최종 요약 결과</h3>
        <p>${result.summary}</p>
      </div>
    `;
  } catch (error) {
    finalSummaryDiv.innerHTML = `<div class="final-summary-card" style="color:red;">재요약 중 오류: ${error.message}</div>`;
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
