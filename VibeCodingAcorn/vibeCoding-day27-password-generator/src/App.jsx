import React, { useState } from 'react';
import { Lock, Terminal, ShieldAlert, RefreshCw } from 'lucide-react';
import PatternInput from './components/PatternInput';
import PasswordCard from './components/PasswordCard';

export default function App() {
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastPattern, setLastPattern] = useState('');

  const handleGenerate = async (pattern) => {
    setLoading(true);
    setError('');
    setLastPattern(pattern);

    try {
      const response = await fetch('/api/generate-passwords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pattern }),
      });

      const data = await response.json();

      if (data.success) {
        setPasswords(data.passwords);
      } else {
        setError(data.message || '비밀번호를 생성하는 중 에러가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
      setError('서버와의 통신에 실패했습니다. 백엔드가 구동 중인지 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPasswords([]);
    setError('');
    setLastPattern('');
  };

  return (
    <div>
      {/* 어플리케이션 헤더 */}
      <header className="app-header">
        <h1 className="gradient-title">
          <Lock size={32} style={{ color: 'var(--primary)' }} /> Cryptoguard
        </h1>
        <p className="subtitle">기억하기 쉬우면서 정보 엔트로피를 극대화한 AI 비밀번호 생성 도우미</p>
      </header>

      {/* 자연어 입력 섹션 */}
      <PatternInput onGenerate={handleGenerate} loading={loading} />

      {/* 에러 렌더링 */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(255, 77, 77, 0.1)',
          border: '1px solid rgba(255, 77, 77, 0.3)',
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '24px',
          color: 'var(--entropy-weak)',
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontFamily: 'var(--font-mono)'
        }}>
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 로딩 펄스 애니메이션 */}
      {loading && (
        <div className="pulse-loader">
          <div className="pulse-dot" />
          <div className="pulse-dot" />
          <div className="pulse-dot" />
        </div>
      )}

      {/* 생성된 비밀번호 리스트 출력 */}
      {!loading && passwords.length > 0 && (
        <div className="fade-in">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            padding: '0 4px'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'var(--font-mono)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={16} className="text-primary" style={{ color: 'var(--primary)' }} />
              추천 비밀번호 후보 3선
            </h3>
            
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClear}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <RefreshCw size={12} /> 목록 초기화
            </button>
          </div>

          <div className="password-list">
            {passwords.map((item, idx) => (
              <PasswordCard
                key={idx}
                passwordItem={item}
                index={idx}
              />
            ))}
          </div>
          
          <p style={{
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginTop: '24px',
            fontFamily: 'var(--font-mono)'
          }}>
            * 조건에 따라 Leetspeak 및 규칙 치환 기법이 유기적으로 가미된 강력한 비밀번호 후보들입니다.
          </p>
        </div>
      )}
    </div>
  );
}
