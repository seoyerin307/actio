const express = require('express');
const router = express.Router();
const axios = require('axios');

// FastAPI 서버 주소
const FASTAPI_URL = 'http://13.54.187.196:8000';

// 메인 페이지
router.get('/', (req, res) => {
  res.render('index', { title: '통합 미디어 요약 서비스' });
});

// 뉴스 요약 API (FastAPI 연동)
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

// 유튜브 요약 API (FastAPI 연동)
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

module.exports = router;
