document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM 요소 선택
    const searchBtn = document.getElementById('searchBtn');
    const keywordInput = document.getElementById('keywordInput');
    const sortSelect = document.getElementById('sortSelect'); // 뉴스 정렬 기준
    const newsList = document.getElementById('newsList'); // 뉴스 결과 표시 UL
    const ytList = document.getElementById('ytList');     // 유튜브 결과 표시 UL
    const reSummarizeBtn = document.getElementById('reSummarizeBtn'); // 재요약 버튼
    const finalSummaryDiv = document.getElementById('finalSummary'); // 최종 요약 결과 표시 DIV

    const resultFlexContainer = document.querySelector('.result-flex'); // 뉴스/유튜브 결과를 담는 컨테이너 (레이아웃 조절용)
    const searchBar = document.querySelector('.search-bar'); // 검색 바 (레이아웃 조절용)

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

    // 4. 뉴스 데이터 Fetch 및 표시 함수
    async function fetchNews(keyword, sort) {
        showLoading(newsList); // 뉴스 로딩 표시
        try {
            // API 호출 URL에 BACKEND_BASE_URL을 추가
            const response = await fetch(`${BACKEND_BASE_URL}/news/summaries?q=${encodeURIComponent(keyword)}&sort=${sort}`);
            const data = await response.json(); // 응답을 JSON으로 파싱

            if (!response.ok) {
                // HTTP 오류 응답 (4xx, 5xx) 처리
                const errorMessage = data.detail || data.error || '뉴스를 불러오지 못했습니다.';
                newsList.innerHTML = `<li class="error-message">오류: ${errorMessage}</li>`;
                console.error('뉴스 API 오류:', data);
                return;
            }

            if (!Array.isArray(data) || data.length === 0) {
                newsList.innerHTML = `<li>검색 결과가 없습니다.</li>`;
                return;
            }

            newsList.innerHTML = ''; // 기존 로딩 메시지 지우기
            data.forEach((item) => {
                const li = document.createElement('li');
                li.className = 'news-card';
                // 재요약을 위해 원본 내용을 dataset에 저장 (description이 없으면 빈 문자열)
                li.dataset.original = item.description || "";

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'news-checkbox summary-checkbox'; // 공통 클래스 추가
                checkbox.checked = false; // 초기에는 체크 해제

                const titleLink = document.createElement('a');
                titleLink.href = item.url;
                titleLink.target = '_blank'; // 새 탭에서 열기
                titleLink.textContent = item.title;
                titleLink.className = 'news-title';

                const summaryP = document.createElement('p');
                summaryP.className = 'summary';
                summaryP.innerHTML = item.summary; // HTML 태그가 포함될 수 있으므로 innerHTML 사용

                li.appendChild(checkbox);
                li.appendChild(titleLink);
                li.appendChild(summaryP);
                newsList.appendChild(li);
            });
            // 뉴스 결과를 불러온 후 previousNewsHtml에 저장 (이전 화면 복원용)
            previousNewsHtml = newsList.innerHTML;

        } catch (error) {
            // 네트워크 오류 등 fetch 자체의 오류
            console.error('뉴스 검색 중 오류 발생:', error);
            newsList.innerHTML = `<li class="error-message">오류가 발생했습니다: ${error.message}</li>`;
        }
    }

    // 5. 유튜브 데이터 Fetch 및 표시 함수
    async function fetchYoutube(keyword) {
        showLoading(ytList); // 유튜브 로딩 표시
        try {
            // API 호출 URL에 BACKEND_BASE_URL을 추가
            const response = await fetch(`${BACKEND_BASE_URL}/youtube-summaries?keyword=${encodeURIComponent(keyword)}`);
            const data = await response.json(); // 응답을 JSON으로 파싱

            if (!response.ok) {
                // HTTP 오류 응답 (4xx, 5xx) 처리
                const errorMessage = data.detail || data.error || '유튜브 요약을 불러오지 못했습니다.';
                ytList.innerHTML = `<li class="error-message">오류: ${errorMessage}</li>`;
                console.error('유튜브 API 오류:', data);
                return;
            }

            if (!Array.isArray(data) || data.length === 0) {
                ytList.innerHTML = `<li>검색 결과가 없습니다.</li>`;
                return;
            }

            ytList.innerHTML = ''; // 기존 로딩 메시지 지우기
            data.forEach((item) => {
                const li = document.createElement('li');
                li.className = 'yt-card';
                // 재요약을 위해 원본 내용을 dataset에 저장 (transcript가 없으면 빈 문자열)
                li.dataset.original = item.transcript || "";

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'yt-checkbox summary-checkbox'; // 공통 클래스 추가
                checkbox.checked = false; // 초기에는 체크 해제

                const titleLink = document.createElement('a');
                // 유튜브 영상 링크: 올바른 유튜브 영상 링크 형식으로 수정
                titleLink.href = `https://www.youtube.com/watch?v=${item.video_id}`; // 수정!
                titleLink.target = '_blank'; // 새 탭에서 열기
                titleLink.textContent = item.title;
                titleLink.className = 'yt-title';

                const summaryP = document.createElement('p');
                summaryP.className = 'yt-summary';
                summaryP.innerHTML = item.summary; // HTML 태그가 포함될 수 있으므로 innerHTML 사용

                li.appendChild(checkbox);
                li.appendChild(titleLink);
                li.appendChild(summaryP);
                ytList.appendChild(li);
            });
            // 유튜브 결과를 불러온 후 previousYtHtml에 저장 (이전 화면 복원용)
            previousYtHtml = ytList.innerHTML;

        } catch (error) {
            // 네트워크 오류 등 fetch 자체의 오류
            console.error('유튜브 검색 중 오류 발생:', error);
            ytList.innerHTML = `<li class="error-message">오류가 발생했습니다: ${error.message}</li>`;
        }
    }

    // 6. 검색 버튼 클릭 이벤트 리스너
    searchBtn.addEventListener('click', () => {
        const keyword = keywordInput.value.trim();
        const sort = sortSelect.value; // 뉴스 정렬 기준

        if (keyword === '') {
            alert('검색어를 입력하세요.');
            return;
        }

        fetchNews(keyword, sort);     // 뉴스 검색 시작
        fetchYoutube(keyword);      // 유튜브 검색 시작

        // 새 검색 시작 시 모든 섹션 다시 보이게 설정 (초기 상태로 복원)
        if (resultFlexContainer) {
            resultFlexContainer.style.display = 'flex';
        }
        if (searchBar) {
            searchBar.style.display = 'flex';
        }
        if (reSummarizeBtn) {
            reSummarizeBtn.style.display = 'block'; // 재요약 버튼 다시 보이게
        }
        finalSummaryDiv.innerHTML = ''; // 새 검색 시 이전 최종 요약 결과 지우기
    });

    // 7. 검색 입력창에서 Enter 키 누르면 검색 버튼 클릭 효과
    keywordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click(); // 검색 버튼 클릭 이벤트 발생
        }
    });

    // 8. "선택한 본문 재요약" 버튼 이벤트 리스너
    reSummarizeBtn.addEventListener('click', async () => {
        showLoading(finalSummaryDiv); // 최종 요약 영역에 로딩 표시
        reSummarizeBtn.disabled = true; // 재요약 버튼 비활성화

        // 재요약 시작 시 다른 섹션들 숨기기
        if (resultFlexContainer) {
            resultFlexContainer.style.display = 'none';
        }
        if (searchBar) {
            searchBar.style.display = 'none';
        }
        if (reSummarizeBtn) {
            reSummarizeBtn.style.display = 'none'; // 재요약 버튼 숨기기
        }

        // 체크된 뉴스 본문과 유튜브 본문 가져오기
        const selectedNews = Array.from(document.querySelectorAll('.news-checkbox:checked'))
            .map(cb => cb.closest('.news-card').dataset.original); // dataset.original에 저장된 원본 내용

        const selectedYt = Array.from(document.querySelectorAll('.yt-checkbox:checked'))
            .map(cb => cb.closest('.yt-card').dataset.original); // dataset.original에 저장된 원본 내용

        // 뉴스 본문과 유튜브 본문을 합쳐서 필터링 (빈 문자열 제거)
        const selectedOriginals = [...selectedNews, ...selectedYt].filter(Boolean);

        if (selectedOriginals.length === 0) {
            alert('최소 하나 이상의 본문을 선택하세요!');
            // 선택된 본문이 없을 경우 숨겼던 섹션들을 다시 보이게
            if (resultFlexContainer) {
                resultFlexContainer.style.display = 'flex';
            }
            if (searchBar) {
                searchBar.style.display = 'flex';
            }
            if (reSummarizeBtn) {
                reSummarizeBtn.style.display = 'block'; // 재요약 버튼 다시 보이게
            }
            finalSummaryDiv.innerHTML = ''; // 로딩 메시지 지우기
            reSummarizeBtn.disabled = false; // 버튼 재활성화
            return;
        }

        try {
            // API 호출 URL에 BACKEND_BASE_URL을 추가!
            const response = await fetch(`${BACKEND_BASE_URL}/summarize-originals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ originals: selectedOriginals })
            });

            const contentType = response.headers.get('content-type') || '';
            // 서버 응답이 JSON이 아닐 경우 (예: 서버 에러 페이지 HTML)
            if (!contentType.includes('application/json')) {
                const text = await response.text();
                finalSummaryDiv.innerHTML = `<div class="final-summary-card error-card">
                                                 <h3>오류 발생</h3>
                                                 <p>서버로부터 유효하지 않은 응답을 받았습니다.</p>
                                                 <pre>${text.slice(0, 500)}</pre>
                                                 <button id="backToPreviousBtn" class="back-btn">이전 결과로 돌아가기</button>
                                                 <button id="startNewSearchBtn" class="back-btn" style="margin-left: 10px;">새로운 검색</button>
                                             </div>`;
            } else {
                const result = await response.json(); // JSON 응답 파싱

                // FastAPI에서 정의한 응답 구조에 따라 에러 또는 성공 처리
                if (!response.ok) { // HTTP 상태 코드가 200번대가 아닐 경우
                    const errorMessage = result.detail || result.summary || '재요약 중 알 수 없는 오류 발생';
                    finalSummaryDiv.innerHTML = `
                        <div class="final-summary-card error-card">
                            <h3>재요약 오류</h3>
                            <p>${errorMessage}</p>
                            <button id="backToPreviousBtn" class="back-btn">이전 결과로 돌아가기</button>
                            <button id="startNewSearchBtn" class="back-btn" style="margin-left: 10px;">새로운 검색</button>
                        </div>
                    `;
                } else { // 재요약 성공
                    let audioPlayButtonHtml = '';
                    if (result.audio_url) {
                        // FastAPI에서 받은 audio_url을 data-audio-url 속성에 저장 (상대 경로)
                        audioPlayButtonHtml = `<button id="playSummaryAudioBtn" class="play-audio-btn" data-audio-url="${result.audio_url}">🔊 요약 듣기</button>`;
                    } else {
                        audioPlayButtonHtml = `<p class="warning-text">음성 생성에 실패했거나 음성 URL이 없습니다.</p>`;
                    }

                    finalSummaryDiv.innerHTML = `
                        <div class="final-summary-card">
                            <h3>최종 요약 결과</h3>
                            <p>${result.summary || "요약 결과가 없습니다."}</p>
                            <div class="audio-controls">
                                ${audioPlayButtonHtml}
                            </div>
                            <button id="backToPreviousBtn" class="back-btn">이전 결과로 돌아가기</button>
                            <button id="startNewSearchBtn" class="back-btn" style="margin-left: 10px;">새로운 검색</button>
                        </div>
                    `;

                    // 음성 재생 버튼 이벤트 리스너 추가
                    const playAudioBtn = document.getElementById('playSummaryAudioBtn');
                    if (playAudioBtn) {
                        playAudioBtn.addEventListener('click', () => {
                            const relativeAudioUrl = playAudioBtn.dataset.audioUrl; // data-audio-url에서 상대 URL 가져오기
                            if (relativeAudioUrl) {
                                // **핵심 수정 부분:** BACKEND_BASE_URL을 붙여서 완전한 URL을 만듭니다.
                                const fullAudioUrl = BACKEND_BASE_URL + relativeAudioUrl;
                                
                                console.log("재생 시도할 최종 오디오 URL:", fullAudioUrl); // 디버깅용 로그

                                const audio = new Audio(fullAudioUrl); // 완전한 URL 사용
                                audio.play().catch(error => {
                                    console.error("오디오 재생 실패:", error);
                                    alert("오디오 재생에 실패했습니다: " + error.message + "\nURL: " + fullAudioUrl); // URL도 함께 표시하여 디버깅 용이하게
                                });
                            } else {
                                alert("재생할 오디오 URL이 없습니다.");
                            }
                        });
                    }
                }
            }

            // '이전 결과로 돌아가기' 버튼 이벤트 리스너 추가 (오류/성공 모두)
            document.getElementById('backToPreviousBtn').addEventListener('click', () => {
                // 숨겼던 섹션들을 이전 상태로 복원
                if (resultFlexContainer) {
                    resultFlexContainer.style.display = 'flex';
                }
                if (searchBar) {
                    searchBar.style.display = 'flex';
                }
                if (reSummarizeBtn) {
                    reSummarizeBtn.style.display = 'block'; // 재요약 버튼 다시 보이게
                }
                finalSummaryDiv.innerHTML = ''; // 최종 요약 결과 지우기

                // 저장해 둔 이전 뉴스/유튜브 HTML로 복원
                newsList.innerHTML = previousNewsHtml;
                ytList.innerHTML = previousYtHtml;

                // 체크박스 상태도 복원 (선택 해제)
                document.querySelectorAll('.summary-checkbox').forEach(cb => {
                    cb.checked = false;
                });

                // 스크롤도 다시 위로
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // '새로운 검색' 버튼 이벤트 리스너 추가 (기존 기능 유지)
            document.getElementById('startNewSearchBtn').addEventListener('click', () => {
                // 모든 섹션 다시 보이게
                if (resultFlexContainer) {
                    resultFlexContainer.style.display = 'flex';
                }
                if (searchBar) {
                    searchBar.style.display = 'flex';
                }
                if (reSummarizeBtn) {
                    reSummarizeBtn.style.display = 'block'; // 재요약 버튼 다시 보이게
                }
                finalSummaryDiv.innerHTML = ''; // 최종 요약 결과 지우기
                keywordInput.value = ''; // 검색어 입력창 초기화
                newsList.innerHTML = ''; // 뉴스 목록 초기화
                ytList.innerHTML = ''; // 유튜브 목록 초기화

                // 이전 데이터도 초기화
                previousNewsHtml = '';
                previousYtHtml = '';

                // 스크롤도 다시 위로
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // 최종 요약 결과가 표시된 후 해당 섹션으로 스크롤 이동
            finalSummaryDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            // 네트워크 오류 등 fetch 자체의 오류
            console.error('재요약 요청 중 오류 발생:', error);
            finalSummaryDiv.innerHTML = `<div class="final-summary-card error-card">
                                             <h3>재요약 중 오류 발생</h3>
                                             <p>네트워크 문제 또는 서버 응답 오류: ${error.message}</p>
                                             <button id="backToPreviousBtn" class="back-btn">이전 결과로 돌아가기</button>
                                             <button id="startNewSearchBtn" class="back-btn" style="margin-left: 10px;">새로운 검색</button>
                                         </div>`;
            // 에러 발생 시에도 스크롤 (사용자에게 오류 메시지 보이기 위함)
            finalSummaryDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // 오류 발생 시에도 '이전 결과로 돌아가기'와 '새로운 검색' 버튼 이벤트 리스너를 다시 연결해야 함
            // (위에서 innerHTML을 교체했으므로 기존 리스너가 사라짐)
            // 중복 코드를 줄이기 위해 함수로 만들거나, 상위 scope에서 처리하는 것이 좋지만,
            // 현재 구조에서는 다시 연결하는 방식으로 처리합니다.
            // **주의:** 실제 프로덕션 코드에서는 이 중복 부분을 개선하는 것이 좋습니다.
            document.getElementById('backToPreviousBtn').addEventListener('click', () => {
                if (resultFlexContainer) resultFlexContainer.style.display = 'flex';
                if (searchBar) searchBar.style.display = 'flex';
                if (reSummarizeBtn) reSummarizeBtn.style.display = 'block';
                finalSummaryDiv.innerHTML = '';
                newsList.innerHTML = previousNewsHtml;
                ytList.innerHTML = previousYtHtml;
                document.querySelectorAll('.summary-checkbox').forEach(cb => cb.checked = false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            document.getElementById('startNewSearchBtn').addEventListener('click', () => {
                if (resultFlexContainer) resultFlexContainer.style.display = 'flex';
                if (searchBar) searchBar.style.display = 'flex';
                if (reSummarizeBtn) reSummarizeBtn.style.display = 'block';
                finalSummaryDiv.innerHTML = '';
                keywordInput.value = '';
                newsList.innerHTML = '';
                ytList.innerHTML = '';
                previousNewsHtml = '';
                previousYtHtml = '';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

        } finally {
            reSummarizeBtn.disabled = false; // 재요약 버튼 활성화 (성공, 실패 관계없이)
        }
    });

    // 9. 페이지 로드 시 재요약 버튼 초기 상태 설정 (숨기기)
    // 이 부분의 주석 번호가 11에서 9로 변경되었습니다.
    reSummarizeBtn.style.display = 'none';
});