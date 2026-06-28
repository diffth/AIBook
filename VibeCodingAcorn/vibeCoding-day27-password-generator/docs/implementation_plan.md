# [구현 계획] 자연어 기반 AI 비밀번호 생성기 (vibeCoding-day27-password-generator)

사용자가 입력한 자연어 패턴(예: "영화 제목 기반, 12자 이상, 특수문자 포함")과 보안 옵션에 따라 정보 엔트로피가 높으면서도 기억하기 쉬운 3가지 비밀번호 후보군과 각 후보별 직관적인 기억 가이드(Leetspeak 치환 규칙 등)를 Gemini AI를 통해 자동 생성하여 안전하게 관리하는 사이버보안 테마 웹 애플리케이션입니다.

## User Review Required

> [!IMPORTANT]
> **출력 규격 및 키 매핑 준수**
> - 사용자의 엄격한 요구 규칙에 따라, API 응답 및 데이터 구조의 키 이름을 `pwd` (비밀번호)와 `node` (기억 가이드 설명)로 완벽히 일치시켜 구현합니다.
> - 보안 준수 규칙(금지 단어 "password", "1234" 필터링, 대/소문자/숫자/특수문자 필수 충족 조건)을 에이전트 프롬프트 및 백엔드 유효성 검사에서 더블 체킹하도록 설계합니다.

> [!TIP]
> **디자인 테마 및 UX**
> - 해커, 사이버보안, 메트릭스 톤의 **네온 사이언(Neon Cyan) & 다크 차콜 계열 테마**를 적용하여 프리미엄 보안 도구의 느낌을 구현합니다.
> - 비밀번호 유출 방지를 위해 기본적으로 마스킹(`••••••••`) 처리하고, 눈모양 아이콘 클릭 시 비밀번호가 노출되는 안구 보호(Privacy) 기능을 탑재합니다.
> - 생성된 비밀번호 중 마음에 드는 항목을 텍스트 파일(.txt)로 지정 경로에 저장할 수 있도록 Chrome 86+ `window.showSaveFilePicker` API를 연동합니다.

## Open Questions

- 비밀번호 후보 3개를 생성할 때, 각각의 비밀번호가 해킹 공격(Brute Force 등)에 대해 얼마나 안전한지 대략적인 시간 지표(예: "일반 컴퓨터로 크랙하는 데 300년 소요")를 가상으로 계산하여 보너스 요소로 카드에 시각화해 주면 어떨까요? (더욱 WOW 요소를 줄 수 있는 기능으로 추가 탑재하겠습니다!)

---

## Proposed Changes

새로운 프로젝트 폴더 `VibeCodingAcorn/vibeCoding-day27-password-generator` 내부에 다음 구조로 생성합니다.

```text
vibeCoding-day27-password-generator/
├── package.json              # 의존성 정의 (React, Vite, Express, dotenv 등)
├── vite.config.js            # Vite 빌드 및 프록시 설정
├── server.js                 # Express 백엔드 서버 (Gemini API 라우팅)
├── .env                      # API 키 및 포트 설정
├── index.html                # 메인 HTML 템플릿
└── src/
    ├── main.jsx              # React 엔트리 포인트
    ├── App.jsx               # 메인 대시보드 및 비밀번호 목록 관리
    ├── index.css             # 네온 사이언 테마 시스템 CSS
    └── components/
        ├── PatternInput.jsx  # 자연어 요구사항 입력 및 추천 프리셋 칩 그룹
        └── PasswordCard.jsx  # 비밀번호 3선 결과 카드 (마스킹 토글, 복사, 저장 및 기억 힌트 렌더러)
```

### [Backend Server & Config]

#### [NEW] [package.json](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day27-password-generator/package.json)
- `express`, `cors`, `dotenv`, `@google/generative-ai`, `concurrently` 라이브러리 탑재.

#### [NEW] [vite.config.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day27-password-generator/vite.config.js)
- `/api` 호출을 3001번 백엔드로 프록시 설정.

#### [NEW] [server.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day27-password-generator/server.js)
- `/api/generate-passwords`:
  - 사용자가 전송한 자연어 `pattern` 수집.
  - Gemini API (`gemini-1.5-flash`)를 호출하며 `apiVersion: 'v1'` 지정을 명시하여 안정적으로 호출.
  - 프롬프트에 Leetspeak 치환 기법(예: E->3, A->@, S->5, O->0 등)을 활용해 비밀번호를 작성하되, 기억 안내 가이드를 한글로 `node` 키에 담도록 지시.
  - 프롬프트 예외 필터링: "password", "1234", "qwerty" 함유 금지 가이드 포함.
  - JSON 배열 파싱 후 클라이언트에 응답.

---

### [Frontend Components & Style]

#### [NEW] [src/index.css](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day27-password-generator/src/index.css)
- 블랙 배경에 사이언 네온 글로우 및 사이버네틱 카드 템플릿.
- 터미널 느낌의 폰트 및 모노스페이스 폰트 매핑.

#### [NEW] [src/components/PatternInput.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day27-password-generator/src/components/PatternInput.jsx)
- 자연어 입력 필드.
- 빠른 입력을 돕는 "인기 프리셋 칩" 기능 (예: "영화 아바타 기반, 14자", "인생 목표 문장, 12자, 특수문자 필수" 등).

#### [NEW] [src/components/PasswordCard.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day27-password-generator/src/components/PasswordCard.jsx)
- 개별 비밀번호의 보기/숨기기(마스킹) 상태 토글.
- 원클릭 클립보드 복사.
- `showSaveFilePicker`를 통한 보안 안전 비밀번호 저장.
- 크랙 예상 시간 보너스 시각 지표 표기.
- 기억 가이드(`node` 정보) 출력.

#### [NEW] [src/App.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day27-password-generator/src/App.jsx)
- 3개의 비밀번호 후보 카드 배열 출력 및 로딩 펄스 상태 제어.

---

## Verification Plan

### Automated Tests
- 없음

### Manual Verification
- 브라우저를 열고 `http://localhost:5173/` 접속.
- 실습 1: 프리셋 칩 중 하나("영화 타이타닉 기반, 12자 이상")를 눌러서 자연어 전송 후, 3가지 개성 있는 비밀번호와 Leetspeak 기억법이 유려하게 렌더링되는지 확인.
- 실습 2: 비밀번호 마스크 토글(눈모양 아이콘) 클릭 시 일반 텍스트로 보이며, 클립보드 복사 시 클립보드에 해당 값이 들어가 복사 완료 메시지가 뜨는지 확인.
- 실습 3: 개별 비밀번호의 **'비밀번호 파일 저장'**을 누르고 브라우저의 다른이름으로 저장 윈도우 다이얼로그를 통해 메모장(.txt)으로 정상 쓰기 처리되는지 검증.
- 실습 4: 수동 검증 성공 후 프로젝트 폴더 내부의 `docs/` 폴더에 관련 기획안, 태스크 리스트, 워크스루 보고서 및 시연 미디어를 안전하게 영구 복사.
