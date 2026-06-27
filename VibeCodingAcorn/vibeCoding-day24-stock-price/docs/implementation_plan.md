# LSTM 기반 주식 가격 예측 및 AI 시장 리포트 웹앱 구현 계획

사용자가 지정한 개별 주식 종목의 과거 데이터를 분석하여 LSTM 모델로 향후 30일간의 주가를 예측하고, Gemini API를 통해 전문적인 AI 시장 리포트를 생성하며, 이를 Plotly 차트와 함께 미려한 대시보드로 제공하는 웹 애플리케이션입니다.

---

## 사용자 검토 필요 사항

> [!IMPORTANT]
> - **Gemini API 키**: Gemini API 분석 기능을 활성화하기 위해 `GEMINI_API_KEY`가 필요합니다. 백엔드 구동 시 `.env` 파일에 설정해 주셔야 정상 작동합니다.
> - **파이썬 환경**: 현재 사용 중이신 기본 Python 3.14.5 버전에서는 TensorFlow 공식 지원이 제공되지 않아, 시스템 내에 설치가 확인된 `Python 3.12.11` 버전을 활용해 가상환경(venv)을 구성하고 백엔드를 실행할 계획입니다.
> - **학습 시간**: LSTM 모델을 실시간으로 웹 서버에서 학습시키기 때문에 에포크(Epoch) 수가 너무 크면 응답 시간이 길어질 수 있습니다. 기본 에포크를 10회로 제안하며, 필요시 사용자가 조절할 수 있도록 옵션을 제공합니다.

---

## 제안된 변경 사항

전체 프로젝트는 `vibeCoding-day24-stock-price` 디렉토리 아래에 **백엔드(Flask)**와 **프론트엔드(React/Vite)**로 나누어 설계합니다.

```
vibeCoding-day24-stock-price/
├── backend/                   # Flask 백엔드
│   ├── app.py                 # 백엔드 진입점 및 API 라우터
│   ├── model.py               # LSTM 모델 빌드, 학습 및 예측 로직
│   ├── data_processor.py      # yfinance 수집 및 pandas 전처리/지표 계산
│   └── requirements.txt       # 파이썬 의존성 패키지 목록
└── frontend/                  # React 프론트엔드
    ├── src/
    │   ├── App.jsx            # 메인 대시보드 UI
    │   ├── index.css          # 프리미엄 다크 테마 CSS 스타일링
    │   └── components/
    │       ├── ControlPanel.jsx # 티커 입력 및 예측 조건 설정 컴포넌트
    │       ├── StockChart.jsx   # Plotly 기반 주가 시각화 차트
    │       └── ReportView.jsx   # Gemini 생성 AI 시장 리포트 뷰어
    └── package.json
```

---

### [Component 1] Flask 백엔드 (`backend/`)

#### [NEW] [requirements.txt](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day24-stock-price/backend/requirements.txt)
- Flask 및 가상환경 구동을 위한 패키지 명시
  - `Flask`, `Flask-CORS`, `yfinance`, `pandas`, `numpy`, `scikit-learn`, `tensorflow`, `google-generativeai`, `python-dotenv`, `plotly`

#### [NEW] [data_processor.py](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day24-stock-price/backend/data_processor.py)
- `yfinance`를 사용한 주가 수집 (사용자 지정 티커, 과거 조회 기간)
- `pandas`를 이용한 시계열 전처리: 결측치 처리 및 기술적 지표 생성
  - 이동평균선(MA20, MA50) 계산
  - 상대강도지수(RSI) 계산
  - 스케일링 전 단계 데이터 프레임 준비

#### [NEW] [model.py](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day24-stock-price/backend/model.py)
- `MinMaxScaler`를 이용한 데이터 정규화 [0, 1]
- 60일 Lookback Window 형식으로 LSTM 입력 텐서 변환 (Shape: `[Samples, TimeSteps, Features]`)
- Keras Sequential API를 활용한 LSTM 아키텍처 구현:
  - LSTM (50 units, return_sequences=True) + Dropout
  - LSTM (50 units, return_sequences=False) + Dropout
  - Dense (25 units) + Dense (1 unit)
