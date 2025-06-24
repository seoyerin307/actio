const express = require('express');
const router = express.Router();
const axios = require('axios');
const http = require('http');
const https = require('https');

const FASTAPI_URL = 'http://3.25.208.15:8080';  // FastAPI 기본 주소

// Axios 인스턴스 생성 (keep-alive 적용)
const apiClient = axios.create({
  baseURL: FASTAPI_URL,
  timeout: 5000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

// 메인 페이지
router.get('/', (req, res) => {
  res.render('index', { title: '통합 미디어 요약 서비스' });
});

// 뉴스 요약 API
router.get('/summaries', async (req, res) => {
  const start = Date.now();
  try {
    const { q, sort } = req.query;
    const response = await apiClient.get('/news/summaries', {
      params: { q, sort }
    });
    console.log(`⏱️ FastAPI 응답 시간: ${Date.now() - start}ms`);
    res.json(response.data);
  } catch (error) {
    console.error('뉴스 요약 API 오류:', error.message);
    res.status(500).json({ error: '뉴스 요약 중 오류 발생' });
  }
});

// 유튜브 요약 API
router.get('/youtube-summaries', async (req, res) => {
  const start = Date.now();
  try {
    const { keyword } = req.query;
    const response = await apiClient.get('/youtube/summarize', {
      params: { keyword }
    });
    console.log(`⏱️ FastAPI 응답 시간: ${Date.now() - start}ms`);
    res.json(response.data);
  } catch (error) {
    console.error('유튜브 요약 API 오류:', error.message);
    res.status(500).json({ error: '유튜브 요약 중 오류 발생' });
  }
});

// 재요약 API
router.post('/summarize-originals', async (req, res) => {
  const start = Date.now();
  try {
    const { originals } = req.body;
    const response = await apiClient.post('/summarize-originals', { originals });
    console.log(`⏱️ FastAPI 응답 시간: ${Date.now() - start}ms`);
    res.json(response.data);
  } catch (error) {
    console.error('재요약 API 오류:', error.message);
    res.status(500).json({ summary: '재요약 중 오류 발생' });
  }
});

module.exports = router;