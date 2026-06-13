import React, { useState } from 'react';
import { Users, LogIn, ShieldAlert, Settings } from 'lucide-react';

export default function Login({ onGoogleLogin, onAdminLogin, onConfigClick }) {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onAdminLogin(email, password);
    } catch (err) {
      console.error(err);
      setError('관리자 인증에 실패했습니다. 이메일 또는 비밀번호를 다시 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setError('');
    setLoading(true);
    try {
      await onGoogleLogin();
    } catch (err) {
      console.error(err);
      setError('구글 로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <button 
        className="btn-icon" 
        onClick={onConfigClick}
        style={{ position: 'absolute', top: '20px', right: '20px' }}
        title="Firebase 설정"
      >
        <Settings size={20} />
      </button>

      <div className="login-card card-sns animate-slide">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <Users size={56} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Outfit, sans-serif' }}>
            MemberSpace SNS
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            {isAdminMode ? '어드민 관리 콘솔 로그인' : '친구들과 소소한 일상을 공유해 보세요!'}
          </p>
        </div>

        {error && (
          <div style={{ 
            color: 'var(--danger)', 
            background: 'var(--danger-light)', 
            padding: '10px 12px', 
            borderRadius: 'var(--radius-md)', 
            fontSize: '13px',
            textAlign: 'left',
            marginBottom: '16px',
            border: '1px solid rgba(240, 40, 73, 0.1)'
          }}>
            ⚠️ {error}
          </div>
        )}

        {!isAdminMode ? (
          /* User Mode: Google Login */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button 
              className="btn-primary" 
              style={{ 
                padding: '12px', 
                fontSize: '15px', 
                background: '#ffffff', 
                color: '#757575',
                border: '1px solid #ced1d6',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px'
              }}
              onClick={handleGoogleClick}
              disabled={loading}
            >
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
                alt="Google" 
                style={{ width: '18px', height: '18px' }}
              />
              구글 계정으로 로그인
            </button>

            <button 
              className="btn-secondary" 
              style={{ fontSize: '13px', padding: '8px 12px', alignSelf: 'center', background: 'none' }}
              onClick={() => setIsAdminMode(true)}
              disabled={loading}
            >
              💼 관리자 로그인으로 전환
            </button>
          </div>
        ) : (
          /* Admin Mode: Email/Password Login */
          <form onSubmit={handleAdminSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>관리자 이메일</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sns.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group" style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>비밀번호</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '12px', fontSize: '14px' }} disabled={loading}>
              <LogIn size={16} /> {loading ? '로그인 중...' : '관리자 콘솔 접속'}
            </button>

            <button 
              type="button"
              className="btn-secondary" 
              style={{ fontSize: '13px', padding: '8px 12px', alignSelf: 'center', background: 'none' }}
              onClick={() => setIsAdminMode(false)}
              disabled={loading}
            >
              ⬅️ 일반 사용자 로그인으로 전환
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
