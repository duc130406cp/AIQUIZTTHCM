
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post("/api/gemini", async (req, res) => {
  const { prompt, apiKey } = req.body;

  if (!apiKey || apiKey.trim() === "") {
    return res.status(400).json({ 
        result: "API key không được để trống.",
        errorMessage: "API key không được để trống."
    });
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
          ],
          generationConfig: {
            temperature: 0.9,
          }
        })
      }
    );

    const data = await geminiRes.json();
    
    if (data.error) {
        console.error("Lỗi từ API Google:", data.error.message);
        return res.status(400).json({ 
            result: `Lỗi từ API Google: ${data.error.message}`,
            errorMessage: data.error.message 
        });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi.";
    res.json({ result: text });

  } catch (error) {
    console.error("❌ Lỗi khi gọi Gemini:", error);
    res.status(500).json({ 
        result: "Lỗi máy chủ.",
        errorMessage: error.message
    });
  }
});

app.listen(3000, () => {
  console.log("✅ Server proxy đang chạy tại http://localhost:3000");
});