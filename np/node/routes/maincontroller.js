const express = require('express');
const router = express.Router();
const axios = require('axios');
const http = require('http'); // 추가
const https = require('https'); // 추가

const FASTAPI_URL = 'http://3.25.208.15:8080';

// Axios 인스턴스 생성 (Keep-Alive 설정)
const apiClient = axios.create({
  baseURL: FASTAPI_URL,
  timeout: 5000,
  httpAgent: new http.Agent({ keepAlive: true }), // HTTP 연결 재사용
  httpsAgent: new https.Agent({ keepAlive: true }) // HTTPS 연결 재사용
});

// 메인 페이지
router.get('/', (req, res) => {
  res.render('index', { title: '통합 미디어 요약 서비스' });
});

// 뉴스 요약 API (수정됨)
router.get('/summaries', async (req, res) => {
  try {
    const { q, sort = "sim" } = req.query; // 기본값 설정
    
    // 한글 검색어 인코딩
    const encodedQ = encodeURIComponent(q);
    
    const response = await apiClient.get('/news/summaries', {
      params: { q: encodedQ, sort }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('뉴스 요약 API 오류:', error.response?.data || error.message);
    res.status(500).json({ 
      error: '뉴스 요약 중 오류 발생',
      detail: error.response?.data || error.message
    });
  }
});

// 유튜브 요약 API (수정됨)
router.get('/youtube-summaries', async (req, res) => {
  try {
    const { keyword } = req.query;
    const response = await apiClient.get('/youtube/summarize', {
      params: { keyword }
    });
    res.json(response.data);
  } catch (error) {
    console.error('유튜브 요약 API 오류:', error.response?.data || error.message);
    res.status(500).json({ 
      error: '유튜브 요약 중 오류 발생',
      detail: error.response?.data || error.message
    });
  }
});

// 재요약 API (수정됨)
router.post('/summarize-originals', async (req, res) => {
  try {
    const { originals } = req.body;
    const response = await apiClient.post('/summarize-originals', { originals });
    res.json(response.data);
  } catch (error) {
    console.error('재요약 API 오류:', error.response?.data || error.message);
    res.status(500).json({ 
      summary: '재요약 중 오류 발생',
      detail: error.response?.data || error.message
    });
  }
});

module.exports = router;