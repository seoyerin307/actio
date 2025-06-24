const express = require('express');
const router = express.Router();
const axios = require('axios');
const http = require('http');
const https = require('https');

const FASTAPI_URL = 'http://3.25.208.15:8080';

// Axios 인스턴스 생성 (Keep-Alive 설정)
const apiClient = axios.create({
  baseURL: FASTAPI_URL,
  timeout: 60000, // 30초로 조정 (150000 → 30000)
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true })
});

// 메인 페이지
router.get('/', (req, res) => {
  res.render('index', { title: '통합 미디어 요약 서비스' });
});

// 뉴스 요약 API
router.get('/summaries', async (req, res) => {
  try {
    const { q, sort = "sim" } = req.query;
    
    // 필수 파라미터 검증
    if (!q) {
      return res.status(400).json({ error: '검색어(q)는 필수입니다.' });
    }
    
    // 중복 인코딩 제거 (클라이언트에서 이미 인코딩됨)
    // const encodedQ = encodeURIComponent(q); // 제거
    
    const response = await apiClient.get('/news/summaries', {
      params: { q, sort } // encodedQ → q로 변경
    });
    
    res.json(response.data);
  } catch (error) {
    // 전체 에러 스택 로깅
    console.error('뉴스 요약 API 오류:', error.stack || error.message);
    res.status(500).json({ 
      error: '뉴스 요약 중 오류 발생',
      detail: error.response?.data || error.message
    });
  }
});

// 유튜브 요약 API
router.get('/youtube-summaries', async (req, res) => {
  try {
    const { keyword } = req.query;
    
    // 필수 파라미터 검증
    if (!keyword) {
      return res.status(400).json({ error: '검색어(keyword)는 필수입니다.' });
    }
    
    // 엔드포인트 경로 오타 수정
    const response = await apiClient.get('/youtube-summaries', { // '/youtube/summarize' → '/youtube-summaries'
      params: { keyword }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('유튜브 요약 API 오류:', error.stack || error.message);
    res.status(500).json({ 
      error: '유튜브 요약 중 오류 발생',
      detail: error.response?.data || error.message
    });
  }
});

// 재요약 API
router.post('/summarize-originals', async (req, res) => {
  try {
    const { originals } = req.body;
    
    // 필수 파라미터 검증
    if (!originals || !Array.isArray(originals) || originals.length === 0) {
      return res.status(400).json({ error: '최소 하나 이상의 본문이 필요합니다.' });
    }
    
    const response = await apiClient.post('/summarize-originals', { originals });
    res.json(response.data);
  } catch (error) {
    console.error('재요약 API 오류:', error.stack || error.message);
    res.status(500).json({ 
      summary: '재요약 중 오류 발생',
      detail: error.response?.data || error.message
    });
  }
});

module.exports = router;