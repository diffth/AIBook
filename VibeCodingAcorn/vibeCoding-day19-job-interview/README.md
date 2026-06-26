# 🎙️ AI 면접 시뮬레이터 (AI Job Interview Simulator) - Google Gemini 버전

Google Gemini API (`gemini-2.5-flash`)와 브라우저의 Web Speech API를 활용하여 만든 실전형 AI 면접 연습 및 평가 웹 애플리케이션입니다.
사용자가 선택한 직무/분야에 맞춰 AI 면접관이 질문을 던지고, 사용자의 음성 답변을 분석하여 **논리성**과 **표현력**을 평가해 100점 만점의 점수와 상세한 피드백을 제공합니다.

본 프로젝트는 React/Vite(프론트엔드)와 Express.js(백엔드)로 구현되었으며, **Netlify Functions(서버리스 함수)**를 적용하여 하나의 서비스로 통합 배포할 수 있도록 최적화되어 있습니다.

---

## 🛠️ 기술 스택
- **Frontend**: React (Vite), Vanilla CSS (Glassmorphism & Micro-animations)
- **Backend (Serverless)**: Express.js, serverless-http (Netlify Functions)
- **APIs**: Google Gen AI SDK (`gemini-2.5-flash`), Web Speech API (`webkitSpeechRecognition`)

---

## 🚀 사전 준비 및 검증

### 1. 환경 변수 설정
프로젝트 루트 폴더에 `.env` 파일을 생성하고 본인의 Google Gemini API Key를 입력합니다.
```env
GEMINI_API_KEY=your_actual_gemini_api_key
```

### 2. Python API 키 유효성 검증
프로젝트에서 제공하는 파이썬 스크립트를 사용해 발급받은 Gemini API Key가 정상 작동하는지 사전에 테스트할 수 있습니다.
```bash
# 관련 라이브러리 설치
pip install google-genai python-dotenv

# 검증 스크립트 실행
python check_api_key.py
```
- 성공 시 `✅ 연결 성공! API 응답: '...'` 메시지가 출력됩니다.

---

## 💻 로컬에서 실행하기

### 방법 A: Netlify CLI로 백엔드와 통합 실행 (추천 🌟)
Netlify의 서버리스 함수 개발 환경을 로컬에 구축하여 프론트엔드와 백엔드를 동시에 테스트하는 가장 안전한 방법입니다.

```bash
# 1. 의존성 패키지 설치
npm install

# 2. Netlify CLI 글로벌 설치 (없을 경우)
npm install -g netlify-cli

# 3. 로컬 서버 시작
netlify dev
```
- 실행 후 브라우저에서 `http://localhost:8888`로 접속하면 API 게이트웨이 및 React 화면이 연동되어 바로 사용이 가능합니다.

### 방법 B: Vite 개발 서버만 단독 실행
프론트엔드 화면만 가볍게 확인하고 싶을 때 사용합니다.
```bash
npm install
npm run dev
```

---

## 🌐 Netlify를 통한 프로더션 배포 가이드

본 프로젝트는 `netlify.toml` 설정을 완비하여, GitHub 리포지토리에 푸시하고 Netlify 웹에서 클릭 몇 번만으로 무료 배포가 가능합니다.

### 📝 1단계: 필수 파일만 깃허브에 푸시
`.env`나 `node_modules` 등 개인 환경변수 및 빌드 아티팩트를 제외한 나머지 프로더션 코드들을 깃허브 원격 저장소에 올립니다.

### 🔗 2단계: Netlify와 깃허브 연동
1. [Netlify 공식 홈페이지](https://www.netlify.com/)에 로그인합니다.
2. 대시보드에서 **[Add new site]** ➡️ **[Import an existing project]**를 선택합니다.
3. GitHub를 연동하고 프로젝트 리포지토리(`vibeCoding-day19-job-interview` 폴더가 속한 리포지토리)를 선택합니다.
4. **Site settings** 설정 (이미 `netlify.toml`에 정의되어 있으므로 기본값이 자동 세팅됩니다):
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`

### 🔑 3단계: 환경 변수(API Key) 주입
1. 배포 설정 페이지 하단 또는 사이트 설정의 **[Environment variables]** 메뉴로 이동합니다.
2. **[Add a variable]**을 누르고 아래와 같이 입력합니다:
   - Key: `GEMINI_API_KEY`
   - Value: `본인의 Google Gemini API Key 실물값`
3. **[Deploy site]** 버튼을 누르면 배포 빌드가 시작됩니다.

> [!IMPORTANT]
> Netlify Functions에 API 키가 설정되기 때문에, 사용자의 API 키가 프론트엔드 브라우저 코드로 유출되지 않고 안전하게 암호화되어 서버리스 환경에서만 사용됩니다.
