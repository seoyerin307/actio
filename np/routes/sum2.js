const express = require('express');
const axios = require('axios');
const { OpenAI } = require('openai');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchNews(query, pageSize = 2) {
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${process.env.NEWSAPI_API_KEY}`;
  try {
    const response = await axios.get(url);
    return response.data.articles;
  } catch (err) {
    console.error('NewsAPI 오류:', err.message);
    return [];
  }
}

async function summarizeWithOpenAI(content) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: '뉴스 기사를 한국어로 요약' },
        { role: 'user', content }
      ],
      temperature: 0.7,
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.error('OpenAI 요약 실패:', err.message);
    return '(요약 실패)';
  }
}

router.post('/', async (req, res) => {
  console.log('요청 들어옴:', req.body);
  const query = req.body.q;
  console.log('쿼리:', query);
  const articles = await fetchNews(query);
  console.log('뉴스 기사:', articles);

  const results = await Promise.all(articles.map(async (article) => {
    const content = article.content || article.description || article.title;
    console.log('기사 내용:', content);
    const summary = await summarizeWithOpenAI(content);
    console.log('요약 결과:', summary);
    return {
      title: article.title,
      url: article.url,
      summary,
    };
  }));

  console.log('최종 결과:', results);
  res.json(results);
});

module.exports = router;