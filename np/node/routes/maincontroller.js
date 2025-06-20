const express = require('express');
const router = express.Router();

// 메인 페이지
router.get('/', (req, res) => {
  res.render('index', { title: '통합 미디어 요약 서비스' });
});

// 뉴스 요약 API (예시)
router.get('/summaries', (req, res) => {
  const { q, sort } = req.query;
  if (!q) return res.json([]);
  res.json([
    {
      title: "뉴스 예시 제목",
      summary: "이것은 뉴스 요약 예시입니다.",
      url: "https://news.example.com"
    }
  ]);
});

// 유튜브 요약 API (예시)
router.get('/youtube-summaries', (req, res) => {
  const { keyword } = req.query;
  if (!keyword) return res.json([]);
  res.json([
    {
      video_id: "dQw4w9WgXcQ",
      title: "유튜브 예시 제목",
      summary: "이것은 유튜브 요약 예시입니다."
    }
  ]);
});

module.exports = router;