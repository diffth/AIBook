import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { METALS } from '../services/metalApi';

// 커스텀 툴팁 컴포넌트
const CustomTooltip = ({ active, payload, label, currency, symbol }) => {
  if (active && payload && payload.length) {
    const rawVal = payload[0].value;
    const formattedVal = currency === 'KRW'
      ? `₩${Math.round(rawVal).toLocaleString('ko-KR')}`
      : `$${rawVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
      <div className="custom-tooltip">
        <p className="custom-tooltip-date">{label}</p>
        <p className="custom-tooltip-value" style={{ color: payload[0].color }}>
          {formattedVal}
        </p>
      </div>
    );
  }
  return null;
};

function MetalChart({ symbol, historyData, currency, usdToKrw }) {
  const metalInfo = METALS[symbol];
  if (!metalInfo || !historyData) return null;

  // 통화 환산된 차트 데이터 생성
  const formattedData = historyData.map(item => ({
    date: item.date,
    price: currency === 'KRW' ? Number((item.price * usdToKrw).toFixed(0)) : item.price
  }));

  // 가격 포맷팅 (Y축 눈금용)
  const formatYAxis = (tickItem) => {
    if (currency === 'KRW') {
      if (tickItem >= 1000000) {
        return `₩${(tickItem / 1000000).toFixed(1)}M`; // 백만 단위
      }
      return `₩${(tickItem / 1000).toFixed(0)}k`; // 천 단위
    }
    return `$${tickItem.toLocaleString()}`;
  };

  const color = metalInfo.color;
  const gradientId = `colorGrad_${symbol}`;

  return (
    <div className="chart-box">
      {/* 차트 헤더 */}
      <div className="chart-header">
        <div className="chart-title">
          <span className="metal-icon">{metalInfo.icon}</span>
          <h3>{metalInfo.name} 시세 동향</h3>
        </div>
        <span className="metal-unit">{metalInfo.unit} 기준</span>
      </div>

      {/* Recharts 그래프 렌더러 */}
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              {/* 네온 영역 채우기용 그라데이션 필터 */}
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickLine={false} 
              axisLine={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis 
              domain={['auto', 'auto']}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxis}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              width={65}
            />
            <Tooltip 
              content={
                <CustomTooltip 
                  currency={currency} 
                  symbol={symbol} 
                />
              } 
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke={color} 
              strokeWidth={2.5}
              fillOpacity={1} 
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0, fill: color }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default MetalChart;
