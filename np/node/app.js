const path = require('path');
const express = require('express');
const ejs = require('ejs');
const mainRouter = require('./routes/maincontroller');

const app = express();
const PORT = 3000;

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

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(500).send('서버 내부 오류');
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`서버가 http://13.54.187.196:3000에서 시작되었습니다.`);
});