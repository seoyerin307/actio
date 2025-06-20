const searchBtn = document.getElementById('searchBtn');
const keywordInput = document.getElementById('keywordInput');
const sortSelect = document.getElementById('sortSelect');
const newsList = document.getElementById('newsList');
const ytList = document.getElementById('ytList');

async function fetchNews(keyword, sort) {
  try {
    const response = await fetch(`/summaries?q=${encodeURIComponent(keyword)}&sort=${sort}`);
    if (!response.ok) {
      newsList.innerHTML = `<li>뉴스를 불러오지 못했습니다.</li>`;
      return;
    }
    const data = await response.json();
    if (data.length === 0) {
      newsList.innerHTML = `<li>검색 결과가 없습니다.</li>`;
      return;
    }
    newsList.innerHTML = '';
    data.forEach(item => {
      const li = document.createElement('li');
      li.className = 'news-card';

      const titleLink = document.createElement('a');
      titleLink.href = item.url;
      titleLink.target = '_blank';
      titleLink.textContent = item.title;
      titleLink.className = 'news-title';

      const summaryP = document.createElement('p');
      summaryP.className = 'summary';
      summaryP.innerHTML = item.summary;

      li.appendChild(titleLink);
      li.appendChild(summaryP);
      newsList.appendChild(li);
    });
  } catch (error) {
    newsList.innerHTML = `<li>오류가 발생했습니다: ${error.message}</li>`;
  }
}

async function fetchYoutube(keyword) {
  try {
    const response = await fetch(`/youtube-summaries?keyword=${encodeURIComponent(keyword)}`);
    if (!response.ok) {
      ytList.innerHTML = `<li>유튜브 요약을 불러오지 못했습니다.</li>`;
      return;
    }
    const data = await response.json();
    if (data.length === 0) {
      ytList.innerHTML = `<li>검색 결과가 없습니다.</li>`;
      return;
    }
    ytList.innerHTML = '';
    data.forEach(item => {
      const li = document.createElement('li');
      li.className = 'yt-card';

      const titleLink = document.createElement('a');
      titleLink.href = `https://youtu.be/${item.video_id}`;
      titleLink.target = '_blank';
      titleLink.textContent = item.title;
      titleLink.className = 'yt-title';

      const summaryP = document.createElement('p');
      summaryP.className = 'yt-summary';
      summaryP.innerHTML = item.summary;

      li.appendChild(titleLink);
      li.appendChild(summaryP);
      ytList.appendChild(li);
    });
  } catch (error) {
    ytList.innerHTML = `<li>오류가 발생했습니다: ${error.message}</li>`;
  }
}

searchBtn.addEventListener('click', () => {
  const keyword = keywordInput.value.trim();
  const sort = sortSelect.value;
  if (keyword === '') {
    alert('검색어를 입력하세요.');
    return;
  }
  fetchNews(keyword, sort);
  fetchYoutube(keyword);
});

keywordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    searchBtn.click();
  }
});