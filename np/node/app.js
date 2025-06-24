const path = require('path');
const express = require('express');
const ejs = require('ejs');
const mainRouter = require('./routes/maincontroller');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. 뷰 엔진 설정 (HTML 확장자 + EJS)
app.engine('html', ejs.renderFile); // HTML 파일을 EJS 엔진으로 렌더링
app.set('view engine', 'html'); // 확장자 명시
app.set('views', path.join(__dirname, '../views')); // 뷰 디렉토리 설정

// 2. 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../public')));

// 3. 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. 라우터 연결
app.use('/', mainRouter);

// 5. 핸들러 수정 (확장자 제거)
app.use((req, res) => {
  res.status(404).render('404', { title: '404 - 페이지 없음' }); // '404'만 사용
});

app.use((err, req, res, next) => {
  res.status(500).render('500', { // '500'만 사용
    title: '500 - 서버 오류',
    message: err.message || '서버 내부 오류가 발생했습니다.'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`서버가 http://localhost:${PORT}에서 시작되었습니다.`);
});