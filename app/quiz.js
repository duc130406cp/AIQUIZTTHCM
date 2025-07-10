// ✅ Biến để lưu danh sách câu hỏi
let currentQuestion = 0;
let score = 0;
let questionsToShow = [];

// ✅ Bắt đầu quiz
async function startQuiz() {
  const selectedTopic = document.getElementById("topicSelect").value;
  const numQuestions = parseInt(document.getElementById("numQuestions").value);

  if (numQuestions > 15) alert("🤖 GPT đang tạo câu hỏi. Vui lòng chờ trong giây lát...");

  try {
    questionsToShow = await generateQuestionsFromGPT(selectedTopic, numQuestions);
    if (!questionsToShow || !Array.isArray(questionsToShow)) {
      throw new Error("Không nhận được câu hỏi hợp lệ từ GPT.");
    }
    currentQuestion = 0;
    score = 0;
    document.getElementById("quiz").style.display = "block";
    showQuestion();
  } catch (err) {
    console.error("❌ Lỗi tạo câu hỏi:", err);
    alert("Không tạo được câu hỏi từ GPT. Hãy thử lại.");
  }
}

function showQuestion() {
  const q = questionsToShow[currentQuestion];
  document.getElementById("questionNumber").textContent = `Câu ${currentQuestion + 1} / ${questionsToShow.length}`;
  document.getElementById("question").textContent = q.question;
  let opts = "";
  q.options.forEach((opt, i) => {
    opts += `<label><input type="radio" name="opt" value="${i}"> ${opt}</label><br/>`;
  });
  document.getElementById("options").innerHTML = opts;
  document.getElementById("feedback").textContent = "";
  document.getElementById("nextBtn").style.display = "none";
}

async function submitAnswer() {
  const selected = document.querySelector('input[name="opt"]:checked');
  if (!selected) return alert("Bạn chưa chọn đáp án!");

  const ans = parseInt(selected.value);
  const q = questionsToShow[currentQuestion];
  const resultContainer = document.getElementById("feedback");

  if (ans === q.answer) {
    resultContainer.innerHTML = "✅ Đúng rồi! Bạn hiểu rất tốt.";
    score++;
  } else {
    resultContainer.innerHTML = "❌ Sai. Đáp án đúng là: " + q.options[q.answer];
    resultContainer.innerHTML += `<br/><i>🤖 GPT đang suy nghĩ...</i>`;
    try {
      const gptReply = await explainAnswerWithGemini(q.question, q.options[ans], q.options[q.answer]);
      resultContainer.innerHTML = "❌ Sai. Đáp án đúng là: " + q.options[q.answer];
      resultContainer.innerHTML += `<br/><b>🤖 GPT giải thích:</b> ${gptReply}`;
    } catch (error) {
      console.error("Lỗi khi gọi API GPT:", error);
      resultContainer.innerHTML += `<br/><b>🤖 GPT gặp lỗi khi giải thích. Vui lòng thử lại sau.</b>`;
    }
  }

  document.getElementById("nextBtn").style.display = "inline-block";
}

function nextQuestion() {
  currentQuestion++;
  if (currentQuestion < questionsToShow.length) {
    showQuestion();
  } else {
    const topicLabel = document.getElementById("topicSelect").selectedOptions[0].textContent;
    document.getElementById("quiz").innerHTML = `<h2>🎯 Kết quả: ${score}/${questionsToShow.length}</h2><p><i>🤖 GPT đang suy nghĩ...</i></p>`;
    getAdviceFromGemini(score, questionsToShow.length, topicLabel).then(advice => {
      document.getElementById("quiz").innerHTML = `
        <h2>🎯 Kết quả: ${score}/${questionsToShow.length}</h2>
        <p><strong>🤖 GPT nhận xét:</strong> ${advice}</p>
        <button onclick="location.reload()">Làm lại</button>
      `;
    }).catch(error => {
      console.error("Lỗi khi nhận xét tổng kết:", error);
      document.getElementById("quiz").innerHTML = `
        <h2>🎯 Kết quả: ${score}/${questionsToShow.length}</h2>
        <p><strong>🤖 GPT nhận xét:</strong> GPT gặp lỗi khi nhận xét tổng kết. Vui lòng thử lại sau.</p>
        <button onclick="location.reload()">Làm lại</button>
      `;
    });
  }
}

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

