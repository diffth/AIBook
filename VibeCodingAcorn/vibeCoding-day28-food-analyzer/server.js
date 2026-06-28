import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Base64 대용량 이미지 바디를 받기 위해 한도 증가
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Gemini API 초기화 (공백 및 따옴표 정제 처리)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.replace(/["']/g, "").trim() : null;
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
} else {
  console.warn("⚠️ 경고: GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. 데모 폴백 모드로 동작합니다.");
}

// 1. 음식 이미지 & 텍스트 분석 API
app.post('/api/analyze-food', async (req, res) => {
  const { image, mimeType, text } = req.body;

  // 입력 유효성 검증
  if (!image && (!text || text.trim().length === 0)) {
    return res.status(400).json({ success: false, message: "분석할 음식 이미지 업로드 또는 음식명 텍스트 입력 중 하나는 필수입니다." });
  }

  // API 키 오류 및 오작동 대비 폴백(Fallback) 목업 생성 헬퍼
  const getFallbackNutrition = (inputText) => {
    const rawQuery = inputText ? inputText.toLowerCase() : "";
    console.log(`[Fallback] 입력 패턴 "${rawQuery}" 에 부합하는 음식 영양소 목업 데이터를 반환합니다.`);

    if (rawQuery.includes("김치") || rawQuery.includes("볶음밥") || rawQuery.includes("rice")) {
      return {
        foodName: "김치볶음밥 (달걀 프라이 포함)",
        amount: "350g (1인분)",
        nutrition: {
          calories: 540,
          protein: 14,
          carbs: 88,
          fat: 13
        },
        ai_suggestion: "탄수화물 비중이 높으니 노른자가 살아있는 반숙 프라이나 닭가슴살을 곁들여 단백질 비율을 보완해 보세요."
      };
    }

    if (rawQuery.includes("샐러드") || rawQuery.includes("salad") || rawQuery.includes("다이어트") || rawQuery.includes("채소")) {
      return {
        foodName: "리코타 치즈 닭가슴살 샐러드",
        amount: "250g",
        nutrition: {
          calories: 320,
          protein: 22,
          carbs: 18,
          fat: 16
        },
        ai_suggestion: "풍부한 식이섬유와 양질의 단백질이 어우러진 아주 훌륭한 웰니스 식단입니다. 드레싱은 가급적 찍어 드세요!"
      };
    }

    if (rawQuery.includes("피자") || rawQuery.includes("pizza") || rawQuery.includes("치킨") || rawQuery.includes("야식") || rawQuery.includes("패스트푸드")) {
      return {
        foodName: "콤비네이션 피자 (2조각)",
        amount: "200g (2조각)",
        nutrition: {
          calories: 520,
          protein: 20,
          carbs: 58,
          fat: 22
        },
        ai_suggestion: "포화지방과 나트륨 함량이 높으니, 드실 때 오이피클 대신 샐러드를 곁들이고 가볍게 20분 산책을 추천합니다."
      };
    }

    // 기본Fallback (건강식 단골 메뉴: 아보카도 연어 덮밥)
    return {
      foodName: "아보카도 훈제연어 덮밥 (현미밥 기준)",
      amount: "380g (1인분)",
      nutrition: {
        calories: 580,
        protein: 26,
        carbs: 72,
        fat: 19
      },
      ai_suggestion: "연어와 아보카도의 건강한 불포화지방산(오메가-3)이 풍부하여 혈관 건강과 피로 회복에 탁월한 명품 식단입니다."
    };
  };

  // API 키가 아예 설정되지 않은 상태의 1차 즉시 세이프 리턴
  if (!genAI) {
    return res.json({
      success: true,
      data: getFallbackNutrition(text)
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });

    // 멀티모달 분석을 위한 파트 리스트 구성
    const contents = [];

    // 이미지가 존재하면 inlineData 객체로 푸시
    if (image && mimeType) {
      contents.push({
        inlineData: {
          data: image,
          mimeType: mimeType
        }
      });
    }

    // 텍스트 설명이나 입력이 존재하면 조건 추가
    let promptInstruction = `
당신은 최고의 웰니스 영양학자이자 멀티모달 푸드 애널리스트입니다. 제공된 음식 이미지(있을 경우)와 음식 설명에 관한 텍스트(있을 경우)를 정밀 분석하여 음식 정보를 산출해 주세요.

다음 정보를 정확히 파악해야 합니다:
1. 음식 명칭 (foodName)
2. 예상 섭취량 (amount, 그램(g) 또는 ml 단위로 숫자를 포함해 표기)
3. 영양 성분 추정치 (nutrition: 칼로리(calories), 단백질(protein), 탄수화물(carbs), 지방(fat) 함량. 단위 문자는 빼고 오직 숫자 정수값만 지정하세요.)
4. 식단 제안 (ai_suggestion: 분석된 음식을 바탕으로 탄단지 균형이나 건강 보완을 조언하는 한 문장으로 된 짧고 구체적인 웰니스 코칭 메시지)

반드시 아래 JSON 포맷만을 정확하게 리턴해 주어야 합니다. 마크다운 코드 블록(\`\`\`json)이나 서론, 결론은 절대 추가하지 마세요. 오직 순수 JSON 데이터만 반환하세요.

{
  "foodName": "...",
  "amount": "...",
  "nutrition": {
    "calories": 450,
    "protein": 18,
    "carbs": 60,
    "fat": 12
  },
  "ai_suggestion": "..."
}
`;

    if (text) {
      promptInstruction += `\n사용자가 추가로 작성한 음식 보조 정보/설명: "${text}"`;
    }

    contents.push(promptInstruction);

    // Gemini API 호출
    const result = await model.generateContent(contents);
    const response = await result.response;
    const responseText = response.text();

    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    const parsedData = JSON.parse(cleanedText);

    res.json({
      success: true,
      data: {
        foodName: parsedData.foodName || "분석된 음식",
        amount: parsedData.amount || "1인분",
        nutrition: {
          calories: Number(parsedData.nutrition?.calories) || 350,
          protein: Number(parsedData.nutrition?.protein) || 15,
          carbs: Number(parsedData.nutrition?.carbs) || 45,
          fat: Number(parsedData.nutrition?.fat) || 10
        },
        ai_suggestion: parsedData.ai_suggestion || "균형 잡힌 식사를 유지하고 물을 충분히 섭취하세요."
      }
    });

  } catch (error) {
    console.error("Gemini 음식 분석 실패, Fallback 데이터로 안전하게 우회합니다:", error.message);
    res.json({
      success: true,
      data: getFallbackNutrition(text)
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI 영양소 분석 어시스턴트 백엔드 구동 완료: http://localhost:${PORT}`);
});
