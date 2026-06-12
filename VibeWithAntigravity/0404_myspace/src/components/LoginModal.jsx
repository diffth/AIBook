import React, { useState } from 'react';
import { X, Lock, Mail } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await onLogin(email, password);
      onClose();
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error(err);
      setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card-glass animate-scale" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔐 관리자 로그인</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ 
              color: '#f87171', 
              background: 'rgba(239, 68, 68, 0.1)', 
              padding: '10px', 
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label>이메일 주소</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="admin@myspace.com" 
                style={{ width: '100%', paddingLeft: '40px' }}
                required 
              />
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group">
            <label>비밀번호</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                style={{ width: '100%', paddingLeft: '40px' }}
                required 
              />
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '8px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>취소</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
