// Gemini API 연동 모듈

const DEFAULT_GEMINI_API_KEY = "YOUR_API_KEY_HERE";

export function getGeminiApiKey() {
  const savedKey = localStorage.getItem("gemini_api_key");
  return savedKey ? savedKey : DEFAULT_GEMINI_API_KEY;
}

export function setGeminiApiKey(key) {
  if (key) {
    localStorage.setItem("gemini_api_key", key.trim());
  } else {
    localStorage.removeItem("gemini_api_key");
  }
}

/**
 * Gemini 1.5 Flash 모델 호출 공통 함수
 */
async function callGeminiAPI(prompt, systemInstruction = "") {
  const apiKey = getGeminiApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [
        { text: systemInstruction }
      ]
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("Gemini API Error Detail:", errData);
      throw new Error(errData.error?.message || `API HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error("Gemini API가 비어있는 응답을 반환했습니다.");
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error("callGeminiAPI 에러 발생:", error);
    throw error;
  }
}

/**
 * 1. AI 레벨 테스트 10문항 세트 생성
 */
export async function generateLevelTestSet() {
  const systemInstruction = `You are an expert English teacher. Generate an English level test set consisting of exactly 10 multiple-choice questions. 
The test should balance difficulty: 3 easy questions (for Beginner), 4 medium questions (for Intermediate), and 3 hard questions (for Advanced) so we can accurately judge the user's level.
Response must be a valid JSON object matching the following structure:
{
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "Question text here (e.g. fill in the blank or grammar check)",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 0, // Index of the correct answer (0 to 3)
      "explanation": "Detailed explanation in Korean why this option is correct."
    }
  ]
}`;

  const prompt = "Please generate 10 English multiple-choice questions for the level test with diverse topics (grammar, vocabulary, reading comprehension). Output exactly in JSON format.";
  return await callGeminiAPI(prompt, systemInstruction);
}

/**
 * 2. 특정 레벨에 맞는 영어 학습 문장 생성
 * @param {string} level - '초급' | '중급' | '고급'
 * @param {number} count - 생성할 문장 수 (기본 5개)
 */
export async function generateEnglishSentences(level, count = 5) {
  const levelEng = level === "초급" ? "Beginner" : level === "중급" ? "Intermediate" : "Advanced";
  
  const systemInstruction = `You are a helpful and professional English language tutor. 
Generate exactly ${count} English learning cards appropriate for the '${levelEng}' level. 
Each card must feature a natural, practical, and highly useful English sentence.
Response must be a valid JSON array matching the following structure:
[
  {
    "sentence": "Practical English sentence here",
    "translation": "Natural Korean translation of the sentence",
    "grammar": "Clear, concise grammar tips or usage explanations in Korean.",
    "vocabulary": [
      { "word": "word1", "meaning": "meaning in Korean" },
      { "word": "word2", "meaning": "meaning in Korean" }
    ],
    "similarExpressions": [
      "Alternative way to say it 1",
      "Alternative way to say it 2"
    ]
  }
]`;

  const prompt = `Generate ${count} useful English learning cards for ${levelEng} level. Keep sentences natural and explanation friendly. Output exactly in JSON array format.`;
  return await callGeminiAPI(prompt, systemInstruction);
}
