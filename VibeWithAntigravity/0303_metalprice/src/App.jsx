import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MetalCard from './components/MetalCard';
import { 
  fetchLatestRates, 
  METALS } from './services/metalApi';

function App() {
  const [currency, setCurrency] = useState('USD');
  const [rates, setRates] = useState(null);
  const [error, setError] = useState(null);

  // 실시간 가격 페치 (마운트 시 실행)
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

  return (
    <div className="dashboard-container">
      {/* 대시보드 헤더 */}
      <Header 
        lastUpdated={rates?.timestamp}
        isMock={rates?.isMock}
        currency={currency}
        setCurrency={setCurrency}
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
        </>
      )}
    </div>
  );
}

export default App;

