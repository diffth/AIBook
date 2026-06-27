# Task List: React/Vite 기반 AI 블로그 콘텐츠 생성기 (Day 23)

- [x] React/Vite 초기 구축 및 통합 설정
    - [x] `create-vite` 스크립트의 옵션 확인 (`--help` 실행)
    - [x] `./` 현재 폴더에 React/Vite 프로젝트 초기화
    - [x] Express 백엔드와 연동하기 위해 패키지 병합 및 `vite.config.js` 프록시 세팅
- [x] 백엔드 서버 (`server.js`) 업데이트
    - [x] Gemini API 프롬프트에 해시태그 5개 & 영어 이미지 설명문(imagePrompt) 추가 및 검증
    - [x] Unsplash API 헤더 연동 가이드라인 준수 및 폴백 안정화
- [x] React UI 컴포넌트 개발
    - [x] `src/App.jsx` 작성 (스텝 로더, 카드 인터랙션, 이미지 대표 선택 제어)
    - [x] `src/App.css` 작성 (다크 네온 및 글래스모피즘 CSS 스타일링)
    - [x] `index.html` (Vite용 메인 진입 템플릿) 설정
- [x] 내보내기 및 크롬 파일 다운로드 연동
    - [x] `showSaveFilePicker` API를 통한 React 내 Markdown 다운로드 기능 구현
    - [x] `showSaveFilePicker` API를 통한 React 내 HTML 다운로드 기능 구현
- [x] 전체 빌드 및 최종 E2E 검증
    - [x] `npm run build`로 React 번들링 에러 여부 확인
    - [x] `npm run dev` 실행 시 Proxy 동작 및 크롬 다운로드 파일명 정상 여부 검증
    - [x] `docs/` 폴더에 아티팩트 복사 영구 보존
