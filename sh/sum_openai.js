const express = require('express');
const axios = require('axios');
const { OpenAI } = require('openai');
const { decode } = require('html-entities');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

// 기사 2개만 가져오기
async function fetchNews(query, display = 2) {
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
      description: decode(item.description),
      url: item.originallink || item.link
    }));

  } catch (err) {
    console.error('네이버 뉴스 API 오류:', err.message);
    return [];
  }
}

// 요약 길이 크게 (최대 600 토큰)
async function summarizeWithOpenAI(content) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '뉴스 기사를 한국어로 매우 상세하고 깊이 있게 요약해 주세요. 가능한 한 많은 핵심 내용을 포함해 5~6문장 이상으로 작성 바랍니다.'
        },
        { role: 'user', content }
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    return response.choices[0].message.content;
  } catch (err) {
    console.error('OpenAI 요약 실패:', err.message);
    return '(요약 실패)';
  }
}

router.post('/', async (req, res) => {
  const query = req.body.q || '미국증시';
  const articles = await fetchNews(query, 2);

  if (!articles.length) return res.json([]);

  const results = await Promise.all(articles.map(async article => {
    const summary = await summarizeWithOpenAI(article.description || article.title);
    return {
      title: article.title,
      url: article.url,
      summary,
    };
  }));

  res.json(results);
});

module.exports = router;