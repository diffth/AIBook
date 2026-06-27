# 매출 리포트 자동 생성 웹앱 구현 계획

사용자가 CSV 또는 XLSX 매출 데이터를 업로드하면, Pandas로 주요 통계 데이터를 추출하고, Gemini API를 통해 자연어 보고서를 생성하며, Matplotlib로 그래프를 그린 뒤, 최종적으로 ReportLab을 활용해 세련된 PDF 리포트를 생성하여 즉시 다운로드할 수 있는 웹 애플리케이션을 구축합니다.

## User Review Required

> [!IMPORTANT]
> **한글 폰트 적용**
> PDF 리포트에서 한글이 깨지지 않도록 Windows 시스템 폰트인 `맑은 고딕(C:\Windows\Fonts\malgun.ttf)`을 사용합니다. 다른 OS 환경에서 작동을 보장하기 위해 폰트 경로를 유연하게 설정하되, 기본적으로 맑은 고딕 폰트를 로드하도록 구현할 예정입니다.
> 
> **파이썬 환경**
> Python 3.x 환경과 `pip`가 필요하며, Node.js 서버(`Express.js`)가 파이썬 스크립트를 `child_process`로 실행하므로 시스템 경로에 `python` 또는 `python3`가 등록되어 있어야 합니다.

## Open Questions

> [!NOTE]
> 1. **샘플 데이터셋 생성**: 현재 워크스페이스 내에 `Sample-100-superstore.csv` 파일이 보이지 않습니다. 테스트용 및 예시 작동을 위해 100행 정도의 가짜 Superstore 데이터를 자동 생성해두는 코드를 추가해도 괜찮을까요? (Row ID, Order Date, Category, Product Name, Sales, Profit, Quantity 등의 열 포함)
> 2. **Gemini API Key 사용**: 이전에 사용되었던 `vibeCoding-day21-audio-to-text` 폴더의 `.env` 파일에 있는 `GEMINI_API_KEY`를 그대로 복사하여 사용할 계획입니다.

## Proposed Changes

이 프로젝트는 `e:\AI_DEV\AIBook\VibeCodingAcorn\vibeCoding-day22-ml-prediction` 폴더 내에 구축됩니다.

---

### Backend (Node.js/Express)

#### [NEW] [package.json](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day22-ml-prediction/package.json)
Express, Multer(파일 업로드용), dotenv(환경 변수 관리) 등의 종속성을 가진 Node.js 설정 파일입니다.

#### [NEW] [.env](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day22-ml-prediction/.env)
Gemini API Key와 포트 정보를 저장할 환경 변수 파일입니다.

#### [NEW] [server.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day22-ml-prediction/server.js)
- `/api/upload` 엔드포인트를 구현하여 업로드된 파일을 처리합니다.
- 업로드된 파일을 인자로 주어 파이썬 스크립트(`report_generator.py`)를 실행합니다.
- 생성 완료된 PDF 파일을 브라우저로 전송하여 즉시 다운로드 되도록 설정합니다.
- static 폴더를 서빙하여 UI를 띄웁니다.

---

### Analysis & Report Generation (Python)

#### [NEW] [requirements.txt](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day22-ml-prediction/requirements.txt)
파이썬 라이브러리 목록입니다:
- `pandas`, `openpyxl` (데이터 분석 및 XLSX 로드용)
- `matplotlib` (차트 이미지 생성용)
- `reportlab` (PDF 리포트 작성용)
- `google-generativeai` (Gemini API 호출용)
- `python-dotenv` (환경 변수 로드용)

#### [NEW] [report_generator.py](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day22-ml-prediction/report_generator.py)
이 스크립트는 Node.js 서버에 의해 실행됩니다.
1. **데이터 로드**: `pandas`로 업로드된 파일(CSV/XLSX)을 읽어옵니다.
2. **데이터 요약**: 
   - `groupby('Category')['Sales'].sum()` 등을 활용해 카테고리별 매출 통계를 계산합니다.
   - `describe()`를 사용해 주요 수치형 변수의 요약 통계를 냅니다.
   - 총매출, 평균 매출, 카테고리별 매출 비중을 계산합니다.
