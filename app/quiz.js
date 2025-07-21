
let currentQuestion = 0;
let score = 0;
let questionsToShow = [];
const optionLabels = ['A', 'B', 'C', 'D'];

function showLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.style.display = "flex";
}

function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.style.display = "none";
}

function resetQuiz() {
  document.getElementById('quiz').style.display = 'none';
  document.getElementById('quiz').innerHTML = `
      <div id="questionNumber" style="margin-bottom: 10px; font-weight: bold;"></div>
      <p id="question"></p>
      <div id="options"></div>
      <button id="submitBtn" onclick="submitAnswer()">Nộp</button>
      <div id="feedback"></div>
      <button id="nextBtn" onclick="nextQuestion()">Câu tiếp theo</button>
  `;
  document.getElementById('setup').style.display = 'block';
}

async function startQuiz() {
  const selectedTopic = document.getElementById("topicSelect").value;
  const numQuestions = parseInt(document.getElementById("numQuestions").value);
  if (numQuestions > 10) {
    alert("🤖 Trợ giảng AI đang tạo bộ đề hoàn chỉnh... Vui lòng chờ.");
  }

  try {
    showLoading();
    questionsToShow = await retry(() => generateQuestionsFromGPT(selectedTopic, numQuestions));
    hideLoading();

    if (!questionsToShow || !Array.isArray(questionsToShow) || questionsToShow.length === 0 || !questionsToShow[0].explanation) {
      throw new Error("Định dạng dữ liệu trả về không hợp lệ.");
    }
    currentQuestion = 0;
    score = 0;
    document.getElementById("setup").style.display = "none";
    document.getElementById("quiz").style.display = "block";
    showQuestion();

  } catch (err) {
    hideLoading();
    console.error("❌ Lỗi ở startQuiz sau khi đã thử lại:", err);
    
    let userMessage = "Không tạo được câu hỏi. Vui lòng kiểm tra API Key hoặc thử lại sau.";
    const errorMessageLower = err.message.toLowerCase();
    if (errorMessageLower.includes("overloaded")) {
        userMessage = "🤖 Trợ giảng AI đang rất bận. Vui lòng thử lại sau vài phút.";
    } else if (errorMessageLower.includes("api key not valid")) {
        userMessage = "API Key của bạn không hợp lệ. Vui lòng kiểm tra lại.";
    }
    alert(userMessage);
  }
}

function showQuestion() {
  const q = questionsToShow[currentQuestion];
  document.getElementById("questionNumber").textContent = `Câu ${currentQuestion + 1} / ${questionsToShow.length}`;
  document.getElementById("question").textContent = q.question;
  
  let opts = "";
  q.options.forEach((opt, i) => {
    opts += `<label style="display: block; margin-bottom: 8px;">
               <input type="radio" name="opt" value="${i}" style="margin-right: 8px;">
               <b>${optionLabels[i]}.</b> ${opt}
             </label>`;
  });

  document.getElementById("options").innerHTML = opts;
  document.getElementById("feedback").innerHTML = "";
  document.getElementById("nextBtn").style.display = "none";
  document.getElementById("submitBtn").style.display = "inline-block";
  document.getElementById("submitBtn").disabled = false;
}

function submitAnswer() {
  const selected = document.querySelector('input[name="opt"]:checked');
  if (!selected) {
    alert("Bạn chưa chọn đáp án!");
    return;
  }
  document.getElementById("submitBtn").disabled = true;
  document.querySelectorAll('input[name="opt"]').forEach(radio => radio.disabled = true);
  
  const ans = parseInt(selected.value);
  const q = questionsToShow[currentQuestion];
  const resultContainer = document.getElementById("feedback");
  const explanationHtml = `<br><b>🤖 Trợ giảng AI giải thích:</b> ${q.explanation || "Không có giải thích chi tiết."}`;
  
  if (ans === q.answer) {
    score++;
    resultContainer.innerHTML = `✅ Chính xác! ${explanationHtml}`;
  } else {
    // Thêm nhãn A, B, C, D vào thông báo đáp án đúng
    const correctLabel = optionLabels[q.answer];
    resultContainer.innerHTML = `❌ Sai. Đáp án đúng là: <b>${correctLabel}. ${q.options[q.answer]}</b> ${explanationHtml}`;
  }
  
  document.getElementById("nextBtn").style.display = "inline-block";
  document.getElementById("submitBtn").style.display = "none";
}

