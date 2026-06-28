import React, { useState } from 'react';
import { Apple, Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import FoodInput from './components/FoodInput';
import ResultDashboard from './components/ResultDashboard';

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyzeFood = async (payload) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.message || '음식 영양소 분석에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      setError('서버 통신에 실패했습니다. 백엔드가 가동 중인지 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError('');
  };

  return (
    <div>
      {/* 웰니스 헤더 */}
      <header className="app-header">
        <h1 className="gradient-title">
          🥑 AvoNutri
        </h1>
        <p className="subtitle">AI 기반 음식 영양 분석 및 식단 제안 어시스턴트</p>
      </header>

      {/* 자료 입력 영역 */}
      {!result && (
        <FoodInput onAnalyze={handleAnalyzeFood} loading={loading} />
      )}

      {/* 에러 처리 */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(255, 77, 77, 0.1)',
          border: '1px solid rgba(255, 77, 77, 0.3)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          color: '#ff4d4d',
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontFamily: 'var(--font-heading)'
        }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 로딩 펄스 바 */}
      {loading && (
        <div className="pulse-container">
          <div className="pulse-circle" />
          <div className="pulse-circle" />
          <div className="pulse-circle" />
        </div>
      )}

      {/* 결과 분석 대시보드 */}
      {!loading && result && (
        <div>
          <ResultDashboard result={result} />
          
          {/* 재시도 버튼 */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              style={{ padding: '12px 28px', borderRadius: '10px' }}
            >
              <RefreshCw size={16} /> 새로운 음식 분석하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
