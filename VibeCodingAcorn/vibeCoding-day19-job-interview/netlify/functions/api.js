import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Google Gen AI 클라이언트 생성 함수
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return new GoogleGenAI({ apiKey });
};

// 1. 면접 질문 생성 API
app.post('/api/generate-question', async (req, res) => {
  try {
    const { topic, difficulty = '중' } = req.body;
    if (!topic) {
      return res.status(400).json({ error: '면접 주제(topic)를 지정해주세요.' });
    }

    const ai = getGeminiClient();
    
    let difficultyGuideline = '';
    if (difficulty === '하') {
      difficultyGuideline = '난이도는 "하(Easy)" 수준으로, 해당 직무의 신입 또는 주니어 개발자 수준에 어울리는 기본적인 전공 지식, 코어 언어/프레임워크의 기초 문법/개념 질문, 혹은 인성 및 팀 협업 경험에 대해 편안하고 기초적인 질문을 하세요.';
    } else if (difficulty === '상') {
      difficultyGuideline = '난이도는 "상(Hard)" 수준으로, 해당 직무의 시니어/아키텍트 수준에 걸맞게 정밀한 아키텍처 설계, 복잡한 트러블슈팅 경험, 기술적 트레이드오프 분석, 성능 병목 해결, 대규모 데이터 또는 트래픽 상황에서의 시스템 한계 설계 등 고도로 난해하고 날카로운 질문을 하세요.';
    } else {
      difficultyGuideline = '난이도는 "중(Medium)" 수준으로, 실무에서 자주 겪는 개발 구현 사례, 주요 기술/라이브러리의 구동 메커니즘, 프로젝트 리팩토링 및 개선 노력, 혹은 특정 장애 상황 시의 일반적인 대처 방안 등 현업 1~3년 차가 겪을 법한 실무적인 질문을 하세요.';
    }

    const prompt = `당신은 전문 기업의 면접관입니다. 지원자가 선택한 직무/분야에 적합한 면접 질문을 던지는 역할입니다.
    면접 주제/직무: "${topic}"
    요청 질문 난이도: "${difficulty}"
    난이도 가이드라인: ${difficultyGuideline}
    
    위 조건에 맞춰 지원자에게 물어볼 면접 질문을 무작위로 1개만 생성해줘. 다른 인사말이나 부연 설명 없이, 실제 면접관처럼 구어체 질문 문장 1개만 바로 답변해줘.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: '당신은 전문 기업의 면접관입니다. 오직 한 줄의 면접 질문만 바로 생성해야 합니다.',
        temperature: 0.8,
      }
    });

    const questionText = response.text;
    const question = questionText ? questionText.trim() : '면접 질문을 생성하지 못했습니다. 다시 시도해 주세요.';
    return res.json({ question });
  } catch (error) {
    console.error('질문 생성 에러:', error);
    return res.status(500).json({ error: error.message || '서버 오류가 발생했습니다.' });
  }
});

// 2. 답변 평가 API
app.post('/api/evaluate-answer', async (req, res) => {
  try {
    const { topic, question, answer } = req.body;
    if (!topic || !question || !answer) {
      return res.status(400).json({ error: 'topic, question, answer 필드가 모두 필요합니다.' });
    }

    const ai = getGeminiClient();

    const userPrompt = `[면접 주제]: ${topic}
[면접 질문]: ${question}
[지원자 답변]: ${answer}

위 면접 질문에 대한 지원자의 답변을 평가해주세요.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: '당신은 면접자의 답변을 전문적으로 평가하는 HR 전문가이자 면접관입니다. 지원자가 답변한 내용의 논리성과 표현력을 분석하여 점수와 피드백을 JSON 형태로 제공해야 합니다.',
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            score: {
              type: 'INTEGER',
              description: '0부터 100 사이의 정수 점수 (답변의 타당성과 논리성 기준)'
            },
            logicFeedback: {
              type: 'STRING',
              description: '논리적 흐름, 핵심 파악 여부, 근거 제시 등에 대한 2~3문장의 구체적 평가 (한국어)'
            },
            expressionFeedback: {
              type: 'STRING',
              description: '어휘 선택, 자신감 넘치는 표현력, 전달력 등에 대한 2~3문장의 구체적 평가 (한국어)'
            },
            overallFeedback: {
              type: 'STRING',
              description: '잘한 점과 향후 보완하면 좋을 점을 포함한 3~4문장의 종합 조언 (한국어)'
            }
          },
          required: ['score', 'logicFeedback', 'expressionFeedback', 'overallFeedback']
        }
      }
    });

    const resultJsonText = response.text;
    const result = JSON.parse(resultJsonText);
    
    return res.json(result);
  } catch (error) {
    console.error('답변 평가 에러:', error);
    return res.status(500).json({ error: error.message || '서버 오류가 발생했습니다.' });
  }
});

const handler = serverless(app);
export { handler };
