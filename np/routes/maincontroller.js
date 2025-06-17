const express = require("express");
const router = express.Router();
const axios = require("axios");

const FASTAPI_BASE_URL = 'http://13.54.187.196:8080';

// 통합 요청 핸들러
router.get('/sum2', async (req, res) => {
    const { q, sort, tts } = req.query;
    try {
        const response = await axios.get(`${FASTAPI_BASE_URL}/sum2`, {
            params: {
                q: q || '에스파',
                sort: sort || 'sim',
                tts: tts === 'true'  // 프론트에서 'true' 문자열로 전송
            },
            responseType: tts ? 'arraybuffer' : 'json'
        });

        // TTS 응답 처리
        if (tts && response.headers['content-type']?.includes('audio/mpeg')) {
            res.set('Content-Type', 'audio/mpeg');
            res.send(response.data);
        } 
        // 일반 JSON 응답 처리
        else {
            res.json(response.data);
        }
        
    } catch (error) {
        console.error('FastAPI 호출 실패:', error.message);
        res.status(500).send(error.response?.data || '서버 오류 발생');
    }
});


router.get('/', (req, res) => {
    res.render('index');
});

module.exports = router;