3. **Gemini API 연동**:
   - 요약된 수치 통계 정보를 프롬프트로 래핑하여 Gemini(예: `gemini-2.5-flash` 모델)에 전달합니다.
   - "이 매출 데이터를 보고서 형식으로 쉽고 직관적인 비즈니스 분석 의견과 함께 자연어로 작성해줘"라는 프롬프트를 보냅니다.
4. **Matplotlib 시각화**:
   - 카테고리별 매출 합계를 바 차트나 도넛 차트 등 세련된 그래픽으로 그려 이미지 파일로 임시 저장합니다.
5. **ReportLab PDF 생성**:
   - PDF의 레이아웃을 작성합니다.
   - 한글 폰트를 등록합니다.
   - Title, 생성 일자, Pandas 요약 통계 테이블, Gemini가 작성한 비즈니스 리포트 문구, Matplotlib 차트 이미지를 조화롭게 배치합니다.
   - 최종 PDF를 지정된 경로에 출력합니다.

#### [NEW] [generate_sample.py](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day22-ml-prediction/generate_sample.py)
테스트에 필요한 `Sample-100-superstore.csv` 파일을 생성해주는 스크립트입니다. 
- Row ID, Order ID, Order Date, Category, Sub-Category, Product Name, Sales, Quantity, Discount, Profit 컬럼을 포함하는 100행의 리얼한 비즈니스 데이터를 생성하여 제공합니다.

---

### Frontend UI (Vanilla JS & Modern CSS)

#### [NEW] [public/index.html](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day22-ml-prediction/public/index.html)
- 드래그 앤 드롭 파일 업로드 영역.
- 로딩 중인지 분석 중인지 시각적으로 알려주는 멋진 로딩바/애니메이션.
- 샘플 CSV 파일을 다운로드받을 수 있는 링크 버튼 제공.
- 다운로드 완료 시 성공 피드백 알림 제공.

#### [NEW] [public/style.css](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day22-ml-prediction/public/style.css)
- 고급스러운 다크 모드/네온 글래스모피즘(Glassmorphism) 스타일.
- 부드러운 그라데이션 및 트랜지션 애니메이션 효과 적용.

#### [NEW] [public/app.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day22-ml-prediction/public/app.js)
- Axios/Fetch API를 사용한 비동기 파일 업로드.
- 응답으로 받은 PDF Blob 데이터를 브라우저에서 즉시 파일로 저장(다운로드)하는 로직.

---

## Verification Plan

### Automated Tests
1. **Python 스크립트 직접 실행 테스트**:
   `python report_generator.py Sample-100-superstore.csv test_output.pdf`를 실행하여 데이터 분석, Gemini 요약, Matplotlib 그래프 생성, PDF 작성이 예외 없이 완벽하게 수행되는지 확인합니다.
2. **서버 API 테스트**:
   Express 서버가 구동 중일 때, 포스트맨이나 cURL을 이용해 `multipart/form-data`로 CSV 파일을 전송하고 정상적으로 200 OK와 PDF 파일 스트림을 수신하는지 확인합니다.

### Manual Verification
1. 브라우저로 웹 서비스(`http://localhost:3000`)에 접속합니다.
2. UI에서 제공하는 "샘플 CSV 파일 다운로드" 버튼을 눌러 샘플 파일을 내려받습니다.
3. 드래그 앤 드롭 영역에 해당 CSV 파일을 업로드합니다.
4. 로딩 애니메이션이 활성화되고 분석이 끝난 뒤, 브라우저에서 자동으로 PDF 다운로드 창이 열리며 리포트가 성공적으로 저장되는지 확인합니다.
5. 다운로드한 PDF 파일을 열어 한글이 깨지지 않고, 차트 이미지와 표가 예쁘게 포맷팅되어 배치되었는지 확인합니다.
