<style>
    body {
      font-family: 'Roboto', Arial, sans-serif;
      background: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 700px;
      margin: 40px auto;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.07);
      padding: 32px 24px 24px 24px;
    }
    h1 {
      text-align: center;
      color: #2d3748;
      margin-bottom: 24px;
      letter-spacing: 1px;
    }
    .search-bar {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 32px;
    }
    input[type="text"], select {
      padding: 10px 12px;
      font-size: 16px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      outline: none;
      transition: border 0.2s;
    }
    input[type="text"]:focus, select:focus {
      border-color: #3182ce;
    }
    button {
      padding: 10px 18px;
      font-size: 16px;
      border: none;
      border-radius: 6px;
      background: linear-gradient(90deg, #3182ce, #63b3ed);
      color: #fff;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.2s, box-shadow 0.2s;
      box-shadow: 0 2px 8px rgba(49,130,206,0.08);
    }
    button:hover {
      background: linear-gradient(90deg, #2563eb, #38bdf8);
    }
    ul {
      list-style: none;
      padding: 0;
    }
    .news-card {
      background: #f1f5f9;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      margin-bottom: 20px;
      padding: 18px 20px 14px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: box-shadow 0.2s;
    }
    .news-card:hover {
      box-shadow: 0 4px 16px rgba(49,130,206,0.13);
    }
    .news-title {
      font-size: 18px;
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 4px;
      text-decoration: none;
      transition: color 0.2s;
    }
    .news-title:hover {
      color: #1e40af;
      text-decoration: underline;
    }
    .summary {
      color: #374151;
      font-size: 16px;
      margin-bottom: 4px;
    }
    .tts-btn {
      align-self: flex-start;
      background: #10b981;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 7px 16px;
      font-size: 15px;
      font-weight: 500;
      margin-top: 4px;
      cursor: pointer;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tts-btn:hover {
      background: #059669;
    }
    .tts-btn svg {
      width: 18px;
      height: 18px;
      vertical-align: middle;
      fill: #fff;
    }
    @media (max-width: 600px) {
      .container { padding: 16px 4px; }
      .search-bar { flex-direction: column; gap: 12px; }
    }
  </style>