import React from 'react';
import { FileText, Cpu, AlertTriangle, TrendingUp, TrendingDown, Layers, Zap } from 'lucide-react';

// 매우 간단한 마크다운 -> HTML 변환 헬퍼 함수
function parseMarkdown(md) {
  if (!md) return '';
  
  let html = md;
  
  // 1. 헤더 변환
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // 2. 인용문 변환
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
  
  // 3. 굵은 글씨 변환
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // 4. 글머리 기호 변환
  html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');
  // li 태그들을 ul로 묶어주는 임시 처리
  html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
  // 중복 <ul> 제거
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  
  // 5. 개행 처리
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

export default function ReportView({ report, summary, metrics }) {
  if (!report) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        <FileText size={48} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
        AI 시장 리포트가 아직 생성되지 않았습니다.
      </div>
    );
  }

  const isUp = (summary?.predicted_pct_change || 0) >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 주요 데이터 요약 카드 대시보드 */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}>
          {/* 현재가 */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>최근 종가</span>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc' }}>
              {summary.latest_close?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ 
              fontSize: '13px', 
              color: summary.pct_change >= 0 ? '#00ff87' : '#ff4a4a',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {summary.pct_change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {summary.price_change >= 0 ? '+' : ''}{summary.price_change?.toFixed(2)} ({summary.pct_change?.toFixed(2)}%)
            </span>
          </div>

          {/* 30일 예측가 및 전망 */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: `4px solid ${isUp ? '#00ff87' : '#ff4a4a'}` }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>AI 30일 후 예측가</span>
            <span className={isUp ? 'text-glow-green' : 'text-glow-orange'} style={{ fontSize: '24px', fontWeight: '800' }}>
              {summary.predicted_30d_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ 
              fontSize: '13px', 
              color: isUp ? '#00ff87' : '#ff4a4a',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              예상 등락률: {isUp ? '+' : ''}{summary.predicted_pct_change?.toFixed(2)}%
            </span>
          </div>

          {/* RSI */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>RSI (14일 상대강도)</span>
            <span style={{ fontSize: '24px', fontWeight: '800', color: summary.rsi >= 70 ? '#ff4a4a' : (summary.rsi <= 30 ? '#00ff87' : '#cbd5e1') }}>
              {summary.rsi?.toFixed(1)}
            </span>
            <span style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={14} style={{ color: '#fbbf24' }} />
              {summary.rsi_status}
            </span>
          </div>

          {/* 오차율 메트릭 */}
          {metrics && (
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>LSTM 모델 오차율 (MAE)</span>
              <span style={{ fontSize: '24px', fontWeight: '800', color: '#60a5fa' }}>
                {metrics.mae?.toFixed(4)}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                학습 MSE: {metrics.mse?.toFixed(6)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Gemini 분석 리포트 본문 카드 */}
      <div className="glass-panel" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
        {/* 네온 배경 장식 */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'rgba(0, 242, 254, 0.05)',
          filter: 'blur(40px)',
          pointerEvents: 'none'
        }}></div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '16px',
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={22} className="text-glow-cyan" />
            AI 시장 분석 리포트
          </h2>
          <span style={{
            fontSize: '11px',
            background: 'rgba(0, 242, 254, 0.1)',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            color: '#00f2fe',
            padding: '4px 8px',
            borderRadius: '12px',
            fontWeight: 'bold',
            letterSpacing: '0.5px'
          }}>
            GEMINI AGENT POWERED
          </span>
        </div>

        <div 
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: parseMarkdown(report) }}
        />

        {/* 법적 고지사항 */}
        <div style={{
          marginTop: '32px',
          padding: '16px',
          background: 'rgba(239, 68, 68, 0.03)',
          border: '1px solid rgba(239, 68, 68, 0.1)',
          borderRadius: '8px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ef4444' }}>투자 유의사항 (Disclaimer)</span>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              본 리포트와 주가 예측 결과는 인공지능 모델(LSTM 및 Gemini)이 과거 데이터를 통계적으로 학습한 결과물이며,
              실제 투자 성과를 보장하지 않습니다. 주식 투자는 원금 손실의 위험이 따르며, 최종적인 투자 결정과 그 결과에 대한 책임은
              투자자 본인에게 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
