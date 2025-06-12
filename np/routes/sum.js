const express = require('express');
const axios = require('axios');
const { decode } = require('html-entities');

const router = express.Router();

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const KAGI_API_KEY = process.env.KAGI_API_KEY;

async function searchNaverNews(query = '미국증시', display = 5) {
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${display}`;

  try {
    const response = await axios.get(url, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      }
    });

    return response.data.items.map(item => ({
      title: decode(item.title),
      link: item.originallink || item.link
    }));
  } catch (error) {
    console.error('네이버 뉴스 API 오류:', error.message);
    return [];
  }
}

async function summarizeWithKagi(url) {
  const apiUrl = 'https://kagi.com/api/v0/summarize';

  console.log(`[DEBUG] Kagi API 요청 URL: ${url}`);

  try {
    const response = await axios.get(apiUrl, {
      headers: { Authorization: `Bot ${KAGI_API_KEY}` },
      params: {
        url: url,          // **encodeURIComponent 제거**
        target_language: 'KO'
      }
    });
    return response.data.data.output;
  } catch (error) {
    console.error(`Kagi 요약 실패 (${url}):`, error.message);
    return '(요약 실패)';
  }
}

router.post('/', async (req, res) => {
  const query = req.body.q || '미국증시';
  const display = 5;

  const newsList = await searchNaverNews(query, display);

  if (newsList.length === 0) return res.json([]);

  const summaries = await Promise.all(newsList.map(async ({ title, link }) => {
    const summary = await summarizeWithKagi(link);
    return { title, link, summary };
  }));

  res.json(summaries);
});

module.exports = router;