import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import google.generativeai as genai
from dotenv import load_dotenv

# 내부 모듈 로드
from data_processor import download_stock_data, calculate_indicators, get_market_summary
from model import train_and_predict

# 환경 변수 로드 (.env 파일 지원)
load_dotenv()

app = Flask(__name__)
# 프론트엔드 포트(보통 Vite는 5173 사용)와의 CORS 허용
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Gemini API 설정
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("경고: GEMINI_API_KEY 환경변수가 설정되지 않았습니다. AI 리포트 기능이 제한됩니다.")

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "gemini_enabled": GEMINI_API_KEY is not None
    })

@app.route('/api/predict', methods=['POST'])
def predict_stock():
    data = request.get_json() or {}
    
    ticker = data.get('ticker', 'AAPL').upper().strip()
    period = data.get('period', '2y')
    epochs = int(data.get('epochs', 10))
    batch_size = int(data.get('batch_size', 32))
    
    # 윈도우 크기는 60일 고정
    lookback = 60
    
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 예측 요청 수신: 티커={ticker}, 기간={period}, 에포크={epochs}")
    
    try:
        # 1. 데이터 수집 및 지표 계산
        df, company_name = download_stock_data(ticker, period)
        df_with_indicators = calculate_indicators(df)
        
        # 2. LSTM 모델 학습 및 향후 30일 가격 예측
        predictions, metrics = train_and_predict(
            df_with_indicators, 
            lookback=lookback, 
            epochs=epochs, 
            batch_size=batch_size, 
            future_days=30
        )
        
        # 3. 예측 날짜 배열 생성 (영업일 고려하지 않고 순차적 30일 생성)
        last_date = df_with_indicators.index[-1]
        prediction_dates = []
        current_date = last_date
        
        for _ in range(30):
            current_date += timedelta(days=1)
            prediction_dates.append(current_date.strftime('%Y-%m-%d'))
            
        prediction_data = [
            {"date": date, "close": round(price, 2)}
            for date, price in zip(prediction_dates, predictions)
        ]
        
        # 4. 과거 주가 데이터 포맷팅
        history_data = []
        for index, row in df_with_indicators.iterrows():
            history_data.append({
                "date": index.strftime('%Y-%m-%d'),
                "open": round(row['Open'], 2),
                "high": round(row['High'], 2),
                "low": round(row['Low'], 2),
                "close": round(row['Close'], 2),
                "volume": int(row['Volume']),
                "ma20": round(row['MA20'], 2) if not pd.isna(row['MA20']) else None,
                "ma50": round(row['MA50'], 2) if not pd.isna(row['MA50']) else None,
                "rsi": round(row['RSI'], 2) if not pd.isna(row['RSI']) else None
            })
            
        # 5. 요약 통계 계산
        summary = get_market_summary(df_with_indicators, company_name, ticker)
        
        # 30일 후 예측 종가 분석 정보 추가
        start_pred_price = prediction_data[0]["close"]
        end_pred_price = prediction_data[-1]["close"]
        predicted_change = end_pred_price - start_pred_price
        predicted_pct_change = (predicted_change / start_pred_price) * 100
        
        summary["predicted_30d_price"] = end_pred_price
        summary["predicted_change"] = predicted_change
        summary["predicted_pct_change"] = predicted_pct_change
        
        # 6. Gemini API를 활용한 AI 리포트 생성
        report_markdown = ""
        if GEMINI_API_KEY:
            try:
                report_markdown = generate_gemini_report(summary, prediction_data)
            except Exception as gemini_err:
                print(f"Gemini API 에러: {str(gemini_err)}")
                report_markdown = f"### ⚠️ AI 시장 리포트 생성 실패\n\nGemini API 호출 중 오류가 발생했습니다: {str(gemini_err)}"
        else:
            report_markdown = (
                "### ⚠️ AI 시장 리포트 미생성\n\n"
                "백엔드 서버에 `GEMINI_API_KEY` 환경변수가 설정되어 있지 않습니다.\n"
                "`.env` 파일에 유효한 Gemini API 키를 입력한 뒤 서버를 재시작해 주세요."
            )
            
        return jsonify({
            "ticker": ticker,
            "company_name": company_name,
            "history": history_data,
            "prediction": prediction_data,
            "metrics": metrics,
            "summary": summary,
            "report": report_markdown
        })
        
    except Exception as e:
        print(f"예측 도중 치명적 에러 발생: {str(e)}")
        return jsonify({"error": str(e)}), 400

