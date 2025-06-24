const express = require('express');
const router = express.Router();
const axios = require('axios');

const FASTAPI_URL = 'http://3.25.208.15:8080';  // FastAPI 기본 주소

// 메인 페이지
router.get('/', (req, res) => {
  res.render('index', { title: '통합 미디어 요약 서비스' });
});

// 뉴스 요약 API
router.get('/summaries', async (req, res) => {
  try {
    const { q, sort } = req.query;
    const response = await axios.get(`${FASTAPI_URL}/news/summaries`, {
      params: { q, sort }
    });
    res.json(response.data);
  } catch (error) {
    console.error('뉴스 요약 API 오류:', error.message);
    res.status(500).json({ error: '뉴스 요약 중 오류 발생' });
  }
});

// 유튜브 요약 API
router.get('/youtube-summaries', async (req, res) => {
  try {
    const { keyword } = req.query;
    const response = await axios.get(`${FASTAPI_URL}/youtube/summarize`, {
      params: { keyword }
    });
    res.json(response.data);
  } catch (error) {
    console.error('유튜브 요약 API 오류:', error.message);
    res.status(500).json({ error: '유튜브 요약 중 오류 발생' });
  }
});

// 재요약 API (수정된 부분)
router.post('/summarize-originals', async (req, res) => {
  try {
    const { originals } = req.body;
    // ✅ FASTAPI_URL 변수를 사용해 올바른 주소 지정
    const response = await axios.post(
      `${FASTAPI_URL}/summarize-originals`,
      { originals }
    );
    res.json(response.data);
  } catch (error) {
    console.error('재요약 API 오류:', error.message);
    res.status(500).json({ summary: '재요약 중 오류 발생' });
  }
});

module.exports = router;