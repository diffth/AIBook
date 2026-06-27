const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// API 캐시 방지 미들웨어
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Gemini AI 초기화
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// ─── 스마트 폴백 이미지 데이터셋 ──────────────────────────────────────────
const FALLBACK_IMAGES = {
  tech: [
    { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80', author: 'Alexandre Debiève', profile: 'https://unsplash.com/@alexandre_debieve' },
    { url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80', author: 'Ilya Pavlov', profile: 'https://unsplash.com/@ilyapavlov' },
    { url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=80', author: 'Christopher Gower', profile: 'https://unsplash.com/@cgower' },
    { url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80', author: 'Marek Piwnicki', profile: 'https://unsplash.com/@marekpiwnicki' }
  ],
  nature: [
    { url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&auto=format&fit=crop&q=80', author: 'v2osc', profile: 'https://unsplash.com/@v2osc' },
    { url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1200&auto=format&fit=crop&q=80', author: 'Lukasz Szmigiel', profile: 'https://unsplash.com/@szmigieldesign' },
    { url: 'https://images.unsplash.com/photo-1472214222541-d510753a8707?w=1200&auto=format&fit=crop&q=80', author: 'Kalen Emsley', profile: 'https://unsplash.com/@kalenemsley' },
    { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80', author: 'Bailey Zindel', profile: 'https://unsplash.com/@baileyzindel' }
  ],
  health: [
    { url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&auto=format&fit=crop&q=80', author: 'Sven Mieke', profile: 'https://unsplash.com/@discovershapes' },
    { url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&auto=format&fit=crop&q=80', author: 'Mor Shani', profile: 'https://unsplash.com/@morshani' },
    { url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&auto=format&fit=crop&q=80', author: 'Brooke Lark', profile: 'https://unsplash.com/@brookelark' },
    { url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&auto=format&fit=crop&q=80', author: 'Jared Rice', profile: 'https://unsplash.com/@jaredrice' }
  ],
  lifestyle: [
    { url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80', author: 'Jonas Jacobsson', profile: 'https://unsplash.com/@jonasjacobsson' },
    { url: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=1200&auto=format&fit=crop&q=80', author: 'Brooke Cagle', profile: 'https://unsplash.com/@brookecagle' },
    { url: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=1200&auto=format&fit=crop&q=80', author: 'Silias Baisch', profile: 'https://unsplash.com/@silias' },
    { url: 'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=1200&auto=format&fit=crop&q=80', author: 'Emma Matthews', profile: 'https://unsplash.com/@emmamatthews' }
  ],
  travel: [
    { url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&auto=format&fit=crop&q=80', author: 'Chen Minqi', profile: 'https://unsplash.com/@chenminqi' },
    { url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&auto=format&fit=crop&q=80', author: 'Dino Reichmuth', profile: 'https://unsplash.com/@dinoreichmuth' },
    { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80', author: 'Sean Oulashin', profile: 'https://unsplash.com/@seano' },
    { url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&auto=format&fit=crop&q=80', author: 'Harvey Lancelot', profile: 'https://unsplash.com/@harveylancelot' }
  ],
  business: [
    { url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80', author: 'Campaign Creators', profile: 'https://unsplash.com/@campaign_creators' },
    { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80', author: 'Loïc Fürhoff', profile: 'https://unsplash.com/@loic_furhoff' },
    { url: 'https://images.unsplash.com/photo-1491975458591-174929889a04?w=1200&auto=format&fit=crop&q=80', author: 'Leon', profile: 'https://unsplash.com/@leon' },
    { url: 'https://images.unsplash.com/photo-1552581230-c01591d6f59a?w=1200&auto=format&fit=crop&q=80', author: 'Mimi Thian', profile: 'https://unsplash.com/@mimithian' }
  ],
  food: [
    { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80', author: 'Lily Banse', profile: 'https://unsplash.com/@lvnatikk' },
    { url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&auto=format&fit=crop&q=80', author: 'Jimmy Dean', profile: 'https://unsplash.com/@jimmydean' },
    { url: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=1200&auto=format&fit=crop&q=80', author: 'Aditya Romansa', profile: 'https://unsplash.com/@adityaromansa' },
    { url: 'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=1200&auto=format&fit=crop&q=80', author: 'Marianne Krohn', profile: 'https://unsplash.com/@mariannekrohn' }
  ]
};

// ─── API 1: 블로그 글 콘텐츠 생성 ───────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const { keyword, tone = 'friendly', length = 'medium' } = req.body;

  if (!keyword) {
    return res.status(400).json({ error: '블로그 주제 키워드를 입력해 주세요.' });
  }

  if (!genAI) {
    return res.status(500).json({ error: '서버에 GEMINI_API_KEY가 설정되어 있지 않습니다.' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let tonePrompt = '친근하고 부드러운 대화체';
    if (tone === 'professional') tonePrompt = '전문적이고 신뢰감을 주는 비즈니스 어조';
    if (tone === 'creative') tonePrompt = '독창적이고 감성적이며 위트 있는 흥미진진한 말투';

    let lengthPrompt = '각 문단(서론, 본론, 결론)별로 3-4문장 정도의 중간 길이';
    if (length === 'short') lengthPrompt = '각 문단별로 2-3문장 정도로 짧고 명쾌한 길이';
    if (length === 'long') lengthPrompt = '각 문단별로 6-8문장 이상 구체적이고 디테일한 정보와 풍부한 묘사를 담은 긴 길이';

    const prompt = `
      사용자가 입력한 블로그 키워드: "${keyword}"
      
      이 키워드를 분석하여 아래의 조건에 맞춰 완성도 높은 한국어 블로그 글을 작성해 줘.
      
      [조건]
      1. 어조 및 분위기: ${tonePrompt}
      2. 분량 상세: ${lengthPrompt}
      3. 구성: 제목, 요약, 서론, 본론, 결론, 연관 해시태그 5개, 썸네일 이미지 설명문(imagePrompt)
      
      [출력 포맷 지침]
      반드시 다른 텍스트 설명이나 Markdown 코드 블록 기호(\`\`\`json)는 절대 붙이지 말고, 오직 유효한 순수 JSON 객체로만 응답해 줘. JSON 구조는 반드시 다음과 같아야 해:
      {
        "title": "SEO 최적화가 적용된 강력하고 시선을 사로잡는 제목",
        "summary": "블로그 전체 글을 관통하는 한 문장 핵심 요약 (최대 100자)",
        "introduction": "주제에 흥미를 유발하고 필요성을 설명하는 서론 본문 내용",
        "body": "주제에 대한 실용적 팁, 방법론, 분석 의견을 담은 본론 본문 내용 (단락 구분을 위한 적절한 줄바꿈 포함 가능)",
        "conclusion": "내용을 정리하고 독자에게 실천 방안 또는 끝인사를 전하는 결론 본문 내용",
        "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
        "imagePrompt": "DALL-E 또는 Midjourney에 바로 복사해 넣을 수 있는, 이 블로그 글의 썸네일에 어울리는 고화질 그래픽 이미지 묘사 영문 프롬프트 (예: 'A conceptual digital illustration of... detailed, 8k resolution, modern design')"
      }
      
      * 주의: "tags" 배열에는 정확히 5개의 관련 핵심 키워드 해시태그 문자열을 생성해야 해.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    let cleanJsonStr = text;
    if (text.startsWith('```')) {
      const match = text.match(/```(?:json)?([\s\S]*?)```/);
      if (match) {
        cleanJsonStr = match[1].trim();
      }
    }

    try {
      const blogData = JSON.parse(cleanJsonStr);
      // 해시태그 개수가 5개 이하 혹은 이상일 때 보정 처리
      if (!blogData.tags || !Array.isArray(blogData.tags)) {
        blogData.tags = ['blog', 'writing', 'ai', 'content', 'info'];
      }
      while (blogData.tags.length < 5) {
        blogData.tags.push('tag' + (blogData.tags.length + 1));
      }
      if (blogData.tags.length > 5) {
        blogData.tags = blogData.tags.slice(0, 5);
      }

      res.json({ success: true, data: blogData });
    } catch (parseErr) {
      console.error('[Gemini Response JSON Parse Error]', cleanJsonStr);
      res.status(500).json({
        error: 'AI 응답 데이터 구조화(JSON)에 실패했습니다.',
        raw: text
      });
    }

  } catch (error) {
    console.error('[Gemini API Server Error]', error);
    res.status(500).json({ error: 'Gemini API 호출 중 에러가 발생했습니다.', details: error.message });
  }
});

// ─── API 2: Unsplash 이미지 검색 ───────────────────────────────────────────
// Unsplash 공식 API 가이드라인을 완전하게 준수
app.post('/api/images', async (req, res) => {
  const { keyword } = req.body;
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!keyword) {
    return res.status(400).json({ error: '검색할 이미지 키워드가 필요합니다.' });
  }

  // 1. Unsplash Key가 설정되어 있는 경우 정식 API 호출 시도 (가이드라인 헤더 적용)
  if (unsplashKey && unsplashKey.trim() !== '') {
    try {
      console.log(`[Unsplash] Fetching images for query: ${keyword}`);
      const response = await axios.get('https://api.unsplash.com/search/photos', {
        params: {
          query: keyword,
          per_page: 4,
          orientation: 'landscape'
        },
        headers: {
          Authorization: `Client-ID ${unsplashKey.trim()}`
        }
      });

      const photos = response.data.results;
      if (photos && photos.length > 0) {
        const formatted = photos.map(photo => ({
          url: photo.urls.regular,
          author: photo.user.name,
          profile: photo.user.links.html
        }));
        return res.json({ success: true, source: 'unsplash_api', images: formatted });
      }
    } catch (apiErr) {
      console.warn('[Unsplash API Error / Limits reached. Falling back to local smart match]', apiErr.message);
    }
  }

  // 2. Fallback 로직: 스마트 분류기 가동
  console.log('[Unsplash] Running smart fallback image matcher...');
  
  let category = 'lifestyle';
  const kw = keyword.toLowerCase();

  if (/개발|코딩|컴퓨터|테크|기술|it|스마트|ai|빅데이터|소프트웨어|프로그램|code|computer|tech/g.test(kw)) {
    category = 'tech';
  } else if (/자연|풍경|캠핑|산|바다|하늘|꽃|나무|힐링|nature|landscape|sky/g.test(kw)) {
    category = 'nature';
  } else if (/건강|요가|피트니스|헬스|운동|다이어트|샐러드|명상|health|fitness|workout/g.test(kw)) {
    category = 'health';
  } else if (/여행|휴가|호텔|비행기|관광|해외|travel|trip|vacation/g.test(kw)) {
    category = 'travel';
  } else if (/비즈니스|회사|업무|주식|경제|투자|마케팅|회의|business|economy|marketing/g.test(kw)) {
    category = 'business';
  } else if (/음식|맛집|요리|디저트|카페|커피|베이커리|food|cooking|coffee/g.test(kw)) {
    category = 'food';
  }

  const images = FALLBACK_IMAGES[category] || FALLBACK_IMAGES.lifestyle;
  res.json({ success: true, source: `fallback_${category}`, images });
});

// React 빌드 정적 배포 서빙 (production 환경 대비)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// 그 외 모든 경로는 React 엔트리로 서빙 (SPA 라우팅)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    // 빌드 파일이 없을 경우 대비
    if (err) {
      res.status(200).send('React Vite 개발 서버(포트 5173) 또는 빌드(dist) 파일을 구동해 주세요.');
    }
  });
});

app.listen(PORT, () => {
  console.log('===============================================');
  console.log(`🚀 Unsplash Blog Server running on port ${PORT}`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log('===============================================');
});
