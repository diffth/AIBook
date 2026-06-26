# 🛍️ 쿠팡 AI 리뷰 감정 분석 챗봇 (Coupang Review Sentiment Analyzer)

사용자가 쿠팡 상품 링크 또는 상품명을 입력하면, BeautifulSoup을 이용해 최신 30개 리뷰 데이터를 자동으로 크롤링하여 Google Gemini API (`gemini-2.5-flash`)를 통해 감정 분석을 수행하고 요약 보고서를 작성해 주는 실시간 챗봇 웹앱입니다.

분석 결과는 **Chart.js 도넛 차트**를 통해 긍정/부정/중립의 감정 비율이 화려하게 시각화되며, 수집된 30개의 생생한 전체 리뷰 내역을 AI의 세부 판정 근거와 함께 조회할 수 있습니다.

---

## 🛠️ 시스템 아키텍처 및 폴더 구조

```
vibeCoding-day20-commerce-review/
├── backend/                  # Python FastAPI API 백엔드
│   ├── main.py               # FastAPI 서버 구동 및 CORS/라우팅 설정
│   ├── crawler.py            # BeautifulSoup 기반 쿠팡 검색 및 최신 리뷰 크롤러
│   ├── analyzer.py           # Google Gemini API 연동 감정 분석 및 종합 리포트 생성
│   ├── requirements.txt      # 백엔드 Python 의존성 리스트
│   ├── .env                  # [보안] 로컬용 환경변수 (GEMINI_API_KEY)
│   └── .env.example          # 환경변수 설정 템플릿
├── frontend/                 # React + Vite 프론트엔드
│   ├── index.html            # 메인 HTML 템플릿
│   ├── package.json          # React, Chart.js 의존성 관리
│   ├── vite.config.js        # 로컬 프록시 우회 설정 (FastAPI 포트 8000 지향)
│   └── src/
│       ├── main.jsx          # React 앱 마운트 진입점
│       ├── App.jsx           # 챗봇 UI, Chart.js 도넛 차트 및 리뷰 리스트
│       └── App.css           # Glassmorphism 모던 다크 테마 CSS 스타일시트
└── README.md                 # 프로젝트 통합 가이드라인 (본 파일)
```

---

## 🚀 로컬 구동 방법

원활한 테스트를 위해 백엔드(FastAPI)와 프론트엔드(React/Vite)를 각각 실행해야 합니다.

### 🔑 1. 환경 변수 세팅
1. `backend/` 폴더 내에 `.env` 파일을 생성합니다.
2. 발급받은 Google Gemini API 키를 입력합니다.
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

### 🐍 2. 백엔드 (Python FastAPI) 구동
```bash
# backend 폴더로 이동
cd backend

# 가상환경 생성 및 활성화 (선택 사항이지만 추천)
python -m venv venv
# Windows인 경우:
.\venv\Scripts\activate
# Mac/Linux인 경우:
source venv/bin/activate

# 의존성 패키지 설치
pip install -r requirements.txt

# FastAPI 로컬 개발 서버 기동 (포트 8000)
uvicorn main:app --reload --port 8000
```
- 백엔드 구동 성공 시 `http://localhost:8000/docs`에서 대화형 API 문서를 확인해 볼 수 있습니다.

### ⚛️ 3. 프론트엔드 (React + Vite) 구동
```bash
# frontend 폴더로 이동 (새 터미널 실행)
cd frontend

# npm 의존성 패키지 설치
npm install

# Vite 개발 서버 기동
npm run dev
```
- 실행 완료 후 브라우저를 켜고 **`http://localhost:5173`**으로 접속합니다. (Vite가 백엔드 포트 8000의 API를 자동으로 프록시 경유하여 CORS 우회를 처리합니다.)

---

## 💡 상품 검색 및 링크 입력 예시

챗봇 대화창에 다음과 같이 입력하여 바로 상세 분석을 실행해 보세요!

1. **상세 링크를 붙여넣기 할 때 (추천 🌟)**
   - 예: `https://www.coupang.com/vp/products/1381273?itemId=6319853&vendorItemId=3009088629`
   - 링크에서 고유 `productId`를 즉시 추출해 해당 상품에 달린 리뷰 30개를 정확히 긁어옵니다.

2. **상품명 키워드만 입력할 때**
   - 예: `몽쉘 생크림케이크 오리지널 12개입`
   - 쿠팡 내부 검색 알고리즘을 타며 가장 매칭 순위가 높은 최상단 상품을 자동 추적해 리뷰를 분석합니다.

---

## 🛡️ 크롤링 차단 우회 및 데이터 정제 기법
- **브라우저 헤더 모방**: 쿠팡의 강력한 안티-크롤링 필터를 우회하기 위해 브라우저 환경변수(`User-Agent`, `Accept-Language`, `Referer`, `Connection`)를 완벽히 모조한 요청 헤더를 합성해 안정적으로 HTML 리소스를 취득합니다.
- **비동기 API 다이렉트 쿼리**: 무거운 브라우저 드라이버(Selenium 등) 대신 가벼운 BeautifulSoup를 유지하기 위해, 리뷰가 비동기 렌더링되는 실물 리뷰 API 경로(`vp/products/reviews`)를 직접 쿼리하여 최신 날짜순(`DATE_DESC`) 데이터 30개를 수 밀리초 만에 수집합니다.
- **Bulk 감정 분석 파이프라인**: 30개의 리뷰를 Gemini API로 개별 쿼리하지 않고, 30개 항목을 묶어 단 한 번의 프롬프트 전송으로 구조화된 JSON 데이터(`response_schema`)를 보장받음으로써 API 응답 처리 속도를 획득했습니다.
