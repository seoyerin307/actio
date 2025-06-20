const path = require('path');
const express = require('express');
const ejs = require('ejs');
const mainRouter = require('./routes/maincontroller');
const errorHandler = require('./middleware/errorHandler'); // 추가된 에러 핸들러

const app = express();
const PORT = process.env.PORT || 3000; // 환경변수 포트 지원

// 뷰 엔진 설정
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', ejs.renderFile);

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우터 연결
app.use('/', mainRouter);

// 404 핸들러 (추가)
app.use((req, res) => {
  res.status(404).render('404');
});

// 전역 에러 핸들러
app.use(errorHandler); // 분리된 핸들러 사용

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`서버가 http://localhost:${PORT}에서 시작되었습니다.`);
});