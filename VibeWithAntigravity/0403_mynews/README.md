# 📰 MyNews - 개인 맞춤형 AI 실시간 뉴스 대시보드 (React + Vite)

이 프로젝트는 사용자가 관심 있는 주제(키워드)를 등록하면 해당 키워드와 매칭되는 최신 뉴스를 실시간으로 크롤링하고 수집하여 보여주는 개인화 뉴스 대시보드 웹 애플리케이션입니다.

**React 18**과 **Vite**를 기반으로 리팩토링되어 상태(State) 기반의 빠른 UI 반응 속도를 보장하며, 클라이언트 브라우저와 로컬 환경 모두에서 `rss-parser` 라이브러리를 사용해 Google News RSS 피드를 안정적으로 파싱합니다.

---

## 🛠️ 기술 스택
* **프론트엔드**: React 18, Vite
* **스타일링**: Vanilla CSS (CSS 변수 & 글래스모피즘 테마)
* **백엔드**: Firebase (Realtime Database)
* **뉴스 소스**: Google 뉴스 RSS 피드
* **RSS 파서**: `rss-parser` (브라우저 및 Node.js 환경 통합 사용)

---

## 📂 프로젝트 폴더 구조
```
0403_mynews/
├── index.html               # React 진입 마운트 HTML
├── vite.config.js           # Vite 환경 설정 파일
├── package.json             # React, Firebase, rss-parser 등 패키지 의존성 파일
├── src/
│   ├── main.jsx             # React 마운트 진입점
│   ├── index.css            # 글로벌 다크 글래스모피즘 CSS 스타일시트
│   ├── firebase.js          # Firebase client SDK 초기화 및 내보내기 모듈
│   ├── App.jsx              # 메인 상태 및 레이아웃 제어 컴포넌트
│   └── components/
│       ├── Sidebar.jsx      # 관심 키워드 추가/삭제 및 탭 네비게이션
│       ├── NewsGrid.jsx     # 뉴스 카드 그리드 컨테이너
│       ├── NewsCard.jsx     # 개별 뉴스 카드 컴포넌트
│       └── ConfigModal.jsx  # Firebase 연결 설정 변경 팝업
├── crawl.js                 # 백그라운드/로컬 실행용 Node.js 뉴스 크롤러
├── .gitignore               # node_modules 및 로컬 firebase-config.json 제외 설정
└── README.md                # 본 안내서
```

---

## 💻 실행 방법

### 1. 로컬 개발 서버 구동 (React + Vite)
터미널에서 `0403_mynews` 폴더로 이동한 후 아래 명령어로 개발 서버를 구동합니다.
```bash
# 의존성 패키지 설치 (최초 1회)
npm install

# 로컬 개발 서버(Vite) 실행
npm run dev
# 브라우저에서 http://localhost:5173 접속
```

### 2. 뉴스 동기화(크롤링) 방법

#### 방법 A: 웹 UI에서 실시간 동기화 (추천 ⭐)
1. 웹 브라우저(`http://localhost:5173`)로 접속합니다.
2. 화면 오른쪽 상단의 **"뉴스 동기화"** 버튼을 누릅니다.
3. CORS 프록시(`allorigins.win`)를 경유해 Google RSS를 fetch해 오며, 브라우저 내에 빌드된 `rss-parser`가 XML을 해석하여 Firebase DB에 기사들을 실시간 적재하고 즉시 화면에 동기화합니다.

#### 방법 B: 로컬 Node.js 스크립트로 크롤링
자동화된 일일 크롤링 작업이 필요할 때 사용합니다.
```bash
npm run crawl
```
* *참고: 웹 UI를 통해 Firebase 설정을 본인 전용 DB로 교체하셨다면, 동일 폴더에 `firebase-config.json` 파일을 작성하고 `{ "databaseURL": "본인의 DB URL" }` 형태로 기재해주면 크롤러 스크립트도 이를 읽어 해당 DB 노드로 뉴스를 올립니다.*
