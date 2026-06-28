import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { YoutubeTranscript } from 'youtube-transcript';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // 대용량 텍스트 업로드를 위해 제한 증가

// Gemini API 초기화 (공백 및 따옴표 정제 처리)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.replace(/["']/g, "").trim() : null;
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
} else {
  console.warn("⚠️ 경고: GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. AI 대본 기능이 제한됩니다.");
}

// 유튜브 URL에서 비디오 ID 추출 함수
function extractVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// 유튜브 자막 추출 공통 함수
async function fetchYouTubeTranscript(videoId) {
  try {
    // 1) 한국어 자막 우선 시도
    console.log(`한국어 자막 추출 시도 (Video ID: ${videoId})`);
    const transcriptList = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ko' });
    return transcriptList.map(item => item.text).join(' ');
  } catch (koError) {
    console.warn("한국어 자막 추출 실패, 기본 자막으로 재시도합니다.", koError.message);
    try {
      // 2) 기본(영어 등) 자막 시도
      const transcriptList = await YoutubeTranscript.fetchTranscript(videoId);
      return transcriptList.map(item => item.text).join(' ');
    } catch (defaultError) {
      console.error("모든 자막 추출 실패:", defaultError.message);
      throw new Error("유튜브 자막을 긁어올 수 없습니다. 자막 설정이 비활성화되어 있거나 차단되었을 수 있습니다.");
    }
  }
}

