const path = require('path');
require('dotenv').config();
const express = require('express');

const sumRouter = require('./routes/sum');
const sum2Router = require('./routes/sum2');
const sumOpenAIRouter = require('./routes/sum_openai');
const mainRouter = require('./routes/maincontroller'); // 위치 변경

const app = express();
const PORT = 3000;

// 뷰 엔진 설정 (가장 먼저 설정)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

// 미들웨어 순서 조정
app.use(express.static(path.join(__dirname, 'public'))); // 정적 파일 서비스
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우터 연결
app.use('/sum', sumRouter);
app.use('/sum2', sum2Router);
app.use('/sum-openai', sumOpenAIRouter);
app.use('/', mainRouter); // 루트 라우터는 마지막에

app.listen(3000, () => {
  console.log(`서버 시작됨 http://localhost:3000`);
});