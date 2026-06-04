import React from 'react';

function Header({ 
  lastUpdated, 
  isMock, 
  currency, 
  setCurrency 
}) {
  const formattedTime = lastUpdated 
    ? new Date(lastUpdated).toLocaleString('ko-KR', { hour12: false }) 
    : '로딩 중...';

  return (
    <header className="dashboard-header">
      {/* 타이틀 및 API 연결 상태 */}
      <div className="brand-section">
        <h1>Metal<span>Pulse</span></h1>
        <div className="update-time">
          <span className={`api-indicator ${isMock ? 'mock' : 'live'}`}></span>
          <span>{isMock ? '모의 데이터 시뮬레이션 모드' : 'API 실시간 연결 상태'}</span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span>마지막 업데이트: {formattedTime}</span>
        </div>
      </div>

      {/* 필터 제어 바 (무료 플랜 스펙에 맞추어 기간 선택 제거, 통화 선택만 유지) */}
      <div className="controls-section">
        {/* 통화 선택 */}
        <div className="control-group">
          <button 
            className={`control-btn ${currency === 'USD' ? 'active' : ''}`}
            onClick={() => setCurrency('USD')}
          >
            USD ($)
          </button>
          <button 
            className={`control-btn ${currency === 'KRW' ? 'active' : ''}`}
            onClick={() => setCurrency('KRW')}
          >
            KRW (₩)
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;

