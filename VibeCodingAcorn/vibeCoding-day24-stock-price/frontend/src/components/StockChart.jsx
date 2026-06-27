import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';

export default function StockChart({ history, prediction, companyName, ticker }) {
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(false);

  if (!history || history.length === 0) {
    return (
      <div className="glass-panel" style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#64748b' }}>표시할 주가 차트 데이터가 없습니다. 먼저 예측 모델을 가동하세요.</p>
      </div>
    );
  }

  // 데이터 추출
  const historyDates = history.map(item => item.date);
  const historyClose = history.map(item => item.close);
  const ma20Data = history.map(item => item.ma20);
  const ma50Data = history.map(item => item.ma50);

  const predDates = prediction ? prediction.map(item => item.date) : [];
  const predClose = prediction ? prediction.map(item => item.close) : [];

  // Plotly 데이터 세팅
  const chartData = [
    // 1. 과거 종가
    {
      x: historyDates,
      y: historyClose,
      type: 'scatter',
      mode: 'lines',
      name: '과거 종가',
      line: { color: '#00f2fe', width: 2 },
      hoverinfo: 'x+y',
      hovertemplate: '날짜: %{x}<br>종가: %{y:.2f}<extra></extra>'
    }
  ];

  // 2. MA20 (활성화 시)
  if (showMA20) {
    chartData.push({
      x: historyDates,
      y: ma20Data,
      type: 'scatter',
      mode: 'lines',
      name: 'MA 20 (20일평균)',
      line: { color: '#e11d48', width: 1.2, opacity: 0.7 },
      hoverinfo: 'skip'
    });
  }

  // 3. MA50 (활성화 시)
  if (showMA50) {
    chartData.push({
      x: historyDates,
      y: ma50Data,
      type: 'scatter',
      mode: 'lines',
      name: 'MA 50 (50일평균)',
      line: { color: '#fbbf24', width: 1.2, opacity: 0.7 },
      hoverinfo: 'skip'
    });
  }

  // 4. 미래 예측 30일
  if (predDates.length > 0) {
    // 과거 차트와 미래 차트가 매끄럽게 연결되도록,
    // 과거 데이터의 마지막 요소를 예측 데이터 맨 앞에 추가합니다.
    const lastHistoryDate = historyDates[historyDates.length - 1];
    const lastHistoryClose = historyClose[historyClose.length - 1];

    chartData.push({
      x: [lastHistoryDate, ...predDates],
      y: [lastHistoryClose, ...predClose],
      type: 'scatter',
      mode: 'lines+markers',
      name: 'AI 30일 예측',
      line: { color: '#ff7a00', width: 2, dash: 'dash' },
      marker: { size: 4, color: '#ff7a00' },
      hoverinfo: 'x+y',
      hovertemplate: '날짜: %{x}<br>예측가: %{y:.2f}<extra></extra>'
    });
  }

  // Plotly 레이아웃 설정
  const layout = {
    title: {
      text: `${companyName} (${ticker}) 주가 추이 및 AI 예측`,
      font: { color: '#f8fafc', size: 16, family: 'Inter, sans-serif' },
      x: 0.05
    },
    paper_bgcolor: 'rgba(0,0,0,0)', // 투명 배경 (글래스모피즘 부모 패널 투영)
    plot_bgcolor: 'rgba(15, 23, 42, 0.3)',
    margin: { l: 60, r: 40, t: 80, b: 60 },
    xaxis: {
      gridcolor: '#1e293b',
      zeroline: false,
      tickfont: { color: '#94a3b8' },
      title: {
        text: '날짜',
        font: { color: '#94a3b8', size: 12 }
      }
    },
    yaxis: {
      gridcolor: '#1e293b',
      zeroline: false,
      tickfont: { color: '#94a3b8' },
      title: {
        text: '가격 ($ / ₩)',
        font: { color: '#94a3b8', size: 12 }
      }
    },
    legend: {
      font: { color: '#cbd5e1' },
      orientation: 'h',
      x: 0.05,
      y: 1.1
    },
    hovermode: 'x unified',
    autosize: true
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'toggleSpikelines']
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} className="text-glow-cyan" />
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>시각화 차트 대시보드</span>
        </div>

        {/* 지표 오버레이 컨트롤 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowMA20(!showMA20)}
            style={{
              background: showMA20 ? 'rgba(225, 29, 72, 0.15)' : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${showMA20 ? 'rgba(225, 29, 72, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
              color: showMA20 ? '#f43f5e' : '#94a3b8',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            {showMA20 ? <Eye size={14} /> : <EyeOff size={14} />}
            20일선 (MA20)
          </button>

          <button
            onClick={() => setShowMA50(!showMA50)}
            style={{
              background: showMA50 ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${showMA50 ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
              color: showMA50 ? '#fbbf24' : '#94a3b8',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            {showMA50 ? <Eye size={14} /> : <EyeOff size={14} />}
            50일선 (MA50)
          </button>
        </div>
      </div>

      <div style={{ width: '100%', minHeight: '450px', overflow: 'hidden' }}>
        <Plot
          data={chartData}
          layout={layout}
          config={config}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%', minHeight: '450px' }}
        />
      </div>
    </div>
  );
}
