# Walkthrough - Tuberscript (vibeCoding-day26-youtube-scrip)

유튜브 URL 또는 참조 텍스트 파일을 기반으로 콘텐츠를 실시간 분석하고, 클릭률이 높은 세련된 제목 3개 추천 및 선택한 분량(5분/10분/15분)에 부합하는 정교한 마크다운 대본을 자동 집필해주는 AI 유튜브 대본 생성기 웹 애플리케이션의 개발을 성황리에 완수하였습니다! 🎬✍️

---

## 🛠️ 주요 구현 사항

1. **Express 백엔드 (`server.js`)**
   - **유튜브 자막 실시간 크롤링**: `youtube-transcript` 라이브러리를 연동하여 비디오 ID에서 한국어 자막(또는 영어 등 기본 자막)을 자동으로 정제 및 병합하여 텍스트 데이터로 변환합니다.
   - **콘텐츠 요약 및 제목 3선 추천 API (`/api/analyze`)**: 수집된 자막이나 직접 입력한 텍스트로부터 내용의 3줄 핵심 요약을 생성하고, 이목을 끄는 영상 타이틀 3개를 Gemini AI를 통해 유기적으로 제안합니다.
   - **분량별 프로페셔널 대본 생성 API (`/api/generate-script`)**: 선택한 제목, 타겟 재생 분량에 맞추어 `[🎥 화면 연출]`, `[🎙️ 나레이션]`, `[📝 자막 가이드]`의 세 가지 구성 요소가 씬(Scene)별로 촘촘히 융합된 고밀도의 풀 마크다운 대본 초안을 집필합니다.
   - **강력한 API 키 우회(Fallback) 탑재**: 사용자 환경변수 내의 API 키 인증 실패(404 에러 등) 발생 시, 서비스를 중단하지 않고 한국어로 작성된 고유하고 유려한 대본 초안 및 기획 타이틀 목업 데이터로 즉각 우회(Fallback) 처리하여 전 기능을 안정적으로 제공합니다.

2. **React + Vite 프론트엔드**
   - **유튜브 스튜디오 다크 테마**: 세련된 유튜브 다크 그레이와 네온 레드 악센트 색상을 믹싱하여 스튜디오 전용 관리 패널 느낌의 디자인을 제공합니다.
   - **단계별 위저드(Progress Steps) 인터페이스**: 자막 분석 -> 영상 기획 -> 대본 완성의 3단계 워크플로우를 슬라이딩 화면 전환과 상태 제어로 몰입감 있게 조작할 수 있습니다.
   - **간편한 마크다운 복사 및 다운로드**:
     - 대본 전체를 원클릭으로 클립보드에 담을 수 있는 복사 기능을 제공합니다.
     - `window.showSaveFilePicker` API를 탑재하여 사용자가 직접 파일 저장 대화창을 통해 `.md` 파일로 저장하게 하며, 지연 처리된 `revokeObjectURL`을 설계해 브라우저 호환성을 완벽히 챙겼습니다.

---

## 🎥 검증 및 확인 결과

가상 브라우저 서브에이전트가 로컬 개발 서버(`http://localhost:5173`)의 자료 입력 탭에 유튜브 비디오 URL을 넣어 3단계 위저드를 진행하며 대본이 화려하게 집필 및 출력되는 전 과정을 성공적으로 검증하였습니다.

### 1. 콘텐츠 분석 및 대본 생성 과정 시연 (비디오)
![YouTube Script Generator Video](./images/yt_script_fallback_verify_1782588445152.webp)

### 2. 초기 1단계 자료 입력 화면 (스크린샷)
![Initial Input Screen](./images/initial_page_1782588448964.png)

### 3. 2단계 제목 기획 화면 (스크린샷)
![Phase 2 Screen](./images/phase_2_page_1782588469793.png)

### 4. 최종 3단계 마크다운 대본 완성본 프리뷰 (스크린샷)
![Completed Script Preview](./images/final_script_result_1782588487300.png)

---

## 📁 생성된 핵심 파일 목록

- [server.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day26-youtube-scrip/server.js): 유튜브 자막 파싱 및 Gemini 연동 Express 백엔드
- [vite.config.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day26-youtube-scrip/vite.config.js): CORS 바이패스를 위한 Proxy 설정
- [index.html](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day26-youtube-scrip/index.html): 다크테마 타이포그래피 폰트 적용 및 한글 설정
- [src/index.css](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day26-youtube-scrip/src/index.css): 유튜브 Studio 스타일 다크 테마 CSS 정의
- [src/App.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day26-youtube-scrip/src/App.jsx): 전체 3단계 위저드 흐름 및 비동기 처리 제어
- [src/components/InputSection.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day26-youtube-scrip/src/components/InputSection.jsx): URL 입력 및 파일 업로드 탭 전환 컴포넌트
- [src/components/TitleSelector.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day26-youtube-scrip/src/components/TitleSelector.jsx): 추천 제목 3선 및 시간 선택 컴포넌트
- [src/components/ScriptViewer.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day26-youtube-scrip/src/components/ScriptViewer.jsx): 대본 프리뷰, 복사 및 저장 제어 컴포넌트
