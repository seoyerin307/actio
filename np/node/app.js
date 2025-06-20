const path = require('path');
const express = require('express');
const ejs = require('ejs');
const mainRouter = require('./routes/maincontroller');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// 뷰 엔진 설정
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우터 연결
app.use('/', mainRouter);

// 404 핸들러
app.use((req, res) => {
  res.status(404).render('404', { title: '404 - 페이지 없음' });
});

// 전역 에러 핸들러
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`서버가 http://localhost:${PORT}에서 시작되었습니다.`);
});