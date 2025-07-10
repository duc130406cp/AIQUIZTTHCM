const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post("/api/gemini", async (req, res) => {
  const { prompt, apiKey } = req.body;

  if (!apiKey || apiKey.trim() === "") {
    return res.status(400).json({ result: "API key không được để trống." });
  }

  const MODEL = "gemini-1.5-flash";

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: prompt }] }
          ]
        })
      }
    );

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi.";
    res.json({ result: text });

  } catch (error) {
    console.error("❌ Lỗi khi gọi Gemini:", error);
    res.status(500).json({ result: "Lỗi máy chủ." });
  }
});

app.listen(3000, () => {
  console.log("✅ Server proxy đang chạy tại http://localhost:3000");
});