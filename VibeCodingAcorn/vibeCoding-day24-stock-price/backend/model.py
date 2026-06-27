import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam

def prepare_lstm_data(df, lookback=60):
    """
    주가 데이터를 LSTM 모델의 입력 형식으로 변환하고 스케일러를 반환합니다.
    """
    # 종가 데이터만 추출
    close_prices = df['Close'].values.reshape(-1, 1)
    
    # 0~1 범위로 정규화
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(close_prices)
    
    X, y = [], []
    for i in range(lookback, len(scaled_data)):
        X.append(scaled_data[i-lookback:i, 0])
        y.append(scaled_data[i, 0])
        
    X, y = np.array(X), np.array(y)
    
    # LSTM 입력 형식인 [samples, time steps, features]로 변형
    X = np.reshape(X, (X.shape[0], X.shape[1], 1))
    
    return X, y, scaler, scaled_data

def build_lstm_model(lookback=60):
    """
    Keras를 사용하여 LSTM 아키텍처를 정의합니다.
    """
    model = Sequential()
    
    # First LSTM layer with Dropout regularisation
    model.add(LSTM(units=50, return_sequences=True, input_shape=(lookback, 1)))
    model.add(Dropout(0.2))
    
    # Second LSTM layer with Dropout regularisation
    model.add(LSTM(units=50, return_sequences=False))
    model.add(Dropout(0.2))
    
    # Dense layers to output a single price
    model.add(Dense(units=25))
    model.add(Dense(units=1))
    
    # Adam 옵티마이저 컴파일
    model.compile(optimizer=Adam(learning_rate=0.001), loss='mean_squared_error')
    
    return model

def train_and_predict(df, lookback=60, epochs=10, batch_size=32, future_days=30):
    """
    모델을 생성, 학습하고 향후 n일 동안의 주가를 예측합니다.
    """
    # 데이터가 lookback 크기보다 커야 함
    if len(df) <= lookback:
        raise ValueError(f"데이터 크기({len(df)})가 윈도우 크기({lookback})보다 커야 합니다. 더 넓은 기간을 선택해 주세요.")
        
    # 데이터 준비
    X, y, scaler, scaled_data = prepare_lstm_data(df, lookback)
    
    # 모델 빌드
    model = build_lstm_model(lookback)
    
    # 모델 학습 (학습 시 verbose=0 으로 설정하여 서버 로그를 간소화)
    model.fit(X, y, batch_size=batch_size, epochs=epochs, verbose=0)
    
    # 마지막 lookback일의 데이터를 가져와 30일 예측의 초기 입력으로 사용
    last_sequence = scaled_data[-lookback:]
    
    # 향후 주가 예측
    predictions_scaled = []
    current_sequence = last_sequence.copy()
    
    for _ in range(future_days):
        # 형상 조정: [1, lookback, 1]
        input_data = np.reshape(current_sequence, (1, lookback, 1))
        
        # 다음 날 가격 예측
        pred_scaled = model.predict(input_data, verbose=0)[0, 0]
        predictions_scaled.append(pred_scaled)
        
        # 윈도우 업데이트 (맨 앞 요소 제거, 맨 뒤에 예측값 추가)
        current_sequence = np.append(current_sequence[1:], [[pred_scaled]], axis=0)
        
    # 예측 데이터 역정규화
    predictions_scaled = np.array(predictions_scaled).reshape(-1, 1)
    predictions = scaler.inverse_transform(predictions_scaled).flatten()
    
    # 모델 검증 메트릭 (학습 셋에 대한 간단한 오차 계산)
    train_predictions = model.predict(X, verbose=0)
    train_predictions = scaler.inverse_transform(train_predictions)
    y_actual = scaler.inverse_transform(y.reshape(-1, 1))
    
    mse = float(np.mean((train_predictions - y_actual) ** 2))
    mae = float(np.mean(np.abs(train_predictions - y_actual)))
    
    return predictions.tolist(), {"mse": mse, "mae": mae}
