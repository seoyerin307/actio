const express = require("express");
const router = express.Router();
const axios = require("axios");



let option1 = 'http://localhost:8080/sum2';
router.get('/sum2', async (req, res) => {
    const q = req.query.q || '에스파';
    try {
        const response = await axios.get(option1, { params: { q } });
        res.send(response.data);
    } catch (error) {
        res.status(500).send('FastAPI 호출 실패');
    }
});
router.get('/', (req, res) => {
  res.render('index'); // views/index.html 렌더링
});


module.exports = router;