async function explainAnswerWithGemini(question, wrongAns, correctAns) {
  const apiKey = sessionStorage.getItem("API_KEY");
  const prompt = `Trả lời ngắn gọn (tối đa 5 dòng). Câu hỏi: ${question}\nHọc sinh đã chọn sai: ${wrongAns}\nĐáp án đúng là: ${correctAns}\nHãy giải thích tại sao đáp án đúng là chính xác.`;

  try {
    const res = await fetch("http://localhost:3000/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, apiKey })
    });

    const data = await res.json();
    console.log("📥 GPT trả lời (giải thích):", data);
    return data.result && data.result.trim() !== "Không có phản hồi."
      ? data.result
      : `Không thể phân tích chi tiết. Tuy nhiên, đáp án đúng là: ${correctAns}`;
  } catch (error) {
    console.error("❌ Lỗi khi gọi API GPT (giải thích):", error);
    return `Không thể phân tích chi tiết. Tuy nhiên, đáp án đúng là: ${correctAns}`;
  }
}

async function getAdviceFromGemini(score, total, topic) {
  const apiKey = sessionStorage.getItem("API_KEY");
  const prompt = `Học sinh vừa hoàn thành bài kiểm tra gồm ${total} câu hỏi thuộc chủ đề '${topic}' và đạt ${score} điểm.\nHãy phân tích nhanh:\n- Những điểm mạnh thể hiện qua các câu đúng\n- Những phần kiến thức còn yếu, dễ sai\n- Đề xuất nội dung nên ôn tập, cách cải thiện\n\nLưu ý: Trả lời gọn, độ dài tối đa khoảng 2 lần phần giải thích một đáp án (tối đa 10 dòng). Không cần viết quá chi tiết như báo cáo học thuật.`;

  const res = await fetch("http://localhost:3000/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, apiKey })
  });

  const data = await res.json();
  console.log("📥 GPT trả lời (nhận xét):", data);
  return data.result || "Không có phản hồi.";
}

// 🔄 Tạo danh sách câu hỏi từ GPT
async function generateQuestionsFromGPT(topicValue, num) {
  const apiKey = sessionStorage.getItem("API_KEY");
  let topicText = "";

  if (topicValue === "custom") {
    topicText = document.getElementById("customTopicText").value.trim();
    if (!topicText) {
      alert("Bạn chưa nhập nội dung chủ đề tuỳ chọn!");
      return null;
    }
  }

  const topicMap = {
    1: "đối tượng, phương pháp và ý nghĩa học TTHCM",
    2: "cơ sở và quá trình hình thành TTHCM",
    3: "TTHCM về độc lập dân tộc và CNXH",
    4: "TTHCM về Đảng và Nhà nước cộng sản",
    5: "TTHCM về đại đoàn kết dân tộc và quốc tế",
    6: "TTHCM về văn hoá, đạo đức, con người"
  };

  const subject = topicValue === "custom"
    ? topicText
    : topicValue === "all"
      ? Object.values(topicMap).join("; ")
      : topicMap[topicValue] || "toàn bộ chương trình";

  const prompt = `Hãy tạo ${num} câu hỏi trắc nghiệm xoay quanh chủ đề '${subject}' trong môn Tư tưởng Hồ Chí Minh. Mỗi câu hỏi phải có đầy đủ: question, 4 options, answer (chỉ số 0-3 chỉ đáp án đúng). Trả về dạng JSON array:\n[ {\"question\":\"...\", \"options\": [\"A\",\"B\",\"C\",\"D\"], \"answer\": 2 }, ... ]`;

  const res = await fetch("http://localhost:3000/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, apiKey })
  });

  const data = await res.json();
  try {
    const jsonStart = data.result.indexOf("[");
    const jsonEnd = data.result.lastIndexOf("]") + 1;
    const jsonStr = data.result.slice(jsonStart, jsonEnd);
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("❌ Lỗi khi parse danh sách câu hỏi:", err, data.result);
    return null;
  }
}
