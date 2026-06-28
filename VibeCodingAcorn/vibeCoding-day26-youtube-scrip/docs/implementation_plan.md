# [구현 계획] 유튜브 롱폼 대본 생성기 웹앱 (vibeCoding-day26-youtube-scrip)

사용자가 유튜브 URL이나 대본 텍스트 파일을 입력하면 내용을 분석하여 어울리는 새로운 영상 제목 3개를 추천하고, 그중 하나를 선택해 재생시간 분량(5분/10분/15분)에 맞춘 마크다운 대본을 Gemini AI로 생성해 저장 및 복사할 수 있는 웹 애플리케이션입니다.

## User Review Required

> [!IMPORTANT]
> **유튜브 자막 추출 라이브러리 선정**
> - 유튜브 URL로부터 자막을 긁어오기 위해 Node.js 라이브러리인 `youtube-transcript`를 사용합니다.
> - 자막이 아예 없거나 추출 실패 시, 사용자가 직접 수동으로 **자막 텍스트 파일(.txt 등)**을 업로드하여 진행할 수 있도록 예외 처리를 튼튼하게 구축하겠습니다.

> [!TIP]
> **디자인 테마 및 UX**
> - 유튜브 스튜디오 감성의 세련된 **유튜브 레드 & 다크그레이 기반 테마**를 적용합니다.
> - 사용자의 선택 단계(1단계: 내용 입력 및 분석 -> 2단계: 제목 및 분량 선택 -> 3단계: 완성된 마크다운 대본 편집 및 저장)를 시각적으로 분할한 **단계별 위저드(Progress Wizard) 형태**의 인터페이스를 구축하여 사용성을 극대화합니다.
> - 파일 저장은 Chrome 86+ 스펙의 `window.showSaveFilePicker`를 우선 적용하여 사용자가 직접 경로를 선택하게 합니다.

## Open Questions

- 대본 작성 모델은 속도와 창의적 균형이 훌륭한 `gemini-1.5-flash` 모델을 기본으로 사용합니다. 더욱 깊이 있고 세련된 나레이션 어조를 위해 `gemini-1.5-pro` 모델을 옵션으로 선택할 수 있도록 할까요? (기본은 `gemini-1.5-flash`로 탑재하여 빠른 속도를 보장하겠습니다.)

---

## Proposed Changes

새로운 프로젝트 폴더 `VibeCodingAcorn/vibeCoding-day26-youtube-scrip` 내부에 다음 구조로 생성합니다.

```text
vibeCoding-day26-youtube-scrip/
├── package.json              # 의존성 정의 (React, Vite, Express, youtube-transcript 등)
├── vite.config.js            # Vite 빌드 및 프록시 설정
├── server.js                 # Express 백엔드 서버 (자막 추출, Gemini API 라우팅)
├── .env                      # API 키 및 포트 설정
├── index.html                # 메인 HTML 템플릿
└── src/
    ├── main.jsx              # React 엔트리 포인트
    ├── App.jsx               # 메인 대시보드 및 단계 제어 컴포넌트
    ├── index.css             # 유튜브 레드 & 다크 그레이 디자인 시스템 및 애니메이션
    └── components/
        ├── InputSection.jsx  # 유튜브 URL 입력 및 파일 업로드 컴포넌트
        ├── TitleSelector.jsx # 추천 제목 및 재생시간(5/10/15분) 선택기
        └── ScriptViewer.jsx  # 완성된 마크다운 대본 출력, 클립보드 복사, 파일 저장 컴포넌트
```

### [Backend Server & Config]

#### [NEW] [package.json](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day26-youtube-scrip/package.json)
- `express`, `cors`, `dotenv`, `axios`, `@google/generative-ai`, `youtube-transcript` 의존성 정의.
- 프론트/백엔드 동시 실행을 위한 `concurrently` 정의.

