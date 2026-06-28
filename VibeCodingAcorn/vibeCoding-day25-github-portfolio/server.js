import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Gemini API 초기화
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
} else {
  console.warn("⚠️ 경고: GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. AI 요약 기능이 제한됩니다.");
}

// 방문자 파일 경로
const visitorsFilePath = path.join(__dirname, 'visitors.json');

// 방문자 수 가져오기/증가 함수
async function getAndUpdateVisitorCount() {
  try {
    let data = { count: 0 };
    try {
      const fileData = await fs.readFile(visitorsFilePath, 'utf-8');
      data = JSON.parse(fileData);
    } catch (err) {
      // 파일이 없으면 새로 생성
    }
    data.count += 1;
    await fs.writeFile(visitorsFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return data.count;
  } catch (error) {
    console.error("방문자 카운트 파일 작업 실패:", error);
    return 1;
  }
}

// 1. 방문자 수 카운터 API
app.get('/api/visitor', async (req, res) => {
  const currentCount = await getAndUpdateVisitorCount();
  res.json({ success: true, count: currentCount });
});

// Gemini 요약 요청 함수
async function summarizeRepoReadme(repoName, description, language, readmeText) {
  if (!genAI) {
    return {
      summary: description || "설명이 제공되지 않은 저장소입니다.",
      techStack: language ? [language] : [],
      updates: ["프로젝트 업데이트 완료"]
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // 너무 긴 README는 모델 토큰 한계와 성능을 위해 잘라냅니다.
    const truncatedReadme = readmeText.substring(0, 3000);

    const prompt = `
당신은 숙련된 기술 분석가이자 포트폴리오 라이터입니다. 다음 GitHub 저장소의 README 내용을 분석해서, 개발자 포트폴리오에 알맞은 프로젝트 요약 정보(한글)를 추출해 주세요.

반드시 아래 지정된 JSON 포맷만 정확하게 반환해야 합니다. 앞뒤에 불필요한 설명(예: "여기에 분석 결과입니다" 등)이나 마크다운 코드 블록(\`\`\`json)은 절대 붙이지 마세요. 오직 순수 JSON 데이터만 리턴하세요.

{
  "summary": "이 프로젝트의 핵심 목표와 역할을 명확히 설명한 한국어 1줄 요약 (최대 60자)",
  "techStack": ["주요 사용 기술, 언어, 프레임워크 또는 라이브러리 (최대 5개)"],
  "updates": ["이 프로젝트의 주요 기능 특징 또는 주요 강점 2~3가지"]
}

README 내용:
${truncatedReadme}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // 마크다운 JSON 블록 정제
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error(`Gemini 요약 실패 (${repoName}):`, error.message);
    return {
      summary: description || "README 분석에 실패했으나 활발히 개발 중인 프로젝트입니다.",
      techStack: language ? [language] : [],
      updates: ["실시간 업데이트 지원", "깃허브 저장소 확인 가능"]
    };
  }
}

// 2. 포트폴리오 생성 데이터 통합 API
app.get('/api/portfolio/:username', async (req, res) => {
  const { username } = req.params;
  const githubToken = process.env.GITHUB_TOKEN;

  const headers = {};
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  try {
    // 1) GitHub 유저 정보 요청
    const userResponse = await axios.get(`https://api.github.com/users/${username}`, { headers });
    const userProfile = {
      username: userResponse.data.login,
      name: userResponse.data.name || userResponse.data.login,
      avatar_url: userResponse.data.avatar_url,
      bio: userResponse.data.bio || "소개글이 등록되지 않은 개발자입니다.",
      followers: userResponse.data.followers,
      public_repos: userResponse.data.public_repos,
      html_url: userResponse.data.html_url
    };

    // 2) GitHub 저장소 목록 요청
    const reposResponse = await axios.get(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { headers });
    
    // 포크가 아닌 본인 저장소 우선 정렬 및 상위 8개 선정 (Gemini API 호출 제한 및 가독성을 위함)
    const allRepos = reposResponse.data;
    const myRepos = allRepos
      .filter(repo => !repo.fork)
      .sort((a, b) => (b.stargazers_count + b.watchers_count) - (a.stargazers_count + a.watchers_count))
      .slice(0, 8);

    // 만약 본인 저장소가 없거나 적으면 포크된 것도 일부 포함
    if (myRepos.length < 4) {
      const forkRepos = allRepos.filter(repo => repo.fork).slice(0, 4 - myRepos.length);
      myRepos.push(...forkRepos);
    }

    // 3) 각 저장소별 README 다운로드 및 Gemini 요약 처리 (비동기 병렬 처리)
    const repoSummaryPromises = myRepos.map(async (repo) => {
      let readmeContent = "";
      try {
        const readmeRes = await axios.get(`https://api.github.com/repos/${username}/${repo.name}/readme`, { headers });
        if (readmeRes.data && readmeRes.data.content) {
          readmeContent = Buffer.from(readmeRes.data.content, 'base64').toString('utf-8');
        }
      } catch (err) {
        // README가 없거나 로드 오류가 발생하는 경우는 무시하고 기본 설명 제공
      }

      const geminiSummary = await summarizeRepoReadme(
        repo.name,
        repo.description,
        repo.language,
        readmeContent
      );

      return {
        id: repo.id,
        name: repo.name,
        description: repo.description,
        html_url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language || "Unknown",
        updated_at: repo.updated_at,
        geminiSummary
      };
    });

    const detailedRepos = await Promise.all(repoSummaryPromises);

    // 4) 사용 언어 비율 계산 (모든 저장소를 뒤져서 계산)
    const languageStats = {};
    allRepos.forEach(repo => {
      if (repo.language) {
        languageStats[repo.language] = (languageStats[repo.language] || 0) + 1;
      }
    });

    res.json({
      success: true,
      profile: userProfile,
      repos: detailedRepos,
      languages: languageStats
    });

  } catch (error) {
    console.error("포트폴리오 생성 데이터 요청 실패:", error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.status === 404 ? "GitHub 사용자를 찾을 수 없습니다." : "서버 통신 중 에러가 발생했습니다."
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 백엔드 중계 서버 구동 완료: http://localhost:${PORT}`);
});
