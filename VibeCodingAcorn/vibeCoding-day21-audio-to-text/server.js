import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { AssemblyAI } from 'assemblyai';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. 임시 uploads 폴더 생성
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer 파일 수집 설정 (음성 파일 제한: 50MB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// 2. 외부 API 클라이언트 도우미
const getAssemblyAIClient = () => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error('ASSEMBLYAI_API_KEY가 설정되지 않았습니다.');
  return new AssemblyAI({ apiKey });
};

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  return new GoogleGenAI({ apiKey });
};

// 3. API 엔드포인트: 음성 파일 변환 및 분석 파이프라인
app.post('/api/analyze-meeting', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '오디오 파일이 첨부되지 않았습니다.' });
  }

  const filePath = req.file.path;

  try {
    // ----------------------------------------------------
    // [1단계] AssemblyAI를 통한 음성 받아쓰기 (STT)
    // ----------------------------------------------------
    const aaiClient = getAssemblyAIClient();
    
    // 로컬 경로의 파일을 직접 전달하면 SDK가 알아서 업로드하고 대기합니다.
    const transcript = await aaiClient.transcripts.transcribe({
      audio: filePath,
      language_code: 'ko', // 한국어 중심 설정
    });

    if (transcript.status === 'error') {
      throw new Error(`AssemblyAI 변환 에러: ${transcript.error}`);
    }

    const transcriptText = transcript.text || '';
    if (!transcriptText.trim()) {
      throw new Error('음성에서 추출된 텍스트가 없습니다. 녹음 파일의 음질 상태를 확인해 주세요.');
    }

    // ----------------------------------------------------
    // [2단계] Gemini API를 통한 구조화 요약 및 할 일 생성
    // ----------------------------------------------------
    const geminiClient = getGeminiClient();
    
    const systemPrompt = `당신은 비즈니스 회의록을 전문적으로 분석하고 요약하는 업무 비서 AI입니다.
회의 녹취록 텍스트를 정밀 분석하여 회의 주제(제목), 상세 핵심 요약, 할 일 목록(Action Items), 주요 결정 사항을 JSON 형식으로 작성해야 합니다.
반드시 아래 정의된 JSON 스키마를 만족하게 답하세요. 다른 설명 텍스트는 출력하지 마세요.`;

    const userPrompt = `다음 회의 녹취록 텍스트를 기반으로 요약본과 할 일 목록을 작성해 주세요.
[회의 녹취록]
${transcriptText}`;

    const geminiResponse = await geminiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            title: {
              type: 'STRING',
              description: '회의 내용을 대변하는 직관적인 회의 제목 (한국어)'
            },
            summary: {
              type: 'STRING',
              description: '회의 흐름과 논의된 핵심 쟁점을 축약한 3~4줄 분량의 깔끔한 요약문 (한국어)'
            },
            actionItems: {
              type: 'ARRAY',
              description: '회의에서 도출된 개별 할 일(Action Items) 리스트',
              items: {
                type: 'OBJECT',
                properties: {
                  task: { type: 'STRING', description: '누가 무엇을 해야 하는지 상세한 할 일 정의 (한국어)' },
                  assignee: { type: 'STRING', description: '담당자 이름 또는 부서 (없으면 "미지정")' },
                  dueDate: { type: 'STRING', description: '기한 또는 일정 (없으면 "미지정")' }
                },
                required: ['task', 'assignee', 'dueDate']
              }
            },
            keyDecisions: {
              type: 'ARRAY',
              description: '회의에서 합의되거나 최종 결정된 중요 사항 리스트',
              items: { type: 'STRING' }
            }
          },
          required: ['title', 'summary', 'actionItems', 'keyDecisions']
        }
      }
    });

    const analysisData = JSON.parse(geminiResponse.text);

    // ----------------------------------------------------
    // 임시 파일 삭제 후 성공 결과 응답
    // ----------------------------------------------------
    fs.unlinkSync(filePath);

    return res.json({
      transcriptText,
      analysis: analysisData
    });

  } catch (error) {
    console.error('회의 분석 중 오류 발생:', error);
    // 임시 파일 제거 안전장치
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return res.status(500).json({ error: error.message || '서버 내부 오류가 발생했습니다.' });
  }
});