function nextQuestion() {
  currentQuestion++;
  if (currentQuestion < questionsToShow.length) {
    showQuestion();
  } else {
    showFinalResult();
  }
}

async function showFinalResult() {
    const topicLabel = document.getElementById("topicSelect").selectedOptions[0].textContent;
    const resultDiv = document.getElementById("quiz");
    resultDiv.innerHTML = `<h2>🎯 Kết quả: ${score}/${questionsToShow.length}</h2><p><i>🤖 Trợ giảng AI đang viết nhận xét tổng kết...</i></p>`;
    showLoading();
    try {
        const advice = await getAdviceFromGemini(score, questionsToShow.length, topicLabel);
        hideLoading();
        resultDiv.innerHTML = `
            <h2>🎯 Kết quả: ${score}/${questionsToShow.length}</h2>
            <p><strong>🤖 Trợ giảng AI nhận xét:</strong><br>${advice.replace(/\n/g, '<br>')}</p>
            <button onclick="resetQuiz()">Làm lại bài khác</button> 
        `;
    } catch (error) {
        hideLoading();
        console.error("Lỗi khi nhận xét tổng kết:", error);
        resultDiv.innerHTML = `
            <h2>🎯 Kết quả: ${score}/${questionsToShow.length}</h2>
            <p><strong>🤖 Trợ giảng AI gặp lỗi khi nhận xét.</strong></p>
            <button onclick="resetQuiz()">Làm lại bài khác</button>
        `;
    }
}

async function getAdviceFromGemini(score, total, topic) {
  const apiKey = sessionStorage.getItem("API_KEY");
  const prompt = `Một sinh viên vừa làm bài kiểm tra trắc nghiệm môn Tư tưởng Hồ Chí Minh.
- Chủ đề: "${topic}"
- Số câu: ${total}
- Kết quả: ${score}/${total} đúng.
Dựa vào kết quả này, hãy đưa ra nhận xét tổng quan (khoảng 7-10 dòng), phân tích điểm mạnh, yếu và đưa ra lời khuyên ôn tập. Giọng văn thân thiện, động viên.`;
  const res = await fetch("http://localhost:3000/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, apiKey })
  });
  const data = await res.json();
  if (data.errorMessage) {
    throw new Error(data.errorMessage);
  }
  return data.result || "Chúc mừng bạn đã hoàn thành bài kiểm tra!";
}

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

  const subject = topicValue === "custom" ? topicText : topicValue === "all" ? Object.values(topicMap).join('; ') : topicMap[topicValue];

  const prompt = `Tạo ${num} câu hỏi trắc nghiệm Tư tưởng Hồ Chí Minh về chủ đề: '${subject}'.
Yêu cầu:
- Câu hỏi phải mới, không lặp lại. ID yêu cầu: ${Date.now()}.
- Bám sát giáo trình đại học.
- Định dạng JSON array, mỗi object có: "question", "options" (mảng 4), "answer" (số 0-3), "explanation" (chi tiết, 3-5 dòng).
- Chỉ trả về JSON, không markdown hay văn bản khác.`;

  try {
    const res = await fetch("http://localhost:3000/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, apiKey })
    });

    const data = await res.json();
    console.log("Dữ liệu gốc từ Gemini:", data);

    if (data.errorMessage) {
      throw new Error(data.errorMessage);
    }
    
    let cleanText = data.result.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonStart = cleanText.indexOf('[');
    const jsonEnd = cleanText.lastIndexOf(']') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error("Phản hồi từ AI không chứa JSON array hợp lệ.");
    }
    
    let jsonStr = cleanText.substring(jsonStart, jsonEnd);
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(jsonStr);

  } catch (err) {
    console.error("❌ Lỗi khi gọi API hoặc parse JSON:", err);
    throw err;
  }
}