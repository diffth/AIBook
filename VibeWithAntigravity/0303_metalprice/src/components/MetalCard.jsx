import React from 'react';
import { METALS } from '../services/metalApi';

function MetalCard({ symbol, data, currency, usdToKrw }) {
  const metalInfo = METALS[symbol];
  if (!metalInfo || !data) return null;

  const { priceUSD, changePercent } = data;
  const isUp = changePercent >= 0;

  // 통화 환산 계산
  const currentPrice = currency === 'KRW' ? priceUSD * usdToKrw : priceUSD;

  // 가격 포맷 함수
  const formatPrice = (val) => {
    if (currency === 'KRW') {
      // 원화의 경우 소수점 없이 또는 1자리까지 표기
      if (symbol === 'XCU') {
        // 구리는 1파운드당 가치가 낮아 소수점을 살려줍니다.
        return `₩${val.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
      }
      return `₩${Math.round(val).toLocaleString('ko-KR')}`;
    } else {
      // 달러 표기
      return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  return (
    <div className={`metal-card ${symbol}`}>
      {/* 카드 상단 타이틀 */}
      <div className="card-header">
        <div className="card-title-group">
          <span className="metal-icon">{metalInfo.icon}</span>
          <div>
            <div className="metal-name">{metalInfo.name}</div>
            <div className="metal-unit">{symbol} / {metalInfo.unit}</div>
          </div>
        </div>
      </div>

      {/* 시세 및 변동률 */}
      <div className="price-display">
        <span className="price-value">{formatPrice(currentPrice)}</span>
        <span className={`price-change-badge ${isUp ? 'up' : 'down'}`}>
          {isUp ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

export default MetalCard;
