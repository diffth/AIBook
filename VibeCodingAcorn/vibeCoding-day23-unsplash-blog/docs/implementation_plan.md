# React/Vite 기반 AI 블로그 콘텐츠 생성기 구현 계획 (Day 23)

사용자가 주제 키워드를 입력하면 Google Gemini API를 활용하여 다음 요소를 생성합니다:
1. SEO 최적화된 제목 (title)
2. 3단 구성 본문 (서론, 본론, 결론)
3. 한 문장 요약 (summary)
4. 관련 해시태그 5개
5. 썸네일 이미지 설명문 (imagePrompt)

이 결과를 Unsplash API를 연동한 이미지 검색 및 대표 이미지 선택 기능과 함께 **React + Vite 프론트엔드**를 통해 아름다운 UI로 출력합니다.

## User Review Required

> [!IMPORTANT]
> **프로젝트 아키텍처 개편**
> - 프론트엔드를 **React 및 Vite** 기반의 단일 페이지 애플리케이션으로 완전 개편합니다.
> - 백엔드는 Express.js를 동일하게 사용하되, React Vite 개발 서버(`http://localhost:5173`)와 Express 백엔드 API 서버(`http://localhost:3000`)를 분리하여 동시에 기동하거나, 빌드된 React를 Express가 서빙할 수 있도록 구성합니다. 개발의 편리함을 위해 Vite Dev Server의 proxy 설정을 사용하여 API 호출 시 CORS 에러 없이 작동하도록 합니다.
> 
> **추가 데이터 생성 및 제공**
> - **해시태그 5개**: Gemini가 글의 맥락에 딱 맞는 핵심 해시태그 5개를 생성하여 칩(Chip) UI로 출력합니다.
> - **썸네일 이미지 설명문(Image Prompt)**: 생성된 블로그 내용을 잘 나타낼 수 있는 미드저니, DALL-E 스타일의 고화질 이미지 프롬프트를 영어로 상세히 생성하여 사용자에게 시각적으로 보여줍니다.

## Open Questions

> [!NOTE]
> 1. **Unsplash API Key**: Unsplash 공식 API 가이드를 준수하여 백엔드 `.env`에 키를 입력해 작동하도록 구축합니다. 단, API 키가 없을 때도 데모가 죽지 않도록 스마트 이미지 분류 매칭 Fallback은 그대로 유지합니다.
> 2. **이메일 발행/내보내기**: 복사, Markdown/HTML 저장과 더불어 생성된 본문 전체를 텍스트 클립보드에 원클릭으로 쉽게 옮기는 기능도 기본 제공합니다.

## Proposed Changes

이 프로젝트는 `e:\AI_DEV\AIBook\VibeCodingAcorn\vibeCoding-day23-unsplash-blog` 폴더 내에 구축됩니다.

---

### Project Structure (Vite React + Express)

Vite React를 현재 디렉토리에 설치하고, Express 서버 코드를 병합하여 다음과 같이 구성합니다:

```
vibeCoding-day23-unsplash-blog/
├── package.json         ← React/Express 의존성 및 스크립트 통합
├── vite.config.js       ← Vite 설정 및 Express API Proxy 설정
├── server.js            ← Express 백엔드 API 서버
├── .env                 ← API 키 관리
├── src/                 ← React 소스코드
│   ├── main.jsx
│   ├── App.jsx
│   ├── App.css
│   └── components/      ← 로더, 블로그 미리보기, 갤러리 컴포넌트
└── index.html           ← React 엔트리 HTML
```

---

### Backend (Node.js/Express)

#### [MODIFY] [server.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day23-unsplash-blog/server.js)
- `/api/generate` API에서 다음 요소를 추가하여 Gemini AI 프롬프트를 확장합니다:
  - **해시태그 5개**: `tags` 배열이 정확히 5개의 키워드를 갖도록 강제.
  - **이미지 설명문**: `imagePrompt` 필드를 추가하여 썸네일 생성을 위한 영어 이미지 묘사 프롬프트를 도출.
- `/api/images` API: Unsplash API 가이드라인에 따라 API 호출 시 `Authorization: Client-ID [Access Key]` 헤더 적용 및 키워드 기반 연동 제공.

---

### Frontend (React/Vite)

#### [NEW] [vite.config.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day23-unsplash-blog/vite.config.js)
Vite 개발 서버 환경에서 `/api` 경로의 모든 요청을 Express 서버(`http://localhost:3000`)로 프록싱하도록 설정합니다.

#### [NEW] [src/App.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day23-unsplash-blog/src/App.jsx)
- 상태 기반(Stateful) UI 전환을 통해 `입력 폼 -> 로딩/스텝 트래커 -> 결과 뷰어` 단계를 제어합니다.
- Gemini로부터 생성된 내용을 멋진 카드 및 텍스트 단락으로 노출합니다.
- Unsplash 이미지 검색 결과 리스트에서 마우스 클릭 시, 블로그 대표 커버 이미지가 부드러운 애니메이션과 함께 교체되는 상태(State) 로직을 탑재합니다.
- `showSaveFilePicker` API를 통한 Markdown 및 HTML "다른 이름으로 저장" 모달을 연동합니다.

#### [NEW] [src/App.css](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day23-unsplash-blog/src/App.css)
- 기존 다크 네온 및 글래스모피즘 테마를 React 전용 컴포넌트 스타일에 맞춰 정교하게 재작성합니다.

---

## Verification Plan

### Automated Tests
1. **Vite 빌드 테스트**:
   `npm run build`를 구동하여 React 빌드가 에러 없이 완벽하게 수행되는지 검증합니다.
2. **API 응답 테스트**:
   수정된 `/api/generate`를 호출하여 `tags` 개수(5개)와 `imagePrompt` 필드가 JSON 내에 정상적으로 존재하는지 확인합니다.

### Manual Verification
1. `npm run dev` 명령어로 개발 서버를 켭니다.
2. 브라우저에서 `http://localhost:5173`으로 접속합니다.
3. 키워드를 입력하고 "블로그 생성"을 진행하여, 해시태그 5개 칩과 썸네일 프롬프트가 예쁘게 표시되는지 확인합니다.
4. Unsplash 연동 이미지 중 하나를 클릭하면 커버가 잘 교체되는지 확인합니다.
5. Markdown/HTML 저장을 눌러 "다른 이름으로 저장" 다이얼로그 창이 정상 팝업되는지 검증합니다.
