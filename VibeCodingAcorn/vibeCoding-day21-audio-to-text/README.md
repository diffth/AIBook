# 📝 AI 회의록 요약 & 공유 비서 (AI Meeting Summarizer & Email Sender)

사용자가 회의 오디오 파일(mp3, wav)을 업로드하면, **AssemblyAI**를 사용하여 음성을 텍스트로 받아쓰고(STT), **Google Gemini API (`gemini-2.5-flash`)**를 통해 핵심 내용 요약과 할 일 목록(Action Items)을 자동 도출한 후, 다중 팀원들에게 깔끔하게 디자인된 HTML 이메일로 회의록을 즉시 전송하는 비즈니스 생산성 웹 애플리케이션입니다.

---

## 🛠️ 기술 스택
- **Frontend**: React (Vite), Vanilla CSS (Glassmorphism & Responsive Layout)
- **Backend**: Express.js, Multer (파일 수집)
- **APIs & Services**:
  - **AssemblyAI SDK**: 로컬 음성 파일 업로드 및 한국어 받아쓰기 (`language_code: ko`)
  - **Google Gen AI SDK**: 구조화된 요약 JSON 도출 (`gemini-2.5-flash`)
  - **Nodemailer**: SMTP 프로토콜 기반 고품격 HTML 이메일 다중 발송

---

## 🚀 로컬 구동 방법

### 🔑 1. 환경 변수 설정
프로젝트 루트 폴더에 `.env` 파일을 생성하고 아래 양식에 맞추어 API 키와 SMTP 정보를 입력합니다.
```env
# AssemblyAI API Key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key

# 메일 발송용 SMTP 설정 (예: Gmail 기준)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```
> [!NOTE]
> Gmail을 사용하는 경우, 구글 계정 보안 설정에서 2차 인증을 활성화하고 **[앱 비밀번호(App Password)]**를 발급받아 `SMTP_PASS` 자리에 입력하셔야 정상 발송됩니다.

### 📦 2. 패키지 설치
프로젝트 루트 폴더에서 다음 명령을 실행하여 프론트엔드 및 백엔드 통합 의존성을 설치합니다.
```bash
npm install
```

### 💻 3. 서버 실행
로컬 개발을 위해 백엔드 API 서버와 프론트엔드 Vite 개발 서버를 각각 구동합니다.

```bash
# 터미널 1: Express 백엔드 API 서버 가동 (포트 5000)
npm run server

# 터미널 2: React 프론트엔드 Vite 개발 서버 가동 (포트 5173)
npm run dev
```

Vite 개발 서버가 실행된 후 브라우저에서 **`http://localhost:5173`** 주소로 접속해 테스트를 진행합니다.

---

## 📧 이메일 다중 수신 기능 사용법
1. AI가 회의 내용 분석을 완료하면 화면 오른쪽에 **"회의록 공유 메일링"** 카드 패널이 등장합니다.
2. 입력창에 공유하고 싶은 팀원의 이메일 주소를 입력한 후 `+` 버튼을 누르거나 엔터를 치면 **칩(Chip) 형태**로 수신인 태그가 생성됩니다.
3. 이메일을 여러 개 등록한 후 **[이메일 일괄 전송]** 버튼을 누르면 백엔드 SMTP 서비스를 통해 모든 팀원에게 고품질 비즈니스 회의록 템플릿 메일이 즉시 일괄 발송됩니다!
