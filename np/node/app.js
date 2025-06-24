const path = require('path');
const express = require('express');
const ejs = require('ejs');
const mainRouter = require('./routes/maincontroller');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. 뷰 엔진 설정 (절대 경로 명시)
const viewsPath = path.join(__dirname, '../views');
app.set('views', viewsPath);
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');

// 2. 정적 파일 서빙 (public 경로 확인)
app.use(express.static(path.join(__dirname, '../public')));

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우터 연결
app.use('/', mainRouter);

// 3. 404 핸들러 (파일명 일치 검증)
app.use((req, res) => {
  res.status(404).render('404.html', { title: '404 - 페이지 없음' }); // 확장자 명시
});

// 4. 전역 에러 핸들러 (뷰 파일 존재 확인)
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(500).render('500.html', { // 확장자 명시
    title: '500 - 서버 오류',
    message: err.message || '서버 내부 오류가 발생했습니다.'
  });
});

// 5. 서버 시작 전 경로 검증
console.log('Views path:', viewsPath); // 경로 로깅
app.listen(PORT, '0.0.0.0', () => {
  console.log(`서버가 http://localhost:${PORT}에서 시작되었습니다.`);
});