- 지정된 Epochs 만큼 학습 진행 (실시간 피드백을 위해 학습 과정을 효율적으로 진행)
- 학습 후, 마지막 60일의 실제 데이터를 기반으로 30일간 순환적 예측(Autoregressive) 수행 및 역정규화(Inverse scaling)

#### [NEW] [app.py](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day24-stock-price/backend/app.py)
- Flask 서버 초기화 및 CORS 구성
- `POST /api/predict` 엔드포인트 구현:
  1. 티커 및 설정값 수신
  2. `data_processor.py`로 과거 주가 수집 및 가공
  3. `model.py`를 호출하여 LSTM 학습 및 미래 30일 예측 수행
  4. 예측 결과와 최근 30일의 주가 및 기술적 지표를 결합하여 Gemini API (`gemini-1.5-flash` 모델) 호출, 투자 정보 기반 시장 리포트 생성
  5. 최종 데이터를 취합하여 프론트엔드로 JSON 응답 전송

---

### [Component 2] React 프론트엔드 (`frontend/`)

#### [NEW] [index.css](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day24-stock-price/frontend/src/index.css)
- 주식 트레이딩 터미널 감성의 프리미엄 다크 모드 스타일링 정의
- 네온 아우라, 글래스모피즘 효과, 부드러운 텍스트 애니메이션 구현

#### [NEW] [ControlPanel.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day24-stock-price/frontend/src/components/ControlPanel.jsx)
- 티커 입력 폼 (예: AAPL, TSLA, 005930.KS)
- 분석 기간(1년, 2년, 5년) 선택 버튼 그룹
- LSTM 학습 파라미터(Epochs, Batch Size) 설정 슬라이더
- 분석 시작 버튼 및 학습 과정 상태(로딩 인디케이터 및 실시간 진행 상태 메시지) 제공

#### [NEW] [StockChart.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day24-stock-price/frontend/src/components/StockChart.jsx)
- `react-plotly.js`를 사용해 과거 주가(라인)와 30일 미래 예측(점선)을 매끄럽게 시각화
- 마우스 오버 툴팁, 드래그 줌인/줌아웃, MA20/MA50 겹쳐보기 토글 기능 지원

#### [NEW] [ReportView.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day24-stock-price/frontend/src/components/ReportView.jsx)
- Gemini API가 작성한 "AI 시장 리포트" 마크다운 뷰어
- 보기 편한 금융 리포트 타이포그래피, 요약 카드(현재가, 예측가, 예상 변동성 등) 포함

#### [NEW] [App.jsx](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day24-stock-price/frontend/src/App.jsx)
- 전체 레이아웃 구성 및 상태 관리 (종목 데이터, 예측 데이터, 리포트 결과 등)
- 상단 주요 지표 카드 그리드 배치 (RSI, MA Cross 상태, 예측 상승률 등)

---

## 검증 계획

### 수동 검증
1. **과거 데이터 조회 테스트**:
   - `AAPL` (애플), `005930.KS` (삼성전자) 등의 종목을 조회하여 `yfinance`가 데이터를 올바르게 수집하는지 검증합니다.
2. **LSTM 학습 및 예측 테스트**:
   - 모델 학습 후 30일 예측 가격이 반환되는지 확인하고, 스케일 붕괴 없이 정상적인 가격 범위 내에 있는지 검증합니다.
3. **Gemini 리포트 생성 테스트**:
   - 주가 정보가 요약되어 한국어로 작성된 "AI 시장 리포트"가 정상적으로 생성되는지 검증합니다.
4. **차트 시각화 및 UI 테스트**:
   - Plotly 차트가 정상적으로 과거 및 미래 주가를 표현하며 반응형으로 작동하는지 확인합니다.
5. **학습 상태 로딩 피드백 테스트**:
   - 백엔드 처리 시간(약 10~20초) 동안 화면에 부드러운 로딩 연출과 단계별 텍스트가 표시되는지 검증합니다.
