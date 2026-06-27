import React, { useState, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import StockChart from './components/StockChart';
import ReportView from './components/ReportView';
import { Cpu, TrendingUp, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // 로딩 단계 시뮬레이터 (API 응답 시간이 다소 소요되므로 사용자 경험을 극대화)
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev < 4) return prev + 1;
          return prev;
        });
      }, 3500); // 3.5초마다 진행도 업데이트
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handlePredict = async (params) => {
    setLoading(true);
    setLoadingStep(1);
    setError(null);
    setData(null);

    try {
      const response = await fetch('http://localhost:5000/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '예측 모델 학습 중 오류가 발생했습니다.');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error(err);
      setError(err.message || '백엔드 서버와 통신할 수 없습니다. Flask 서버가 켜져 있는지 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 기본으로 애플(AAPL) 주식 정보 한 번 로드
  useEffect(() => {
    handlePredict({
      ticker: 'AAPL',
      period: '2y',
      epochs: 10,
      batch_size: 32
    });
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. 상단 글로벌 네비게이션바 헤더 */}
      <header style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        background: 'rgba(11, 15, 25, 0.8)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
              padding: '8px',
              borderRadius: '10px',
              boxShadow: '0 0 15px rgba(0, 242, 254, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Cpu size={20} style={{ color: '#0b0f19' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ANTIGRAVITY <span className="text-glow-cyan" style={{ fontWeight: '400' }}>STOCK PREDICTOR</span>
              </h1>
              <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>LSTM Deep Learning & Gemini AI Market Report</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontSize: '11px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: '6px 12px',
              borderRadius: '20px',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Sparkles size={12} className="text-glow-cyan" />
              VibeCoding Day 24
            </span>
          </div>
        </div>
      </header>

      {/* 2. 메인 대시보드 컨텐츠 */}
      <main style={{ flex: 1, padding: '24px 0' }}>
        <div className="dashboard-grid">
          {/* 사이드 설정 영역 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <ControlPanel 
              onSubmit={handlePredict} 
              loading={loading} 
              loadingStep={loadingStep} 
            />

            {/* 안내 카드 */}
            <div className="glass-panel" style={{ padding: '20px', fontSize: '13px', lineHeight: '1.6', color: '#94a3b8' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#f8fafc', fontWeight: '700' }}>💡 티커 입력 안내</h3>
              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>미국 주식은 티커 그대로 입력 가능 (예: <code>AAPL</code>, <code>TSLA</code>, <code>NVDA</code>, <code>MSFT</code>)</li>
                <li>한국 주식은 티커 뒤에 <code>.KS</code>(코스피) 또는 <code>.KQ</code>(코스닥)를 붙여야 합니다. (예: 삼성전자 = <code>005930.KS</code>, 에코프로 = <code>086520.KQ</code>)</li>
                <li>최근 상장 종목이나 데이터가 희소한 종목은 예측 오차가 클 수 있습니다.</li>
              </ul>
            </div>
          </div>

          {/* 메인 차트 및 리포트 영역 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 에러 발생 시 경고창 */}
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#fca5a5'
              }}>
                <AlertCircle size={20} style={{ color: '#f87171', flexShrink: 0 }} />
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{error}</span>
              </div>
            )}

            {/* 주가 차트 시각화 */}
            <StockChart 
              history={data?.history} 
              prediction={data?.prediction}
              companyName={data?.company_name}
              ticker={data?.ticker}
            />

            {/* AI 보고서 및 기술 지표 요약 */}
            <ReportView 
              report={data?.report} 
              summary={data?.summary}
              metrics={data?.metrics}
            />
          </div>
        </div>
      </main>

      {/* 3. 하단 푸터 */}
      <footer style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '24px 0',
        textAlign: 'center',
        fontSize: '12px',
        color: '#64748b',
        background: '#070a12'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
          <p style={{ margin: '0 0 6px 0' }}>Antigravity AI Stock Forecast Console © 2026. Pairs Coding with Google Gemini.</p>
          <p style={{ margin: 0, fontSize: '11px', color: '#475569' }}>
            LSTM Recurrent Neural Networks (RNN) are optimized for sequential time series forecasting. 
            AI Market Reports are dynamically summarized by Google Gemini generative models.
          </p>
        </div>
      </footer>
    </div>
  );
}
