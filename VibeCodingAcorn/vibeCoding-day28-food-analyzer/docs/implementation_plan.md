# [구현 계획] AI 영양소 분석 어시스턴트 (vibeCoding-day28-food-analyzer)

사용자가 업로드한 음식 이미지나 텍스트 입력("점심: 김치볶음밥 1인분" 등)을 기반으로 음식의 예상 섭취량, 영양 성분 추정치(칼로리, 단백질, 탄수화물, 지방)를 계산하고, 개인화된 식단 조언(ai_suggestion)을 제공하는 사이드바이사이드 다크 그리드 레이아웃 웰니스 웹 애플리케이션입니다.

## User Review Required

> [!IMPORTANT]
> **멀티모달 이미지 전송 기법**
> - 별도의 서버사이드 파일 업로드 라이브러리(`multer`) 설치 및 서버 디렉토리 저장 공간 관리 문제를 피하기 위해, 프론트엔드 브라우저 레벨에서 이미지를 **Base64** 스트링으로 인코딩하여 JSON body로 백엔드에 안전하게 전송합니다.
> - 백엔드는 전달받은 Base64 데이터를 Gemini API (`inlineData`) 형태로 가공하여 멀티모달 이미지 분석을 수행합니다.

> [!TIP]
> **균일한 카드 정렬 UI (행 방향 정렬)**
> - 요구사항에 맞춰 분석 결과 카드들이 동일한 너비와 완벽한 행 방향 정렬을 유지하도록 **CSS Grid (`grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`)** 레이아웃을 핵심적으로 구축합니다.
> - 아보카도 그린(`#8bc34a` 또는 `#689f38`)과 웰니스 다크 차콜 테마를 매치하여 세련된 피트니스 대시보드 감성을 제공합니다.

## Open Questions

- 입력 방식이 파일 업로드와 텍스트 설명 2가지입니다. 둘 중 하나만 입력하거나, 혹은 이미지와 텍스트를 동시에(예: 샐러드 사진 + "드레싱 많이 뿌림"이라는 보조 설명) 전달해 더욱 정밀한 AI 영양소 보정을 유도할 수 있도록 통합 입력을 설계할까요? (동시 입력 및 단독 입력 모두 유연하게 처리할 수 있도록 구현하겠습니다.)

---

## Proposed Changes

새로운 프로젝트 폴더 `VibeCodingAcorn/vibeCoding-day28-food-analyzer` 내부에 다음 구조로 생성합니다.

```text
vibeCoding-day28-food-analyzer/
├── package.json              # 의존성 정의 (React, Vite, Express, dotenv 등)
├── vite.config.js            # Vite 빌드 및 프록시 설정
├── server.js                 # Express 백엔드 서버 (멀티모달 Gemini API 라우팅)
├── .env                      # API 키 및 포트 설정
├── index.html                # 메인 HTML 템플릿
└── src/
    ├── main.jsx              # React 엔트리 포인트
    ├── App.jsx               # 메인 대시보드 및 균일 카드 결과 관리
    ├── index.css             # 아보카도 그린 다크 테마 및 균일 정렬 Grid 스타일
    └── components/
        ├── FoodInput.jsx     # 이미지 드롭존 & 텍스트 추가 기입 창
        └── ResultDashboard.jsx # 동일 너비 행 방향 정렬 정보 카드 그룹 (음식 정보, 영양소 요약, AI 추천)
```

### [Backend Server & Config]

#### [NEW] [package.json](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day28-food-analyzer/package.json)
- `express`, `cors`, `dotenv`, `@google/generative-ai`, `concurrently` 라이브러리 정의.

#### [NEW] [vite.config.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day28-food-analyzer/vite.config.js)
- `/api` 통신을 3001번 백엔드로 프록시하도록 설정.

#### [NEW] [server.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day28-food-analyzer/server.js)
- `/api/analyze-food`:
  - `image` (Base64 스트링), `mimeType`, `text` 수집.
  - Gemini API (`gemini-1.5-flash`) 에 멀티모달 데이터 주입.
  - 프롬프트 가이드를 통해 음식 명칭, 예상 그램/ml 섭취량, 탄단지/칼로리 영양 성분 수치화, 그리고 한 줄 조언인 `ai_suggestion`을 순수 JSON 구조로 반환받음.
  - 인증 오류(404 등) 발생 시 전송 데이터 속성을 분석하여 샐러드, 김치볶음밥, 파스타 등에 대입하는 우회 Fallback 데이터 매핑 반환.

---

### [Frontend Components & Style]

#### [NEW] [src/index.css](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day28-food-analyzer/src/index.css)
- 웰니스 아보카도 그린 및 다크 오가닉 테마.
- 카드 정렬용 `.equal-grid` 레이아웃 및 펄스 스켈레톤 애니메이션.

#### [NEW] [src/components/FoodInput.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day28-food-analyzer/src/components/FoodInput.jsx)
- 이미지 Drag & Drop 파일 드롭존 (업로드된 이미지 미리보기 제공).
- 음식 텍스트 설명 보조 입력 필드.

#### [NEW] [src/components/ResultDashboard.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day28-food-analyzer/src/components/ResultDashboard.jsx)
- 행 방향 정렬 그리드로 설계된 3개의 동일 너비 정보 카드 컴포넌트:
  1. **음식 분석 카드**: 음식 명칭, 예상 섭취량, 칼로리 표기.
  2. **영양소 구성 카드**: 탄단지 수치 및 바 그래프 시각화.
  3. **AI 식단 제안 카드**: `ai_suggestion` 가독성 최적화 박스.

#### [NEW] [src/App.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day28-food-analyzer/src/App.jsx)
- 텍스트/이미지 통합 전송 로직, 분석 결과 바인딩 및 예외 렌더러 제어.

---

## Verification Plan

### Automated Tests
- 없음

### Manual Verification
- 브라우저를 열고 `http://localhost:5173/` 접속.
- 실습 1: 텍스트 입력 칸에 "김치볶음밥 1인분" 입력 후 분석을 요청해, 예상 영양소 카드 3개가 가로 크기가 똑같고 행 방향으로 칼같이 정렬되는지 UI 검사.
- 실습 2: 샐러드나 가상의 음식 이미지를 드롭존에 올려서 미리보기가 뜨는지 확인하고 분석을 돌려 mock/AI 데이터가 정상 노출되는지 확인.
- 실습 3: 최종 완료된 문서들을 프로젝트의 `docs/` 경로에 완벽히 복사하여 이주 완료.
