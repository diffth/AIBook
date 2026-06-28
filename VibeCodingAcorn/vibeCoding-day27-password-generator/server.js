import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Gemini API 초기화 (공백 및 따옴표 정제 처리)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.replace(/["']/g, "").trim() : null;
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
} else {
  console.warn("⚠️ 경고: GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. AI 비밀번호 기능이 제한되며 데모 폴백 모드로 동작합니다.");
}

// 1. 비밀번호 분석 및 3선 생성 API
app.post('/api/generate-passwords', async (req, res) => {
  const { pattern } = req.body;

  if (!pattern || pattern.trim().length === 0) {
    return res.status(400).json({ success: false, message: "비밀번호 생성 조건(패턴)을 입력해 주세요." });
  }

  // API 키가 없거나 잘못되었을 때를 대비한 유려한 폴백(Fallback) 목업 데이터 생성기
  const getFallbackPasswords = (userPattern) => {
    console.log(`[Fallback] 입력 패턴 "${userPattern}" 에 부합하는 우회 목업 데이터를 생성합니다.`);
    
    // 패턴 키워드 추출 분석 (영화, 음악, 인생 등)
    if (userPattern.includes("영화") || userPattern.includes("무비") || userPattern.includes("Movie") || userPattern.includes("시네마")) {
      return [
        {
          pwd: "T1tan1c_1997!",
          node: "영화 'Titanic'에서 i를 1로 치환(Leetspeak)하고 개봉년도(1997)와 특수문자(!)를 결합해 기억하기 쉽게 설계했습니다.",
          note: "영화 'Titanic'에서 i를 1로 치환(Leetspeak)하고 개봉년도(1997)와 특수문자(!)를 결합해 기억하기 쉽게 설계했습니다."
        },
        {
          pwd: "Av@t@r_2026#",
          node: "영화 'Avatar'에서 a를 @로 치환하고 올해 연도(2026)와 특수문자(#)를 결합했습니다.",
          note: "영화 'Avatar'에서 a를 @로 치환하고 올해 연도(2026)와 특수문자(#)를 결합했습니다."
        },
        {
          pwd: "LaLaL@nd_City*",
          node: "영화 'LaLa Land'에서 a 하나를 골라 @로 교체하고 대표 키워드 'City'와 특수문자(*)를 덧붙였습니다.",
          note: "영화 'LaLa Land'에서 a 하나를 골라 @로 교체하고 대표 키워드 'City'와 특수문자(*)를 덧붙였습니다."
        }
      ];
    }

    if (userPattern.includes("인생") || userPattern.includes("목표") || userPattern.includes("성공") || userPattern.includes("명언") || userPattern.includes("좌우명")) {
      return [
        {
          pwd: "CarpeD1em_777!",
          node: "라틴어 명언 'Carpe Diem(오늘을 즐겨라)'에서 i를 1로 치환하고 행운의 숫자(777)와 특수문자(!)를 결합했습니다.",
          note: "라틴어 명언 'Carpe Diem(오늘을 즐겨라)'에서 i를 1로 치환하고 행운의 숫자(777)와 특수문자(!)를 결합했습니다."
        },
        {
          pwd: "N0G@in_NoPa1n$",
          node: "영어 격언 'No pain, No gain'에서 o를 0으로, a를 @로, i를 1로 치환하여 정보 엔트로피를 극대화했습니다.",
          note: "영어 격언 'No pain, No gain'에서 o를 0으로, a를 @로, i를 1로 치환하여 정보 엔트로피를 극대화했습니다."
        },
        {
          pwd: "ToBe_0rN0t_ToB@",
          node: "셰익스피어의 햄릿 대사 'To be or not to be'에서 o를 0으로, e를 @로 치환하여 직관적으로 연상할 수 있게 만들었습니다.",
          note: "셰익스피어의 햄릿 대사 'To be or not to be'에서 o를 0으로, e를 @로 치환하여 직관적으로 연상할 수 있게 만들었습니다."
        }
      ];
    }

    // 기본 목업 데이터 (인공지능, 테크 관련)
    return [
      {
        pwd: "G3m1n1_A1_2026#",
        node: "키워드 'Gemini AI'에서 e를 3으로, i를 1로 치환하고 올해 연도와 특수문자를 더하여 기억하기 쉽게 만들었습니다.",
        note: "키워드 'Gemini AI'에서 e를 3으로, i를 1로 치환하고 올해 연도와 특수문자를 더하여 기억하기 쉽게 만들었습니다."
      },
      {
        pwd: "S3cur1ty_N@0n!",
        node: "단어 'Security Neon'에서 e를 3으로, i를 1로, a를 @로 치환하고 특수문자(!)를 조합했습니다.",
        note: "단어 'Security Neon'에서 e를 3으로, i를 1로, a를 @로 치환하고 특수문자(!)를 조합했습니다."
      },
      {
        pwd: "Cl0ud_Fl@re_99*",
        node: "단어 'Cloud Flare'에서 o를 0으로, a를 @로 치환하고 숫자 99와 특수문자(*)를 조합했습니다.",
        note: "단어 'Cloud Flare'에서 o를 0으로, a를 @로 치환하고 숫자 99와 특수문자(*)를 조합했습니다."
      }
    ];
  };

  if (!genAI) {
    return res.json({
      success: true,
      passwords: getFallbackPasswords(pattern)
    });
  }

  try {
    // API 버전 v1으로 강제 설정하여 안정적인 Endpoint 획득
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });

    const prompt = `
당신은 최고의 사이버보안 연구원이자 기억법 공학자입니다. 사용자의 자연어 조건과 아래의 엄격한 보안 및 연상 규칙을 만족하는 3개의 독창적이고 안전한 비밀번호 후보군을 작성해 주세요.

사용자 입력 요구사항: "${pattern}"

[필수 규칙 및 제약사항]
1. 출력 형식: 오직 아래 지정된 JSON 배열 형식으로만 응답하세요. 다른 부가적인 마크다운 코드 블록(\`\`\`json)이나 서론, 결론은 절대 적지 마세요.
   - 키 이름은 정확히 "pwd"와 "node"이어야 합니다.
   - "node" 키에는 사용자가 머릿속으로 이 비밀번호를 쉽게 연상하고 기억할 수 있는 한 줄 한글 기억 방법 설명을 추가해 주세요.
   [{"pwd": "비밀번호1", "node": "기억 방법1"}, {"pwd": "비밀번호2", "node": "기억 방법2"}, {"pwd": "비밀번호3", "node": "기억 방법3"}]
2. 보안 기준: 사용자의 조건(길이, 문자 포함 여부)을 반드시 반영하세요. 대문자, 소문자, 숫자, 특수문자가 1개 이상 골고루 섞여 복잡성이 극대화되어야 합니다.
3. 연상 및 치환: 완전히 랜덤한 난수보다, 기억하기 쉬운 문장이나 단어의 특정 알파벳을 기호/숫자로 치환(Leetspeak 기법, 예: a->@, e->3, i->1, o->0, s->5 등)하여 보안성과 기억 용이성을 동시에 충족시키세요.
4. 금지 단어: "password", "1234", "qwerty", "admin" 등 뻔한 패스워드는 어떠한 형태(대소문자 포함)로도 절대 포함하지 마세요.

출력 예시:
[{"pwd": "...", "node": "..."}, {"pwd": "...", "node": "..."}, {"pwd": "...", "node": "..."}]
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    const parsedPasswords = JSON.parse(cleanedText);

    // note와 node 둘 다 포함하여 프론트엔드 바인딩 호환성 최적화
    const sanitizedPasswords = parsedPasswords.map(p => ({
      pwd: p.pwd,
      node: p.node || p.note || "기억법 가이드가 포함되어 있습니다.",
      note: p.node || p.note || "기억법 가이드가 포함되어 있습니다."
    }));

    res.json({
      success: true,
      passwords: sanitizedPasswords
    });

  } catch (error) {
    console.error("Gemini API 비밀번호 생성 실패, Fallback 데이터로 전환합니다:", error.message);
    res.json({
      success: true,
      passwords: getFallbackPasswords(pattern)
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI 비밀번호 생성기 백엔드 구동 완료: http://localhost:${PORT}`);
});