#### [NEW] [vite.config.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day26-youtube-scrip/vite.config.js)
- `/api` 호출을 백엔드 포트(3001)로 프록시하도록 설정.

#### [NEW] [server.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day26-youtube-scrip/server.js)
- `/api/analyze`: 
  - 유튜브 URL을 입력받으면 동영상 ID를 추출하여 `youtube-transcript`로 자막 텍스트를 병합.
  - 텍스트가 확보되면 Gemini API를 호출하여 콘텐츠 요약과 해당 내용을 바탕으로 흥미를 끄는 유튜브 영상 제목 3개를 추천 리스트로 생성하여 반환.
- `/api/generate-script`:
  - 선택한 제목, 원본 텍스트 분석 내용, 선택 분량(5분/10분/15분)을 기반으로 유튜브 롱폼 대본을 마크다운 형식으로 집필.
  - 대본 구성은 `[화면 연출 지시]`, `[나레이션]`, `[자막 가이드]`를 체계적으로 분류한 프로페셔널 포맷으로 작성하도록 프롬프트 튜닝.

---

### [Frontend Components & Style]

#### [NEW] [src/index.css](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day26-youtube-scrip/src/index.css)
- 유튜브 레드(`#ff0000`, `#cc0000`) 및 다크 차콜(`#1f1f1f`) 계열의 세련된 다크 테마.
- 단계 표시 바(Progress Wizard Indicator) 스타일.
- 부드러운 페이드 인 및 슬라이드 애니메이션.

#### [NEW] [src/components/InputSection.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day26-youtube-scrip/src/components/InputSection.jsx)
- 유튜브 URL 정규식 검증 입력 필드.
- 로컬 대본 텍스트 파일(.txt) 드래그 앤 드롭 및 브라우징 업로드 컴포넌트.

#### [NEW] [src/components/TitleSelector.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day26-youtube-scrip/src/components/TitleSelector.jsx)
- 추천된 제목 3개 카드 선택식 리스트.
- 재생시간 버튼 그룹 (5분, 10분, 15분).

#### [NEW] [src/components/ScriptViewer.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day26-youtube-scrip/src/components/ScriptViewer.jsx)
- 마크다운 대본 텍스트 에어리어 뷰어.
- 클립보드 원클릭 복사 버튼.
- 마크다운 다운로드(.md) 저장 버튼 (`showSaveFilePicker` 최우선 매칭 및 `revokeObjectURL` 지연 처리 규칙 준수).

#### [NEW] [src/App.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day26-youtube-scrip/src/App.jsx)
- `step` 상태(1: 입력, 2: 제목/분량 선택, 3: 대본 출력)에 따른 렌더링 스위칭 및 타이틀 요약 데이터 관리.

---

## Verification Plan

### Automated Tests
- 없음

### Manual Verification
- 웹 서버 구동 후 브라우저에서 `http://localhost:5173/` 접속.
- 실습 1: 자막이 존재하는 유튜브 영상 URL(예: 뉴스 보도, 테크 유튜버 영상 등)을 넣고 분석하여 3개의 세련된 한글 영상 제목과 핵심 내용 요약이 제안되는지 확인.
- 실습 2: 텍스트 파일을 직접 올려서 분석하는 경우에도 제목이 올바르게 제안되는지 테스트.
- 실습 3: 제목 중 하나를 선택하고 `10분` 분량을 지정하여 대본 생성을 누른 뒤, 마크다운 형식으로 연출 지시와 나레이션이 포함된 고화질 대본이 작성되는지 검증.
- 실습 4: **'클립보드 복사'** 작동 확인 및 **'.md 파일 저장'** 클릭 시 브라우저 "다른 이름으로 저장" 창이 열리며 지정된 폴더에 파일이 잘 쓰여지는지 확인.
- 실습 5: 프로젝트 완료 문서들을 프로젝트 내부의 `docs/` 폴더로 완벽히 복사하여 워크스루 작성 완료.