def generate_gemini_report(summary, prediction_data):
    """
    주가 정보 및 미래 예측 값을 기반으로 Gemini API 리포트를 생성합니다.
    """
    # 프롬프트 구성에 쓰일 주요 가격 데이터
    history_trend = summary["recent_trend"]
    first_pred = prediction_data[0]["close"]
    mid_pred = prediction_data[14]["close"]
    last_pred = prediction_data[-1]["close"]
    
    prompt = f"""
당신은 월스트리트 출신의 수석 금융 분석가이자 AI 투자 전략가입니다.
제공된 주식 데이터와 TensorFlow LSTM 모델의 주가 예측 정보를 바탕으로, 사용자가 이해하기 쉽고 전문적인 한글 "AI 시장 분석 리포트"를 작성해주세요.

[분석 대상 종목 정보]
- 종목명: {summary['company_name']} ({summary['ticker']})
- 현재 주가(종가 기준): {summary['latest_close']:.2f} (전일 대비 {summary['pct_change']:.2f}%)
- 연율화 주가 변동성: {summary['volatility_annual_pct']:.2f}%
- 최근 30일 주가 흐름(종가 리스트): {history_trend}

[기술적 지표 요약]
- 14일 RSI: {summary['rsi']:.2f} ({summary['rsi_status']})
- 20일 이동평균선(MA20): {summary['ma20']:.2f}
- 50일 이동평균선(MA50): {summary['ma50']:.2f}
- 이동평균선 배치 상태: {summary['ma_status']}

[LSTM 모델의 미래 30일 예측 경로]
- 예측 1일차 주가: {first_pred:.2f}
- 예측 15일차 주가: {mid_pred:.2f}
- 예측 30일차 주가: {last_pred:.2f}
- 향후 30일간의 예측 등락률: {summary['predicted_pct_change']:.2f}%

보고서는 마크다운(Markdown) 형식으로 작성되어야 하며, 다음 목차를 준수하여 자세하고 구조감 있게 서술해 주세요:

1. **시장 요약 및 최근 동향**
   - 최근 가격 움직임의 주요 특징 분석
   - 거래량 및 변동성을 기초로 한 투자 심리 진단
2. **LSTM 예측 모델 분석 및 전망**
   - 향후 30일간의 주가 예측 경로 요약 및 예상 트렌드 (상승, 하락, 횡보에 대한 논리적 이유)
   - 모델 학습 지표를 고려한 신뢰도 수준 설명
3. **기술적 지표 분석**
   - RSI 및 이동평균선(MA) 크로스를 바탕으로 한 강세/약세 구간 분석
   - 지지선 및 저항선 관점에서의 전략적 위치 평가
4. **투자 전략 및 행동 지침**
   - 단기(1~2주) 및 중기(1개월) 투자자들을 위한 실행 가능한 대응 가이드
   - 투자 시 반드시 고려해야 할 리스크 요인 및 유의사항

출력은 반드시 깔끔하고 정돈된 한글 마크다운으로만 작성하세요. 존댓말로 격식 있고 신뢰감 있게 작성해야 합니다.
"""

    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt)
    return response.text

if __name__ == '__main__':
    # Flask 앱 실행 (CORS 및 외부 호출 가능하도록 0.0.0.0 포트 5000으로 오픈)
    app.run(host='0.0.0.0', port=5000, debug=True)
