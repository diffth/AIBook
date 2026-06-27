import yfinance as yf
import pandas as pd
import numpy as np

def download_stock_data(ticker, period="2y"):
    """
    yfinance를 사용하여 특정 종목의 과거 주가 데이터를 다운로드합니다.
    """
    try:
        # yfinance Ticker 객체 생성
        stock = yf.Ticker(ticker)
        
        # 과거 데이터 가져오기 (종가, 시가, 고가, 저가, 거래량 등)
        df = stock.history(period=period)
        
        if df.empty:
            raise ValueError(f"티커 '{ticker}'에 대한 데이터를 찾을 수 없습니다.")
            
        # 회사 정보 가져오기 (회사명 등)
        info = stock.info
        company_name = info.get('longName', info.get('shortName', ticker))
        
        return df, company_name
    except Exception as e:
        raise RuntimeError(f"데이터 다운로드 중 오류 발생: {str(e)}")

def calculate_indicators(df):
    """
    이동평균선(MA20, MA50) 및 RSI 지표를 계산하여 데이터프레임에 추가합니다.
    """
    df = df.copy()
    
    # 1. 이동평균선 계산
    df['MA20'] = df['Close'].rolling(window=20).mean()
    df['MA50'] = df['Close'].rolling(window=50).mean()
    
    # 2. RSI (Relative Strength Index) 계산
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    
    # 0으로 나누기 방지
    loss = loss.replace(0, 0.00001)
    
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))
    
    # NaN 값 처리 (초기 이동평균/RSI 계산 구간의 NaN은 이전/이후 값으로 채우거나 그대로 둠)
    # 차트에 표기할 때 NaN이 있으면 끊겨 보일 수 있으므로 그대로 두거나 프론트엔드에서 처리하도록 함
    return df

def get_market_summary(df, company_name, ticker):
    """
    Gemini API에 전달할 주식 상태 요약 정보를 생성합니다.
    """
    if len(df) < 2:
        return {}
        
    latest = df.iloc[-1]
    prev = df.iloc[-2]
    
    close_price = float(latest['Close'])
    prev_close = float(prev['Close'])
    price_change = close_price - prev_close
    pct_change = (price_change / prev_close) * 100
    
    # 최근 30일 데이터의 변동성 (표준편차)
    recent_30 = df.tail(30)
    volatility = float(recent_30['Close'].pct_change().std() * np.sqrt(252) * 100) # 연율화 변동성(%)
    
    # 기술적 지표 상태 요약
    rsi = float(latest['RSI']) if not pd.isna(latest['RSI']) else 50.0
    rsi_status = "과매수 (Overbought)" if rsi >= 70 else ("과매도 (Oversold)" if rsi <= 30 else "중립 (Neutral)")
    
    ma20 = float(latest['MA20']) if not pd.isna(latest['MA20']) else close_price
    ma50 = float(latest['MA50']) if not pd.isna(latest['MA50']) else close_price
    
    ma_status = "상승 추세 (가격 > MA20 > MA50)" if close_price > ma20 > ma50 else \
                ("하락 추세 (가격 < MA20 < MA50)" if close_price < ma20 < ma50 else "정리/혼조세")
                
    summary = {
        "ticker": ticker,
        "company_name": company_name,
        "latest_close": close_price,
        "price_change": price_change,
        "pct_change": pct_change,
        "volatility_annual_pct": volatility,
        "rsi": rsi,
        "rsi_status": rsi_status,
        "ma20": ma20,
        "ma50": ma50,
        "ma_status": ma_status,
        "recent_trend": recent_30['Close'].tolist(),
        "recent_dates": [d.strftime('%Y-%m-%d') for d in recent_30.index]
    }
    
    return summary