// 4. API 엔드포인트: 회의록 메일 전송
app.post('/api/send-email', async (req, res) => {
  const { emails, analysis, transcriptText } = req.body;

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: '수신자 메일 주소 리스트가 비어 있습니다.' });
  }
  if (!analysis) {
    return res.status(400).json({ error: '메일 발송을 위한 분석 데이터가 부족합니다.' });
  }

  try {
    // SMTP 전송기 초기화
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_PORT === '465', // 465 포트는 secure=true
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // SMTP 연결 테스트
    await transporter.verify();

    // 이메일 수신자 주소들 결합
    const toField = emails.join(', ');

    // 할 일 리스트 HTML 변환
    const actionItemsHtml = analysis.actionItems.map(item => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px; font-weight: 500; color: #1a202c; text-align: left;">${item.task}</td>
        <td style="padding: 12px; color: #4a5568; text-align: center;">${item.assignee}</td>
        <td style="padding: 12px; color: #e53e3e; text-align: center; font-weight: bold;">${item.dueDate}</td>
      </tr>
    `).join('');

    // 중요 결정사항 HTML 변환
    const decisionsHtml = analysis.keyDecisions.map(dec => `
      <li style="margin-bottom: 8px; color: #2d3748;">📌 ${dec}</li>
    `).join('');

    // HTML 메일 본문 구성 (고급 비즈니스 템플릿)
    const emailBodyHtml = `
      <div style="font-family: 'Noto Sans KR', sans-serif; background-color: #f7fafc; padding: 30px; font-size: 15px; line-height: 1.6; color: #2d3748;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e2e8f0;">
          
          <!-- 헤더 섹션 -->
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 30px; text-align: center; color: #ffffff;">
            <span style="font-size: 12px; text-transform: uppercase; font-weight: bold; background-color: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 10px; letter-spacing: 0.05em;">AI 회의록 분석 보고서</span>
            <h1 style="margin: 15px 0 0 0; font-size: 22px; font-weight: 800;">🔊 ${analysis.title}</h1>
          </div>

          <!-- 본문 내용 -->
          <div style="padding: 30px;">
            
            <!-- 요약 영역 -->
            <div style="margin-bottom: 30px;">
              <h3 style="color: #4f46e5; border-bottom: 2px solid #ebf4ff; padding-bottom: 8px; margin-top: 0; font-size: 16px; text-align: left;">📝 회의 요약</h3>
              <p style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px; margin: 0; font-style: italic; color: #4a5568; line-height: 1.8; text-align: left;">
                "${analysis.summary}"
              </p>
            </div>

            <!-- 주요 결정사항 -->
            <div style="margin-bottom: 30px;">
              <h3 style="color: #4f46e5; border-bottom: 2px solid #ebf4ff; padding-bottom: 8px; font-size: 16px; text-align: left;">💡 결정 사항</h3>
              <ul style="margin: 0; padding-left: 20px; text-align: left;">
                ${decisionsHtml}
              </ul>
            </div>

            <!-- 할 일 목록 (Action Items) -->
            <div style="margin-bottom: 30px;">
              <h3 style="color: #4f46e5; border-bottom: 2px solid #ebf4ff; padding-bottom: 8px; font-size: 16px; text-align: left;">📅 할 일 목록 (Action Items)</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 13px;">
                    <th style="padding: 10px; text-align: left; color: #718096;">할 일</th>
                    <th style="padding: 10px; text-align: center; color: #718096; width: 100px;">담당자</th>
                    <th style="padding: 10px; text-align: center; color: #718096; width: 100px;">기한</th>
                  </tr>
                </thead>
                <tbody>
                  ${actionItemsHtml}
                </tbody>
              </table>
            </div>

            <!-- 회사 저작권 정보 등 -->
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #e2e8f0; font-size: 12px; color: #a0aec0; text-align: center;">
              본 보고서는 AI가 음성을 인식하고 Gemini API를 기반으로 작성한 공식 요약본입니다.
            </div>

          </div>
        </div>
      </div>
    `;

    // 메일 옵션 빌드
    const mailOptions = {
      from: `"AI 회의록 시스템" <${process.env.SMTP_USER}>`,
      to: toField,
      subject: `[회의록 공유] ${analysis.title}`,
      html: emailBodyHtml
    };

    // 발송 실행
    await transporter.sendMail(mailOptions);
    return res.json({ success: true, message: '회의록 이메일 발송이 완료되었습니다.' });

  } catch (error) {
    console.error('메일 전송 중 오류 발생:', error);
    return res.status(500).json({ error: error.message || '메일 발송에 실패했습니다. SMTP 환경변수 설정을 확인해 주세요.' });
  }
});

// 5. 서버 실행
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
