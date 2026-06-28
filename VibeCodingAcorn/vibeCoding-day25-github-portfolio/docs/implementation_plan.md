# [구현 계획] 자동 포트폴리오 생성 웹앱 (vibeCoding-day25-github-portfolio)

사용자가 GitHub 아이디를 입력하면, 해당 사용자의 저장소(Repository) 목록을 가져오고 각 저장소의 README 내용을 Gemini AI를 통해 요약하여 주요 기술, 프로젝트 설명, 최근 업데이트 정보를 미려한 대시보드로 시각화해주는 React 기반 웹 애플리케이션입니다.

## User Review Required

> [!IMPORTANT]
> **API 키 보안과 CORS 방지를 위한 구조**
> - 클라이언트에서 직접 Gemini API를 호출하면 API Key가 노출되고, GitHub API의 호출 제한(Rate Limit)을 피하기 어렵습니다.
> - 따라서 Express 기반의 간단한 백엔드 프록시 서버(`server.js`)를 함께 구축하여 API 호출을 중계하고, 방문자 수를 카운트하는 백엔드 API를 제공하도록 설계합니다.
> - 백엔드는 `.env` 파일의 `GEMINI_API_KEY`와 `GITHUB_TOKEN`(선택사항, Rate Limit 증가용)을 참조합니다.

> [!TIP]
> **디자인 컨셉**
> - 프리미엄 다크 테마(Dark Mode) 및 글래스모피즘(Glassmorphism) 스타일을 적용하여 시각적 완성도를 높입니다.
> - `chart.js` 및 `react-chartjs-2`를 도입하여 사용 언어 비율을 아름다운 도넛 차트로 보여줍니다.
> - 페이지 로드 시 및 카드 호버 시 부드러운 애니메이션 효과를 부여합니다.

## Open Questions

- Gemini API Key는 어떤 모델을 기본으로 사용할까요? (코드상에서는 범용적이고 빠른 `gemini-1.5-flash` 모델을 사용하여 요약 속도를 극대화할 예정입니다.)
- 방문자 수 카운팅은 서버 메모리 및 로컬 파일(`visitors.json`) 기반으로 영속화할 예정입니다. Firebase DB 등 다른 DB 인프라가 필요할까요? (현재는 단독 실행 가능한 파일 기반 경량 솔루션을 제안합니다.)

---

## Proposed Changes

새로운 프로젝트 폴더 `VibeCodingAcorn/vibeCoding-day25-github-portfolio` 내부에 아래와 같은 구조로 생성합니다.

```text
vibeCoding-day25-github-portfolio/
├── package.json              # 의존성 정의 (React, Vite, Express, chart.js 등)
├── vite.config.js            # Vite 빌드 및 프록시 설정
├── server.js                 # Express 백엔드 프록시 및 방문자 카운트 서버
├── .env                      # API 키 및 포트 설정
├── index.html                # 메인 HTML 템플릿
└── src/
    ├── main.jsx              # React 엔트리 포인트
    ├── App.jsx               # 메인 애플리케이션 컴포넌트
    ├── index.css             # Vanilla CSS 글로벌 스타일 및 테마 토큰
    └── components/
        ├── ProfileCard.jsx   # GitHub 사용자 프로필 카드
        ├── LanguageChart.jsx # 언어 비율 시각화 차트 컴포넌트
        ├── RepoGrid.jsx      # 저장소 요약 카드 그리드
        └── VisitorCounter.jsx# 방문자 카운터 표시기
```

### [Backend Server & Config]

#### [NEW] [package.json](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day25-github-portfolio/package.json)
- `react`, `react-dom`, `chart.js`, `react-chartjs-2`, `lucide-react` 등 프론트엔드 라이브러리 추가.
- `express`, `cors`, `dotenv`, `@google/generative-ai`, `axios` 등 백엔드 중계 서버 라이브러리 추가.
- 개발 편의를 위해 `concurrently`를 사용해 프론트와 백엔드를 동시에 띄울 수 있도록 구성.

