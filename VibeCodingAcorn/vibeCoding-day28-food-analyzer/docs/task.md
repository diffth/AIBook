# Task List - vibeCoding-day28-food-analyzer

- [x] 프로젝트 디렉토리 생성 및 Vite 초기화
- [x] 의존성 라이브러리 설치 (React, Express, dotenv 등)
- [x] 백엔드 서버 (`server.js`) 구축
  - [x] Express 서버 및 환경 변수 연동
  - [x] `/api/analyze-food` (Base64 멀티모달 분석 및 JSON 영양소 출력) 구현
  - [x] API 인증 오류 대비 유려한 음식별(김치볶음밥, 샐러드 등) Fallback 로직 탑재
- [x] 프론트엔드 기본 템플릿 및 설정 수정
  - [x] `vite.config.js` 에 API 프록시 설정 추가
  - [x] `index.html` 타이틀 및 폰트 설정 수정
  - [x] `src/index.css` 아보카도 그린 다크 테마 및 균일 정렬 Grid 스타일 정의
- [x] 프론트엔드 컴포넌트 개발
  - [x] `src/components/FoodInput.jsx` (이미지 파일 드래그앤드롭 및 보조 설명 폼)
  - [x] `src/components/ResultDashboard.jsx` (동일 크기 행 정렬 정보 카드 3선 - 개요, 탄단지 요약, 조언)
  - [x] `src/App.jsx` (통합 데이터 수집, 로딩 상태, 결과 바인딩 총괄)
- [x] 수동 검증 및 동작 확인
  - [x] 개발 서버 구동 및 자연어 텍스트 분석 테스트
  - [x] 이미지 업로드 미리보기 및 멀티모달 / Fallback 분석 검증
  - [x] 프로젝트 폴더 내부 `docs/` 폴더에 최종 마크다운 및 검증 미디어 보관
