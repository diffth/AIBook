import React, { useState } from 'react';
import { User, LogOut, Key, X, Lock } from 'lucide-react';
import { auth, updatePassword } from '../firebase';

export default function MemberProfile({ memberData, onLogout, showToast }) {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    
    // 유효성 체크
    if (newPassword.length < 6) {
      setError('새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Firebase Auth 비밀번호 업데이트 시도
        await updatePassword(currentUser, newPassword);
        showToast('🔑 비밀번호가 성공적으로 변경되었습니다.', 'success');
        
        // 필드 초기화 및 모달 닫기
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
        setIsPasswordModalOpen(false);
      } else {
        setError('로그인 상태가 아닙니다.');
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setError('보안을 위해 로그아웃 후 다시 로그인하여 비밀번호를 변경해 주세요.');
      } else {
        setError('비밀번호 변경에 실패했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-pop" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>👤 내 프로필 정보</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
          소속 등록 정보 조회 및 보안 관련 변경이 가능합니다.
        </p>
      </div>

      {/* Profile Info Card */}
      <div className="card-sns" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div className="avatar-circle" style={{ width: '60px', height: '60px', fontSize: '24px' }}>
            {memberData?.name?.charAt(0) || 'U'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '18px', fontWeight: 800 }}>{memberData?.name}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{memberData?.email}</span>
          </div>
        </div>

        {/* Informational Read-only Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>연락처</span>
            <span style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>{memberData?.phone || '미기입'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>생년월일</span>
            <span style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>{memberData?.birthdate || '미기입'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>성별</span>
            <span style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
              {memberData?.gender === 'male' ? '남성' : memberData?.gender === 'female' ? '여성' : '미기입'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>비상 연락처</span>
            <span style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>{memberData?.emergencyPhone || '미기입'}</span>
          </div>

          {memberData?.memo && (
            <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>관리자 참고 메모</span>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', background: '#f0f2f5', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                {memberData.memo}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <button className="btn-secondary" onClick={() => setIsPasswordModalOpen(true)}>
            <Key size={16} /> 비밀번호 변경
          </button>
          
          <button className="btn-danger" onClick={onLogout}>
            <LogOut size={16} /> 로그아웃
          </button>
        </div>
      </div>

      {/* 비밀번호 변경 모달 */}
      {isPasswordModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="modal-content card-sns animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>🔑 비밀번호 변경</h2>
              <button className="btn-icon" onClick={() => setIsPasswordModalOpen(false)} style={{ background: 'none' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ color: 'var(--danger)', background: 'var(--danger-light)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>새 비밀번호 *</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="password" 
                    placeholder="최소 6자 이상" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    style={{ paddingLeft: '40px' }}
                  />
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label>새 비밀번호 확인 *</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="password" 
                    placeholder="새 비밀번호 다시 입력" 
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    required
                    disabled={loading}
                    style={{ paddingLeft: '40px' }}
                  />
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsPasswordModalOpen(false)} disabled={loading}>취소</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? '변경 중...' : '비밀번호 변경'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
