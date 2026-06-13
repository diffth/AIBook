import React, { useState } from 'react';
import { ShieldAlert, Trash2, Edit2, X, Check } from 'lucide-react';

export default function AdminUsers({ members, onUpdateUser, onDeleteUser, showToast }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [editNickname, setEditNickname] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editStatus, setEditStatus] = useState('active');

  // 일반 회원 목록만 필터
  const memberUsers = members.filter(m => m.role === 'member');

  // 회원 상세 편집 모달 열기
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditNickname(user.nickname || '');
    setEditBio(user.bio || '');
    setEditStatus(user.status || 'active');
  };

  // 회원 정보 업데이트 전송
  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedUser || !editNickname.trim()) return;

    try {
      await onUpdateUser(selectedUser.id, {
        nickname: editNickname.trim(),
        bio: editBio.trim(),
        status: editStatus
      });
      showToast(`💾 "${selectedUser.nickname}" 회원의 정보가 수정되었습니다.`, 'success');
      setSelectedUser(null);
    } catch (error) {
      console.error(error);
      showToast('❌ 회원 정보 수정에 실패했습니다.', 'error');
    }
  };

  // 회원 차단 토글
  const handleToggleBlock = async (user) => {
    const nextStatus = user.status === 'blocked' ? 'active' : 'blocked';
    const confirmMsg = nextStatus === 'blocked' 
      ? `"${user.nickname}" 회원을 차단(접속 불가) 상태로 변경하시겠습니까?`
      : `"${user.nickname}" 회원의 차단을 해제하시겠습니까?`;

    if (window.confirm(confirmMsg)) {
      try {
        await onUpdateUser(user.id, { status: nextStatus });
        showToast(`⚙️ 회원 상태가 [${nextStatus === 'blocked' ? '차단' : '정상'}]으로 갱신되었습니다.`, 'success');
      } catch (error) {
        console.error(error);
        showToast('❌ 회원 상태 변경에 실패했습니다.', 'error');
      }
    }
  };

  // 회원 탈퇴 처리
  const handleDelete = async (user) => {
    if (window.confirm(`"${user.nickname}" 회원을 강제 탈퇴(삭제)하시겠습니까?\n이 작업은 복구 불가능합니다.`)) {
      try {
        await onDeleteUser(user.id);
        showToast(`🗑️ "${user.nickname}" 회원이 영구 삭제되었습니다.`, 'success');
      } catch (error) {
        console.error(error);
        showToast('❌ 회원 삭제 중 에러가 발생했습니다.', 'error');
      }
    }
  };

  return (
    <div className="animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1c223f' }}>👥 사용자 관리</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
          가입된 사용자 리스트를 모니터링하고 수정, 삭제, 차단 처리를 조율합니다.
        </p>
      </div>

      <div className="table-wrapper card-sns">
        <table className="sns-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>프로필</th>
              <th>닉네임</th>
              <th>이메일 주소</th>
              <th>상태</th>
              <th style={{ textAlign: 'right' }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {memberUsers.length > 0 ? (
              memberUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="avatar-circle" style={{ width: '32px', height: '32px' }}>
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.nickname} />
                      ) : (
                        user.nickname?.charAt(0)
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{user.nickname}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${user.status === 'active' ? 'active' : 'stopped'}`}>
                      {user.status === 'active' ? '정상' : '정지(블락)'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => handleOpenEdit(user)}
                      >
                        <Edit2 size={13} /> 정보 수정
                      </button>
                      <button 
                        className="btn-secondary" 
                        style={{ 
                          padding: '6px 10px', 
                          fontSize: '12px',
                          color: user.status === 'blocked' ? 'var(--success)' : 'var(--warning)',
                          backgroundColor: user.status === 'blocked' ? 'var(--success-light)' : 'var(--warning-light)',
                          border: 'none'
                        }}
                        onClick={() => handleToggleBlock(user)}
                      >
                        <ShieldAlert size={13} /> {user.status === 'blocked' ? '차단 해제' : '정지 설정'}
                      </button>
                      <button 
                        className="btn-danger" 
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => handleDelete(user)}
                      >
                        <Trash2 size={13} /> 탈퇴
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  가입된 일반 회원이 존재하지 않습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 회원 수정 모달 팝업 */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content card-sns animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>✏️ 회원 정보 직접 수정 ({selectedUser.email})</h2>
              <button className="btn-icon" onClick={() => setSelectedUser(null)} style={{ background: 'none' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label>닉네임</label>
                <input 
                  type="text" 
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>남김말</label>
                <textarea 
                  rows="3"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>계정 상태</label>
                <select 
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="active">정상 (Active)</option>
                  <option value="blocked">접속불가 (Blocked)</option>
                </select>
              </div>

              <div className="modal-footer" style={{ marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setSelectedUser(null)}>취소</button>
                <button type="submit" className="btn-primary">정보 저장</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
