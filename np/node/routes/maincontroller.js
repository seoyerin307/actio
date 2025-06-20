const express = require("express");
const router = express.Router();
const axios = require("axios");

const FASTAPI_BASE_URL = 'http://13.54.187.196:8080';

// 뉴스 요약 요청
router.get('/summaries', async (req, res) => {
    const { q, sort } = req.query;
    if (!q || typeof q !== 'string' || q.trim() === '') {
        return res.status(400).send('검색어(q) 파라미터가 필요합니다.');
    }
    try {
        const response = await axios.get(`${FASTAPI_BASE_URL}/summaries`, {
            params: { q, sort: sort || 'sim' }
        });
        res.json(response.data);
    } catch (error) {
        console.error('요약 조회 실패:', error.message);
        res.status(error.response?.status || 500).send(
            error.response?.data || '서버에서 뉴스 요약을 불러오는 데 실패했습니다.'
        );
    }
});

// 유튜브 영상 요약 요청
router.get('/youtube-summaries', async (req, res) => {
    const { keyword } = req.query;
    if (!keyword || typeof keyword !== 'string' || keyword.trim() === '') {
        return res.status(400).send('검색어(keyword) 파라미터가 필요합니다.');
    }
    try {
        const response = await axios.get(`${FASTAPI_BASE_URL}/summarize`, {
            params: { keyword }
        });
        res.json(response.data);
    } catch (error) {
        console.error('유튜브 요약 조회 실패:', error.message);
        res.status(error.response?.status || 500).send(
            error.response?.data || '서버에서 유튜브 요약을 불러오는 데 실패했습니다.'
        );
    }
});

// 음성 변환 요청
router.get('/tts', async (req, res) => {
    const { file_id } = req.query;
    if (!file_id || typeof file_id !== 'string' || file_id.trim() === '') {
        return res.status(400).send('file_id 파라미터가 필요합니다.');
    }
    try {
        const response = await axios.get(`${FASTAPI_BASE_URL}/tts`, {
            params: { file_id },
            responseType: 'arraybuffer'
        });

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': `inline; filename="${file_id}.mp3"`
        });
        res.send(response.data);
    } catch (error) {
        console.error('TTS 변환 실패:', error.message);
        res.status(error.response?.status || 500).send(
            error.response?.data || '서버에서 음성 변환에 실패했습니다.'
        );
    }
});

// 메인 페이지 렌더링
router.get('/', (req, res) => {
    res.render('index');
});

module.exports = router;