# Task List

## 백엔드 개발 (Flask)
- [x] `backend` 폴더 생성 및 `requirements.txt` 작성
- [x] Python 3.12.11 가상환경(venv) 생성
- [x] 필요 패키지 설치 (`tensorflow`, `yfinance`, `flask`, `flask-cors`, `pandas`, `numpy`, `scikit-learn`, `google-generativeai`, `python-dotenv`)
- [x] `data_processor.py` (yfinance 수집 및 pandas 지표 계산) 구현
- [x] `model.py` (LSTM 훈련 및 30일 루프 예측) 구현
- [x] `app.py` (API 서버 구축 및 Gemini API 요약 기능 통합) 구현

## 프론트엔드 개발 (React / Vite)
- [x] `frontend` 폴더 생성 및 Vite React 템플릿 구성
- [x] 라이브러리 설치 (`react-plotly.js`, `plotly.js-dist-min`, `lucide-react` 등)
- [x] `src/index.css` (프리미엄 다크/네온 트레이딩 테마) 디자인
- [x] `src/components/ControlPanel.jsx` (티커/에포크 설정 및 상태 표시) 구현
- [x] `src/components/StockChart.jsx` (Plotly.js 활용 시각화) 구현
- [x] `src/components/ReportView.jsx` (AI 리포트 뷰어) 구현
- [x] `src/App.jsx` (상태 연동 및 UI 전체 조율) 통합

## 검증 및 마무리
- [x] 애플리케이션 통합 기동 테스트 (AAPL 및 국내 주식)
- [x] `walkthrough.md` 작성 및 최종 성과 보고