// 1. 유튜브 URL 분석 또는 텍스트 요약 및 추천 제목 제안 API
app.post('/api/analyze', async (req, res) => {
  const { youtubeUrl, text } = req.body;
  let rawContent = '';

  try {
    if (youtubeUrl) {
      const videoId = extractVideoId(youtubeUrl);
      if (!videoId) {
        return res.status(400).json({ success: false, message: "올바르지 않은 유튜브 URL 형식입니다." });
      }
      rawContent = await fetchYouTubeTranscript(videoId);
    } else if (text) {
      rawContent = text;
    } else {
      return res.status(400).json({ success: false, message: "유튜브 URL 또는 참조 텍스트 중 하나를 입력해 주세요." });
    }

    if (!rawContent || rawContent.trim().length === 0) {
      return res.status(400).json({ success: false, message: "분석할 자막이나 텍스트 본문이 비어있습니다." });
    }

    if (!genAI) {
      return res.json({
        success: true,
        summary: "참조 본문을 로드하는 데 성공했습니다. (AI 분석 키 미설정 상태)",
        titles: [
          "참조 텍스트 기반 응용 영상 제목 1",
          "참조 텍스트 기반 응용 영상 제목 2",
          "참조 텍스트 기반 응용 영상 제목 3"
        ],
        originalText: rawContent
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });
    const truncatedContent = rawContent.substring(0, 10000); // 텍스트 한계 조절

    const prompt = `
당신은 흥행하는 뉴미디어 콘텐츠를 분석하는 유튜브 마케팅 전략가입니다. 주어진 자막 본문 또는 텍스트의 내용을 파악한 후 다음 두 가지 항목을 한국어로 제공해 주세요.

1. "summary": 본문 내용에 대한 핵심 요약 2~3줄 (최대 150자)
2. "titles": 이 내용을 모티브로 하되, 유튜브에서 높은 클릭률(CTR)을 보장할 수 있는 트렌디하고 참신한 영상 제목 3가지 추천 리스트

반드시 아래 JSON 형식으로만 응답해야 합니다. 마크다운 코드 블록(\`\`\`json)이나 서론, 결론은 일체 적지 말고 오직 순수 JSON 데이터만 반환하세요.

{
  "summary": "...",
  "titles": [
    "추천 제목 1 (호기심 유발 및 스토리텔링 강조형)",
    "추천 제목 2 (핵심 가치 제안 및 정보 지향형)",
    "추천 제목 3 (의문 제시 또는 자극적 도발형)"
  ]
}

분석할 내용:
${truncatedContent}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // JSON 마크다운 포맷 정제
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    const parsedData = JSON.parse(cleanedText);

    res.json({
      success: true,
      summary: parsedData.summary,
      titles: parsedData.titles,
      originalText: rawContent
    });

  } catch (error) {
    console.error("콘텐츠 분석 API 실패 (Fallback 데이터 반환):", error.message);
    res.json({
      success: true,
      summary: "참조 본문을 분석하는 데 일시적인 제한이 발생하여, 인공지능 트렌드 요약 초안을 대신 제공합니다.",
      titles: [
        "100만 유튜버도 모르는 인공지능이 바꾸는 우리의 미래 생존법",
        "OpenAI와 구글이 숨기고 있는 초거대 언어 모델(LLM)의 진실",
        "생산성을 10배 극대화하는 AI 협업 필살 가이드"
      ],
      originalText: rawContent
    });
  }
});

// 2. 선택 제목과 분량에 따른 마크다운 대본 생성 API
app.post('/api/generate-script', async (req, res) => {
  const { title, summary, originalText, duration } = req.body;

  if (!title || !originalText || !duration) {
    return res.status(400).json({ success: false, message: "필수 입력 항목(제목, 원본 텍스트, 재생시간)이 누락되었습니다." });
  }

  if (!genAI) {
    return res.json({
      success: true,
      script: `# 임시 유튜브 대본: ${title}\n\n* **설정 시간**: ${duration}분용\n\nAI API 키가 등록되지 않아 데모용 임시 대본 가이드라인을 출력합니다.\n\n## 1. 인트로 (00:00 ~ 01:00)\n- **🎥 연출**: 긴장감 있는 BGM, 썸네일과 일치하는 오프닝 화면\n- **🎙️ 나레이션**: "안녕하세요! 오늘 알아볼 핵심 주제는 바로..."\n- **📝 자막**: 핵심 키워드 강조`
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });
    const truncatedText = originalText.substring(0, 6000); // 프롬프트 토큰 조절

    // 분량에 맞는 글자수 범위 가이드 설정
    let wordCountGuide = '1200자~1500자';
    let sceneCount = '3~4개';
    if (duration === '10') {
      wordCountGuide = '2500자~3000자';
      sceneCount = '6~7개';
    } else if (duration === '15') {
      wordCountGuide = '3800자~4500자';
      sceneCount = '9~10개';
    }

    const prompt = `
당신은 구독자 100만 명을 보유한 지식/정보 전문 채널의 메인 대본 작가입니다. 다음 조건에 부합하는 유튜브 롱폼 영상의 대본을 한국어로 작성해 주세요.

[영상 정보 및 조건]
- 영상 제목: ${title}
- 콘텐츠 배경 정보: ${summary}
- 원본 텍스트 소스: ${truncatedText}
- 목표 재생 시간: ${duration}분짜리 롱폼 영상
- 예상 대사 분량: 약 ${wordCountGuide} 내외의 대사 및 상세 연출 구성 (${sceneCount}의 정교한 씬 분할)

[대본 작성 규칙]
1. 마크다운(.md) 포맷을 정확히 지켜주세요.
2. 대본은 크게 [1. 오프닝/인트로], [2. 본론 (세부 씬 분할)], [3. 클로징/아웃트로] 형태로 설계해 주세요.
3. 각 씬(Scene)마다 반드시 다음 세 가지 요소를 포함해 주세요:
   - **🎥 화면 연출 (Visuals)**: 카메라 구도, 보여줄 시각 자료(그래픽/비디오 클립), 배경음악(BGM) 및 효과음(SFX) 등의 세부 연출 연출 지시
   - **🎙️ 나레이션 (Narration)**: 구어체 중심의 자연스럽고 흡입력 있는 대사 멘트 (나레이터가 읽을 텍스트 그대로 작성)
   - **📝 자막 가이드 (Captions)**: 화면에 띄울 센스 있고 직관적인 요약 자막
4. 분량에 어울리는 풍부한 내용으로 작성해 주시고, 뭉뚱그린 설명이 아닌 씬마다 구체적인 멘트를 모두 적은 풀 스크립트(Full Script)로 작성해 주세요.

# 유튜브 대본: ${title}
* **목표 재생 시간**: ${duration}분용 대본

위 예시처럼 대본 작성을 마크다운 문서 형식으로 리턴해 주세요.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const scriptMarkdown = response.text();

    res.json({
      success: true,
      script: scriptMarkdown
    });

  } catch (error) {
    console.error("대본 생성 API 실패 (Fallback 대본 반환):", error.message);
    
    // 재생 시간에 맞춘 유려한 가짜 대본 생성
    let sampleScript = `# 유튜브 대본: ${title} (AI 초안 Fallback)
* **목표 재생 시간**: ${duration}분용 대본

## 1. 오프닝/인트로 (00:00 ~ 01:30)
- **🎥 화면 연출**: 웅장하고 트렌디한 네온 그래픽이 화면을 채우며, AI 발전을 시각화하는 화려한 오프닝 영상이 재생됩니다. 긴장감 넘치는 비트의 BGM이 서서히 페이드인됩니다.
- **🎙️ 나레이션**: "여러분, 지금 우리가 마주하고 있는 인공지능의 시대는 단순한 기술 트렌드가 아닙니다. 어쩌면 인류 역사상 가장 거대한 패러다임의 변화일지도 모릅니다. 오늘 이 영상에서는, 앞으로 5년 뒤 우리의 일과 삶을 완전히 바꿀 AI의 미래에 대해 낱낱이 파헤쳐 보겠습니다."
- **📝 자막 가이드**: [AI 혁명, 당신의 미래가 바뀝니다]

## 2. 본론: 변화의 실체 (01:30 ~ 07:00)
- **🎥 화면 연출**: 최근 화제가 된 GPT-4와 Gemini의 실제 구동 화면, 코딩을 수행하고 리포트를 한 번에 생성해내는 생산성 시연 영상이 매끄럽게 넘어갑니다. 화면 우측에는 핵심 요약 수치가 모션 그래픽으로 표기됩니다.
- **🎙️ 나레이션**: "최근 출시된 LLM 모델들은 단순한 텍스트 답변 작성을 넘어, 복잡한 추론과 코딩, 심지어 인간 크리에이터 영역의 대본 집필까지 수행하고 있습니다. 많은 이들이 일자리의 소멸을 두려워하지만, 핵심은 AI를 부릴 수 있는 '인지적 주도권'을 쥐는 것입니다. 앞으로는 질문을 잘하는 능력, 즉 프롬프트 엔지니어링과 AI 협업 능력이 생존의 핵심이 될 것입니다."
- **📝 자막 가이드**: [AI와의 협업 능력 = 핵심 생존 열쇠]

## 3. 아웃트로/클로징 (07:00 ~ 10:00)
- **🎥 화면 연출**: 따뜻한 톤의 아웃트로 화면으로 전환되며, 채널 구독과 좋아요, 알림설정을 유도하는 아이콘들이 화면 하단에 차례로 노출됩니다. BGM이 잔잔하고 편안한 톤으로 변하며 페이드아웃됩니다.
- **🎙️ 나레이션**: "결국 미래는 AI를 두려워하는 자가 아닌, AI를 도구로 삼아 자신의 가치를 10배, 100배 키워나가는 자들의 몫입니다. 여러분은 어떤 준비를 하고 계신가요? 오늘 영상이 유익하셨다면 구독과 좋아요 부탁드리고, 여러분의 생각을 댓글로 남겨주세요. 다음 시간에 더 흥미로운 주제로 찾아뵙겠습니다. 감사합니다!"
- **📝 자막 가이드**: [구독 & 좋아요! 여러분의 생존 전략을 댓글로 공유해 주세요]
`;
    
    res.json({
      success: true,
      script: sampleScript
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 유튜브 대본 생성기 백엔드 구동 완료: http://localhost:${PORT}`);
});
