const path = require('path');
const express = require('express');
const ejs = require('ejs');
const mainRouter = require('./routes/maincontroller'); // 라우터 파일명에 맞게 수정

const app = express();
const PORT = 3000;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', ejs.renderFile);

app.use(express.static(path.join(__dirname, 'public')));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', mainRouter); 
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(500).send('서버 내부 오류');
});

app.listen(PORT, () => {
  console.log(`서버가 http://13.54.187.196:3000 에서 시작되었습니다.`);
});