# Task List - vibeCoding-day27-password-generator

- [x] 프로젝트 디렉토리 생성 및 Vite 초기화
- [x] 의존성 라이브러리 설치 (React, Express, dotenv 등)
- [x] 백엔드 서버 (`server.js`) 구축
  - [x] Express 서버 및 환경 변수 연동
  - [x] `/api/generate-passwords` (자연어 패턴 분석 및 규칙 기반 JSON 3선 생성) 구현
  - [x] API 키 실패 대비 우회(Fallback) 목업 데이터 처리 로직 탑재
- [x] 프론트엔드 기본 템플릿 및 설정 수정
  - [x] `vite.config.js` 에 API 프록시 설정 추가
  - [x] `index.html` 타이틀 및 폰트 설정 수정
  - [x] `src/index.css` 네온 사이언 테마 및 사이버보안 스타일 정의
- [x] 프론트엔드 컴포넌트 개발
  - [x] `src/components/PatternInput.jsx` (자연어 입력 폼 및 프리셋 칩)
  - [x] `src/components/PasswordCard.jsx` (개별 비밀번호 렌더러 - 마스크 토글, 복사, 다른이름 저장)
  - [x] `src/App.jsx` (비밀번호 후보 3개 목록 렌더링, 로딩 및 에러 처리)
- [x] 수동 검증 및 동작 확인
  - [x] 개발 서버 구동 및 자연어 패턴 비밀번호 생성 테스트
  - [x] 마스크 토글, 클립보드 복사, 파일 저장 검증
  - [x] 프로젝트 폴더 내부 `docs/` 폴더에 최종 마크다운 및 검증 미디어 보관
