# 🚀 Github Actions & Product Hunt 자동 배포 파이프라인

본 저장소는 커밋과 동시에 Vercel에 자동으로 빌드/배포를 완료하고, 배포된 실시간 URL 정보를 토대로 **Gemini 1.5 Flash API**를 이용해 매력적인 마케팅 문구(제목, 태그라인, 설명, 카테고리 태그)를 자동 생성한 뒤, **Product Hunt V2 API**에 신규 릴리즈 포스트를 자동 등록하는 자동화 파이프라인 패키지입니다.

---

## ⚙️ 작동 아키텍처

```mermaid
graph TD
    A[Git Commit & Push to main] --> B[GitHub Actions Trigger]
    B --> C[Vercel Production Deploy]
    C -->|배포 URL 획득| D[Gemini 1.5 Flash API 호출]
    D -->|AI 홍보 텍스트 생성| E[Product Hunt GraphQL V2 API 호출]
    E --> F[자동 포스트 런칭 완료]
```

---

## 🔑 Github Secrets 사전 설정

GitHub Actions 워크플로우가 클라우드 인프라와 외부 API에 정상적으로 접근할 수 있도록, 대상 GitHub Repository의 **Settings > Secrets and variables > Actions** 메뉴에 아래의 비밀 키들을 등록해야 합니다.

| Secrets 변수명 | 설명 | 획득 방법 |
| :--- | :--- | :--- |
| `VERCEL_TOKEN` | Vercel 계정 인증 토큰 | Vercel Dashboard > Account Settings > Tokens |
| `VERCEL_ORG_ID` | Vercel 조직(팀/개인) 고유 ID | 로컬 터미널에서 `vercel link` 실행 후 `.vercel/project.json`에서 확인 |
| `VERCEL_PROJECT_ID`| Vercel 프로젝트 ID | 로컬 터미널에서 `vercel link` 실행 후 `.vercel/project.json`에서 확인 |
| `GEMINI_API_KEY` | Gemini AI 콘텐츠 생성 API 키 | [Google AI Studio](https://aistudio.google.com/)에서 키 발급 |
| `PRODUCT_HUNT_DEVELOPER_TOKEN` | Product Hunt API 호출용 Token | [Product Hunt API Dashboard](https://www.producthunt.com/v2/oauth/applications)에서 개발자 토큰 발급 |

---

## 🛰️ API curl POST 테스트 예시

GitHub Actions 환경 외의 로컬 터미널이나 서버 등에서 API가 정상적으로 동작하는지 수동 검증하기 위한 `curl` 명령어 예시입니다.

### 1. Gemini API (1.5 Flash) 홍보 메타데이터 자동 생성 예시
이 명령은 프로젝트 정보를 바탕으로 포스팅에 필요한 요약 정보를 구조화된 JSON 데이터로 안전하게 반환하도록 요청합니다.

```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_GEMINI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "contents": [{
         "parts": [{
           "text": "Generate a Product Hunt launching post in English. Commit: \"feat: neon habit tracker UI implemented\", Deploy URL: \"https://vivid-habit-tracker.vercel.app\". Reply in strict JSON with keys: name, tagline, description, tags."
         }]
       }],
       "generationConfig": {
         "responseMimeType": "application/json"
       }
     }'
```

### 2. Product Hunt V2 API (GraphQL) 신규 포스트 등록 예시
Product Hunt V2 GraphQL 규격에 따른 포스팅 생성 요청 명령어입니다.

```bash
curl -X POST "https://api.producthunt.com/v2/api/graphql" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_PRODUCT_HUNT_DEVELOPER_TOKEN" \
     -d '{
       "query": "mutation CreateProductHuntPost($input: PostCreateInput!) { postCreate(input: $input) { post { id name tagline slug } errors { attribute message } } }",
       "variables": {
         "input": {
           "name": "Vivid Habit Tracker",
           "tagline": "Premium habit tracker with glassmorphism UI & neon glows",
           "description": "Visualize your habits in a 7x5 neon grid and track your current streaks locally and safely.",
           "url": "https://vivid-habit-tracker.vercel.app",
           "tagNames": ["Productivity", "Developer Tools"]
         }
       }
     }'
```

---

## 📁 구성 파일 경로

- **워크플로우 설정**: [.github/workflows/deploy.yml](file:///e:/AI_DEV/AIBook/vibeCoding-day30-depoly/.github/workflows/deploy.yml)
- **Node.js 환경 파일**: [package.json](file:///e:/AI_DEV/AIBook/vibeCoding-day30-depoly/scripts/package.json)
- **파이프라인 연동 스크립트**: [generate-and-post.js](file:///e:/AI_DEV/AIBook/vibeCoding-day30-depoly/scripts/generate-and-post.js)
