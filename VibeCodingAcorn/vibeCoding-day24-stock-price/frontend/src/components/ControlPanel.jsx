import React, { useState } from 'react';
import { Search, Sliders, Play, AlertCircle, RefreshCw } from 'lucide-react';

export default function ControlPanel({ 
  onSubmit, 
  loading, 
  loadingStep 
}) {
  const [ticker, setTicker] = useState('AAPL');
  const [period, setPeriod] = useState('2y');
  const [epochs, setEpochs] = useState(10);
  const [batchSize, setBatchSize] = useState(32);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ticker.trim()) return;
    onSubmit({
      ticker: ticker.toUpperCase().trim(),
      period,
      epochs,
      batch_size: batchSize
    });
  };

  // 대표적인 인기 종목 퀵링크
  const quickTickers = [
    { label: '애플', value: 'AAPL' },
    { label: '테슬라', value: 'TSLA' },
    { label: '엔비디아', value: 'NVDA' },
    { label: '삼성전자', value: '005930.KS' },
    { label: 'SK하이닉스', value: '000660.KS' }
  ];

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sliders size={20} className="text-glow-cyan" />
        예측 시뮬레이터 설정
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 종목 입력 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', color: '#94a3b8' }}>주식 종목 티커</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="예: AAPL, TSLA, 005930.KS"
              disabled={loading}
              style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '40px' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#64748b' }} />
          </div>
        </div>

        {/* 간편 선택 종목들 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {quickTickers.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTicker(t.value)}
              disabled={loading}
              style={{
                background: ticker === t.value ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${ticker === t.value ? 'rgba(0, 242, 254, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
                color: ticker === t.value ? '#00f2fe' : '#94a3b8',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 분석 데이터 기간 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', color: '#94a3b8' }}>과거 데이터 분석 기간</label>
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            disabled={loading}
            style={{ width: '100%' }}
          >
            <option value="1y">최근 1년 (학습 속도 빠름)</option>
            <option value="2y">최근 2년 (추천 - 적절한 학습량)</option>
            <option value="5y">최근 5년 (장기 트렌드 분석)</option>
          </select>
        </div>

        {/* 고급 설정 토글 */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '13px',
            cursor: 'pointer',
            textAlign: 'left',
            padding: '4px 0',
            textDecoration: 'underline',
            marginTop: '4px'
          }}
        >
          {showAdvanced ? '설정 숨기기' : 'LSTM 모델 고급 설정'}
        </button>

        {showAdvanced && (
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.2)', 
            padding: '16px', 
            borderRadius: '8px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            border: '1px solid rgba(255, 255, 255, 0.03)'
          }}>
            {/* 에포크 크기 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#94a3b8' }}>학습 횟수 (Epochs)</span>
                <span className="text-glow-cyan" style={{ fontWeight: 'bold' }}>{epochs}</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={epochs}
                onChange={(e) => setEpochs(Number(e.target.value))}
                disabled={loading}
                style={{ cursor: 'pointer', padding: 0 }}
              />
              <span style={{ fontSize: '11px', color: '#64748b' }}>값이 클수록 정교하지만 학습 시간이 늘어납니다.</span>
            </div>

            {/* 배치 사이즈 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>배치 사이즈 (Batch Size)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[16, 32, 64].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setBatchSize(size)}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      background: batchSize === size ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${batchSize === size ? 'rgba(0, 242, 254, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                      color: batchSize === size ? '#00f2fe' : '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 분석 버튼 */}
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{ marginTop: '8px' }}
        >
          {loading ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              분석 및 학습 중...
            </>
          ) : (
            <>
              <Play size={18} fill="currentColor" />
              AI 예측 모델 가동
            </>
          )}
        </button>
      </form>

      {/* 로딩 진행 바 및 세부 내용 안내 */}
      {loading && (
        <div style={{ 
          marginTop: '20px', 
          padding: '14px', 
          background: 'rgba(0, 242, 254, 0.03)', 
          border: '1px dashed rgba(0, 242, 254, 0.2)', 
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <div className="pulse-glow-cyan" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f2fe' }}></div>
            <span style={{ color: '#00f2fe', fontWeight: '500' }}>현재 단계:</span>
          </div>
          <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 'bold' }}>
            {loadingStep === 1 && '1/4. yfinance 주가 데이터 수집 중...'}
            {loadingStep === 2 && '2/4. pandas 기술적 지표 생성 및 스케일링...'}
            {loadingStep === 3 && '3/4. LSTM 레이어 모델 빌드 및 실시간 학습 중...'}
            {loadingStep === 4 && '4/4. Gemini AI 시장 리포트 생성 중...'}
          </div>
          <div style={{ width: '100%', height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                background: 'linear-gradient(90deg, #00f2fe, #4facfe)', 
                width: `${(loadingStep / 4) * 100}%`,
                transition: 'width 0.4s ease'
              }}
            ></div>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
            * LSTM 인공신경망 학습에는 수초에서 수십초의 연산 시간이 소요됩니다. 잠시만 기다려주세요!
          </p>
        </div>
      )}
    </div>
  );
}