#### [NEW] [vite.config.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day25-github-portfolio/vite.config.js)
- 프론트엔드 포트(5173)에서 백엔드 포트(3001)로 `/api` 요청을 프록시하도록 설정하여 CORS 이슈를 미연에 방지합니다.

#### [NEW] [server.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day25-github-portfolio/server.js)
- `/api/visitor`: 방문자 수를 읽고 1씩 증가시킨 뒤 파일(`visitors.json`)에 저장 및 반환.
- `/api/portfolio/:username`:
  1. GitHub API로 유저 정보 및 저장소 목록(`repos`)을 로드.
  2. 리포지토리별로 README 파일(`README.md` 등) 텍스트를 비동기 병렬 조회.
  3. README 내용이 있는 경우, Gemini API에 전달하여 프로젝트 설명(1줄 요약), 주요 사용 기술(태그 리스트), 최근 업데이트 특징을 핵심만 한국어로 추출하도록 프롬프트 작성 후 호출.
  4. 가공된 데이터와 총 언어 통계(Language Ratio) 데이터를 조합하여 클라이언트로 반환.

#### [NEW] [.env](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day25-github-portfolio/.env)
- `GEMINI_API_KEY=YOUR_GEMINI_API_KEY`
- `PORT=3001`
- `GITHUB_TOKEN=OPTIONAL_GITHUB_TOKEN` (레이트 리밋 해제용)

---

### [Frontend Components & Style]

#### [NEW] [src/index.css](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day25-github-portfolio/src/index.css)
- 세련된 퍼플-네이비 그라디언트 테마.
- 글래스모피즘 클래스(`.glass-card`), 입력 필드, 부드러운 스켈레톤 로딩 애니메이션 디자인 포함.
- 반응형 미디어 쿼리 정의.

#### [NEW] [src/components/LanguageChart.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day25-github-portfolio/src/components/LanguageChart.jsx)
- Chart.js (`Doughnut` 타입)를 활용하여 사용자가 진행한 전체 프로젝트의 언어 소스 비율(예: JavaScript 50%, HTML 20% 등)을 미려한 도넛 차트로 표기.

#### [NEW] [src/components/RepoGrid.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day25-github-portfolio/src/components/RepoGrid.jsx)
- 요약된 저장소 목록을 카드 리스트 형태로 렌더링.
- 각 카드에 Gemini 요약 정보(설명, 기술 스택 태그, 최근 업데이트 요약) 및 깃허브 링크, 스타/포크 수 표시.

#### [NEW] [src/App.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day25-github-portfolio/src/App.jsx)
- 전체 레이아웃 제어 및 데이터 상태 관리.
- 자동 새로고침(Auto-refresh) 타이머 토글 기능 제공 (예: 60초 간격으로 백엔드에서 포트폴리오 데이터를 리로드).
- 사용자 입력 폼 및 에러 핸들링.

---

## Verification Plan

### Automated Tests
- 없음 (프론트엔드/백엔드 단독 구성)

### Manual Verification
- 백엔드 서버 구동 및 Gemini API 정상 호출 테스트.
- 웹 페이지에서 GitHub 사용자 아이디(예: `diffth` 또는 본인의 아이디)를 입력하여:
  1. 프로필 이미지와 정보가 제대로 표시되는지 확인.
  2. 사용 언어 비율 도넛 차트가 정상적으로 그려지는지 확인.
  3. 리포지토리 목록 카드에 Gemini가 한국어로 요약한 주요 기술, 프로젝트 설명, 최근 업데이트 내용이 깔끔하게 표시되는지 확인.
  4. 실시간 방문자 수 카운터가 증가하는지 테스트.
  5. 60초 자동 새로고침 토글 시 타이머 진행 표시 및 재요청 여부 확인.
