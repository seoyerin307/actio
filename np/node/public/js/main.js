document.addEventListener('DOMContentLoaded', () => {

    // 1. DOM 요소 선택
    const searchBtn = document.getElementById('searchBtn');
    const keywordInput = document.getElementById('keywordInput');
    const sortSelect = document.getElementById('sortSelect'); // 뉴스 정렬 기준
    const newsList = document.getElementById('newsList');     // 뉴스 결과 표시 UL
    const ytList = document.getElementById('ytList');         // 유튜브 결과 표시 UL
    const reSummarizeBtn = document.getElementById('reSummarizeBtn'); // 재요약 버튼
    const finalSummaryDiv = document.getElementById('finalSummary'); // 최종 요약 결과 표시 DIV
    const audioPlayer = document.getElementById('audioPlayer'); // HTML에 있는 <audio> 태그

    const resultFlexContainer = document.querySelector('.result-flex'); // 뉴스/유튜브 결과를 담는 컨테이너
    const searchBar = document.querySelector('.search-bar');             // 검색 바

    // ** 중요: FastAPI 백엔드의 기본 URL 설정 **
    // Docker 로그에서 확인된 외부 IP와 포트를 사용합니다.
    const BACKEND_BASE_URL = "http://3.25.208.15:8080";

    // 2. 이전 뉴스/유튜브 결과를 저장할 변수 (이전 화면으로 돌아갈 때 사용)
    let previousNewsHtml = '';
    let previousYtHtml = '';

    // 3. 로딩 표시 함수
    function showLoading(element) {
        element.innerHTML = '<li class="loading">로딩 중...</li>';
    }

    // 4. 섹션 가시성 제어 함수
    function setSectionVisibility(showSearchAndResults) {
        if (showSearchAndResults) {
            resultFlexContainer.style.display = 'flex';
            searchBar.style.display = 'flex';
            reSummarizeBtn.style.display = 'block';
        } else {
            resultFlexContainer.style.display = 'none';
            searchBar.style.display = 'none';
            reSummarizeBtn.style.display = 'none';
        }
        // 최종 요약 div는 별도로 제어되므로 여기서는 건드리지 않습니다.
        // audioPlayer도 최종 요약 결과에 따라 동적으로 제어됩니다.
    }

    // 5. 오디오 플레이어 초기화 함수
    function resetAudioPlayer() {
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.removeAttribute('src'); // 현재 재생 중인 소스 제거
            audioPlayer.load(); // 오디오 플레이어 재로드 (컨트롤러 리셋)
            audioPlayer.style.display = 'none'; // 숨김
        }
    }

    // 6. '이전 결과로 돌아가기' 버튼 이벤트 처리 함수
    function handleBackToPrevious() {
        setSectionVisibility(true); // 검색 및 결과 섹션 다시 보이기
        finalSummaryDiv.innerHTML = ''; // 최종 요약 결과 지우기
        resetAudioPlayer(); // 오디오 플레이어 초기화 및 숨기기

        // 저장해 둔 이전 뉴스/유튜브 HTML로 복원
        newsList.innerHTML = previousNewsHtml;
        ytList.innerHTML = previousYtHtml;

        // 체크박스 상태 복원 (선택 해제)
        document.querySelectorAll('.summary-checkbox').forEach(cb => {
            cb.checked = false;
        });

        window.scrollTo({ top: 0, behavior: 'smooth' }); // 스크롤 맨 위로
    }

    // 7. '새로운 검색' 버튼 이벤트 처리 함수
    function handleStartNewSearch() {
        setSectionVisibility(true); // 검색 및 결과 섹션 다시 보이기
        finalSummaryDiv.innerHTML = ''; // 최종 요약 결과 지우기
        resetAudioPlayer(); // 오디오 플레이어 초기화 및 숨기기

        keywordInput.value = ''; // 검색어 입력창 초기화
        newsList.innerHTML = ''; // 뉴스 목록 초기화
        ytList.innerHTML = ''; // 유튜브 목록 초기화

        // 이전 데이터도 초기화
        previousNewsHtml = '';
        previousYtHtml = '';

        window.scrollTo({ top: 0, behavior: 'smooth' }); // 스크롤 맨 위로
    }

    // 8. 뉴스 데이터 Fetch 및 표시 함수
    async function fetchNews(keyword, sort) {
        showLoading(newsList); // 뉴스 로딩 표시
        try {
            const response = await fetch(`${BACKEND_BASE_URL}/news/summaries?q=${encodeURIComponent(keyword)}&sort=${sort}`);
            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.detail || data.error || '뉴스를 불러오지 못했습니다.';
                newsList.innerHTML = `<li class="error-message">오류: ${errorMessage}</li>`;
                console.error('뉴스 API 오류:', data);
                return;
            }

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
            previousNewsHtml = newsList.innerHTML; // 뉴스 결과 저장

        } catch (error) {
            console.error('뉴스 검색 중 오류 발생:', error);
            newsList.innerHTML = `<li class="error-message">오류가 발생했습니다: ${error.message}</li>`;
        }
    }

    // 9. 유튜브 데이터 Fetch 및 표시 함수
    async function fetchYoutube(keyword) {
        showLoading(ytList); // 유튜브 로딩 표시
        try {
            const response = await fetch(`${BACKEND_BASE_URL}/youtube-summaries?keyword=${encodeURIComponent(keyword)}`);
            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.detail || data.error || '유튜브 요약을 불러오지 못했습니다.';
                ytList.innerHTML = `<li class="error-message">오류: ${errorMessage}</li>`;
                console.error('유튜브 API 오류:', data);
                return;
            }

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
                // 유튜브 영상 링크 형식 수정
                titleLink.href = `https://www.youtube.com/watch?v=${item.video_id}`;
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
            previousYtHtml = ytList.innerHTML; // 유튜브 결과 저장

        } catch (error) {
            console.error('유튜브 검색 중 오류 발생:', error);
            ytList.innerHTML = `<li class="error-message">오류가 발생했습니다: ${error.message}</li>`;
        }
    }

    // 10. 검색 버튼 클릭 이벤트 리스너
    searchBtn.addEventListener('click', () => {
        const keyword = keywordInput.value.trim();
        const sort = sortSelect.value;

        if (keyword === '') {
            alert('검색어를 입력하세요.');
            return;
        }

        fetchNews(keyword, sort);
        fetchYoutube(keyword);

        setSectionVisibility(true); // 새 검색 시 모든 섹션 다시 보이게
        finalSummaryDiv.innerHTML = ''; // 새 검색 시 이전 최종 요약 결과 지우기
        resetAudioPlayer(); // 오디오 플레이어 초기화 및 숨기기
    });

    // 11. 검색 입력창에서 Enter 키 누르면 검색 버튼 클릭 효과
    keywordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    // 12. "선택한 본문 재요약" 버튼 이벤트 리스너
    reSummarizeBtn.addEventListener('click', async () => {
        finalSummaryDiv.innerHTML = '<div class="loading">재요약 중입니다...</div>'; // 최종 요약 영역에 로딩 표시
        reSummarizeBtn.disabled = true; // 재요약 버튼 비활성화

        setSectionVisibility(false); // 검색 및 결과 섹션 숨기기
        resetAudioPlayer(); // 재요약 시작 시 오디오 플레이어 초기화 및 숨기기

        const selectedNews = Array.from(document.querySelectorAll('.news-checkbox:checked'))
            .map(cb => cb.closest('.news-card').dataset.original);

        const selectedYt = Array.from(document.querySelectorAll('.yt-checkbox:checked'))
            .map(cb => cb.closest('.yt-card').dataset.original);

        const selectedOriginals = [...selectedNews, ...selectedYt].filter(Boolean);

        if (selectedOriginals.length === 0) {
            alert('최소 하나 이상의 본문을 선택하세요!');
            setSectionVisibility(true); // 선택된 본문이 없을 경우 다시 보이게
            finalSummaryDiv.innerHTML = ''; // 로딩 메시지 지우기
            reSummarizeBtn.disabled = false; // 버튼 재활성화
            return;
        }

        try {
            const response = await fetch(`${BACKEND_BASE_URL}/summarize-originals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ originals: selectedOriginals })
            });

            const contentType = response.headers.get('content-type') || '';

            if (!contentType.includes('application/json')) {
                const text = await response.text();
                finalSummaryDiv.innerHTML = `
                    <div class="final-summary-card error-card">
                        <h3>오류 발생</h3>
                        <p>서버로부터 유효하지 않은 응답을 받았습니다.</p>
                        <pre>${text.slice(0, 500)}</pre>
                        <button id="backToPreviousBtn" class="back-btn">이전 결과로 돌아가기</button>
                        <button id="startNewSearchBtn" class="back-btn" style="margin-left: 10px;">새로운 검색</button>
                    </div>`;
            } else {
                const result = await response.json();

                if (!response.ok) {
                    const errorMessage = result.detail || result.summary || '재요약 중 알 수 없는 오류 발생';
                    finalSummaryDiv.innerHTML = `
                        <div class="final-summary-card error-card">
                            <h3>재요약 오류</h3>
                            <p>${errorMessage}</p>
                            <button id="backToPreviousBtn" class="back-btn">이전 결과로 돌아가기</button>
                            <button id="startNewSearchBtn" class="back-btn" style="margin-left: 10px;">새로운 검색</button>
                        </div>`;
                } else {
                    // 성공적으로 요약 결과를 받았을 때
                    finalSummaryDiv.innerHTML = `
                        <div class="final-summary-card">
                            <h3>최종 요약 결과</h3>
                            <p>${result.summary || "요약 결과가 없습니다."}</p>
                            <div class="audio-controls">
                                </div>
                            <button id="backToPreviousBtn" class="back-btn">이전 결과로 돌아가기</button>
                            <button id="startNewSearchBtn" class="back-btn" style="margin-left: 10px;">새로운 검색</button>
                        </div>`;

                    // 오디오 URL이 있으면 오디오 플레이어 설정 및 표시
                    if (result.audio_url && audioPlayer) {
                        const fullAudioUrl = BACKEND_BASE_URL + result.audio_url; // 완전한 URL 생성
                        audioPlayer.src = fullAudioUrl;
                        audioPlayer.load(); // 새 소스 로드
                        audioPlayer.style.display = 'block'; // 오디오 플레이어 보이게
                        audioPlayer.play().catch(e => console.error("오디오 자동 재생 실패:", e)); // 자동 재생 시도
                    } else if (audioPlayer) {
                        resetAudioPlayer(); // 오디오 URL이 없으면 숨김
                    }
                }
            }

            // '이전 결과로 돌아가기' 버튼 이벤트 리스너 추가
            document.getElementById('backToPreviousBtn').addEventListener('click', handleBackToPrevious);
            // '새로운 검색' 버튼 이벤트 리스너 추가
            document.getElementById('startNewSearchBtn').addEventListener('click', handleStartNewSearch);

            // 최종 요약 결과가 표시된 후 해당 섹션으로 스크롤 이동
            finalSummaryDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            console.error('재요약 요청 중 오류 발생:', error);
            finalSummaryDiv.innerHTML = `
                <div class="final-summary-card error-card">
                    <h3>재요약 중 오류 발생</h3>
                    <p>네트워크 문제 또는 서버 응답 오류: ${error.message}</p>
                    <button id="backToPreviousBtn" class="back-btn">이전 결과로 돌아가기</button>
                    <button id="startNewSearchBtn" class="back-btn" style="margin-left: 10px;">새로운 검색</button>
                </div>`;

            // 오류 발생 시에도 스크롤
            finalSummaryDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // 오류 발생 시에도 '이전 결과로 돌아가기'와 '새로운 검색' 버튼 이벤트 리스너를 다시 연결
            document.getElementById('backToPreviousBtn').addEventListener('click', handleBackToPrevious);
            document.getElementById('startNewSearchBtn').addEventListener('click', handleStartNewSearch);

        } finally {
            reSummarizeBtn.disabled = false; // 재요약 버튼 활성화
        }
    });

    // 13. 체크박스 변경 시 재요약 버튼의 표시 여부 및 오디오 플레이어 초기화
    document.addEventListener('change', (event) => {
        if (event.target.classList.contains('summary-checkbox')) {
            const anyChecked = document.querySelectorAll('.summary-checkbox:checked').length > 0;
            reSummarizeBtn.style.display = anyChecked ? 'block' : 'none';

            // 체크박스 선택 해제 시 최종 요약 및 오디오 플레이어 숨김/초기화
            if (!anyChecked) {
                finalSummaryDiv.innerHTML = '';
                resetAudioPlayer();
            }
        }
    });

    // 14. 전체 선택/해제 버튼 이벤트 리스너
    document.getElementById('selectAllNews').addEventListener('click', () => {
        const allNewsCheckboxes = document.querySelectorAll('.news-checkbox');
        const allChecked = Array.from(allNewsCheckboxes).every(cb => cb.checked); // 모두 체크되어 있는지 확인
        allNewsCheckboxes.forEach(cb => cb.checked = !allChecked); // 현재 상태의 반대로 토글

        // 체크박스 상태 변경 후 재요약 버튼 가시성 업데이트
        const anyChecked = document.querySelectorAll('.summary-checkbox:checked').length > 0;
        reSummarizeBtn.style.display = anyChecked ? 'block' : 'none';
    });

    document.getElementById('selectAllYt').addEventListener('click', () => {
        const allYtCheckboxes = document.querySelectorAll('.yt-checkbox');
        const allChecked = Array.from(allYtCheckboxes).every(cb => cb.checked); // 모두 체크되어 있는지 확인
        allYtCheckboxes.forEach(cb => cb.checked = !allChecked); // 현재 상태의 반대로 토글

        // 체크박스 상태 변경 후 재요약 버튼 가시성 업데이트
        const anyChecked = document.querySelectorAll('.summary-checkbox:checked').length > 0;
        reSummarizeBtn.style.display = anyChecked ? 'block' : 'none';
    });


    // 15. 페이지 로드 시 초기 상태 설정
    reSummarizeBtn.style.display = 'none'; // 재요약 버튼 초기 숨김
    resetAudioPlayer(); // 오디오 플레이어 초기 숨김
});






