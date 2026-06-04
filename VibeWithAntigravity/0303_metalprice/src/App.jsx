import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MetalCard from './components/MetalCard';
import MetalChart from './components/MetalChart';
import { 
  fetchLatestRates, 
  fetchHistoricalRates, 
  METALS 
} from './services/metalApi';

function App() {
  const [currency, setCurrency] = useState('USD');
  const [period, setPeriod] = useState(30);
  
  const [rates, setRates] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. 실시간 가격 페치 (마운트 시 실행)
  useEffect(() => {
    async function loadLatest() {
      try {
        const latestData = await fetchLatestRates();
        setRates(latestData);
      } catch (err) {
        setError(err.message);
      }
    }
    loadLatest();
  }, []);

  // 2. 기간 시세 그래프 페치 (기간 필터 바뀔 때마다 실행)
  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      try {
        const historicalData = await fetchHistoricalRates(period);
        setHistory(historicalData.chartData);
      } catch (err) {
        console.error('History 데이터 로드 에러:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [period]);

  return (
    <div className="dashboard-container">
      {/* 대시보드 헤더 */}
      <Header 
        lastUpdated={rates?.timestamp}
        isMock={rates?.isMock}
        currency={currency}
        setCurrency={setCurrency}
        period={period}
        setPeriod={setPeriod}
      />

      {/* 로딩 인디케이터 (데이터 전체가 들어오기 전까지 표시) */}
      {!rates ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
          🔄 실시간 금속 시세 정보를 불러오는 중입니다...
        </div>
      ) : (
        <>
          {/* 상단 레이아웃: 금속 실시간 시세 카드뷰 */}
          <section className="metal-cards-grid">
            {Object.keys(METALS).map(symbol => (
              <MetalCard 
                key={symbol}
                symbol={symbol}
                data={rates.metals[symbol]}
                currency={currency}
                usdToKrw={rates.usdToKrw}
              />
            ))}
          </section>

          {/* 하단 레이아웃: 세로 정렬 시세 변동 그래프 */}
          <section className="charts-section">
            <div className="charts-section-header">
              <h2>📉 금속별 시세 변동 그래프 ({period === 365 ? '1년' : `${period}일`})</h2>
            </div>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '100px 0', fontSize: '1.1rem', color: 'var(--text-muted)' }}>
                ⚡ 차트 데이터를 갱신하는 중입니다...
              </div>
            ) : (
              Object.keys(METALS).map(symbol => (
                <MetalChart 
                  key={symbol}
                  symbol={symbol}
                  historyData={history?.[symbol]}
                  currency={currency}
                  usdToKrw={rates.usdToKrw}
                />
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default App;
