import React, { useState } from 'react';
import { Users, Mail, Lock, Settings } from 'lucide-react';

export default function Login({ onLogin, onConfigClick }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 간단한 이메일 유효성 체크
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('올바른 이메일 형식을 입력해 주세요.');
      setLoading(false);
      return;
    }

    try {
      await onLogin(email, password);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('존재하지 않는 계정입니다.');
      } else if (err.code === 'auth/wrong-password') {
        setError('비밀번호가 올바르지 않습니다.');
      } else {
        setError('로그인에 실패했습니다. 이메일 또는 비밀번호를 다시 확인해 주세요.');
      }
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

      <div className="login-card card-sns animate-pop">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <div className="login-logo">
            <Users size={56} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Outfit, sans-serif' }}>
            MemberSpace 로그인
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            계정 정보를 입력해 주세요.
          </p>
        </div>

        {error && (
          <div style={{ 
            color: 'var(--danger)', 
            background: 'var(--danger-light)', 
            padding: '10px 14px', 
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            textAlign: 'left',
            marginBottom: '16px',
            border: '1px solid rgba(240, 40, 73, 0.1)'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label style={{ marginBottom: '4px', display: 'block' }}>이메일</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="example@sns.com" 
                style={{ paddingLeft: '40px' }}
                required 
                disabled={loading}
              />
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label style={{ marginBottom: '4px', display: 'block' }}>비밀번호</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="비밀번호 입력" 
                style={{ paddingLeft: '40px' }}
                required 
                disabled={loading}
              />
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', marginTop: '8px' }} disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-muted)' }}>
          <p>임시 계정 정보</p>
          <p style={{ marginTop: '4px' }}>관리자: <b>admin@sns.com</b> / 12345678</p>
          <p>회원: <b>member@sns.com</b> / 12345678</p>
        </div>
      </div>
    </div>
  );
}
