import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Key } from 'lucide-react';

export default function AdminMemberEdit({ 
  memberId, 
  members, 
  onUpdateMember, 
  onDeleteMember, 
  onBack, 
  showToast 
}) {
  const member = members.find(m => m.id === memberId);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('male');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [status, setStatus] = useState('active');
  const [memo, setMemo] = useState('');
  
  // 비밀번호 재설정 관련 상태
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [newTempPassword, setNewTempPassword] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setName(member.name || '');
      setPhone(member.phone || '');
      setBirthdate(member.birthdate || '');
      setGender(member.gender || 'male');
      setEmergencyPhone(member.emergencyPhone || '');
      setStatus(member.status || 'active');
      setMemo(member.memo || '');
    }
  }, [member]);

  if (!member) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>존재하지 않거나 정보를 불러올 수 없는 회원입니다.</p>
        <button className="btn-secondary" onClick={onBack} style={{ marginTop: '16px' }}>
          <ArrowLeft size={16} /> 목록으로 돌아가기
        </button>
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onUpdateMember(member.id, {
        name,
        phone,
        birthdate,
        gender,
        emergencyPhone,
        status,
        memo
      });
      showToast('💾 회원 정보가 성공적으로 수정되었습니다.', 'success');
      onBack();
    } catch (error) {
      console.error(error);
      showToast('❌ 정보 수정 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`"${member.name}" 회원을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 모든 출결 및 데이터가 지워집니다.`)) {
      setLoading(true);
      try {
        await onDeleteMember(member.id);
        showToast('🗑️ 회원이 안전하게 삭제되었습니다.', 'success');
        onBack();
      } catch (error) {
        console.error(error);
        showToast('❌ 회원 삭제 중 오류가 발생했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newTempPassword.length < 6) {
      alert('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    try {
      // 보안 규정상 클라이언트 SDK에서 직접 다른 사용자의 비밀번호 변경은 불가하므로, 
      // Firestore에 새 임시 패스워드를 저장하여 해당 회원이 로그인 시 인증할 수 있게 대행합니다.
      await onUpdateMember(member.id, {
        tempPassword: newTempPassword
      });
      showToast(`🔑 "${member.name}" 회원의 임시 비밀번호가 설정되었습니다.`, 'success');
      setIsResetOpen(false);
      setNewTempPassword('');
    } catch (error) {
      console.error(error);
      showToast('❌ 임시 비밀번호 설정에 실패했습니다.', 'error');
    }
  };

  return (
    <div className="animate-pop" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="btn-icon" onClick={onBack} title="목록으로">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>👤 회원 상세/수정 ({member.name})</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>이메일: {member.email}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        <form onSubmit={handleSave} className="card-sns" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-grid">
            <div className="form-group">
              <label>회원 이름</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label>전화번호</label>
              <input 
                type="tel" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required 
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>생년월일</label>
              <input 
                type="date" 
                value={birthdate} 
                onChange={(e) => setBirthdate(e.target.value)} 
                required 
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>성별</label>
              <select 
                value={gender} 
                onChange={(e) => setGender(e.target.value)}
                disabled={loading}
              >
                <option value="male">남성</option>
                <option value="female">여성</option>
              </select>
            </div>

            <div className="form-group">
              <label>회원 상태</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
                disabled={loading}
              >
                <option value="active">정상 (Active)</option>
                <option value="stopped">정지 (Stopped)</option>
              </select>
            </div>

            <div className="form-group">
              <label>비상 연락처</label>
              <input 
                type="tel" 
                value={emergencyPhone} 
                onChange={(e) => setEmergencyPhone(e.target.value)} 
                disabled={loading}
              />
            </div>

            <div className="form-group full-width">
              <label>메모 사항</label>
              <textarea 
                rows="4" 
                value={memo} 
                onChange={(e) => setMemo(e.target.value)} 
                disabled={loading}
              ></textarea>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="btn-danger" 
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 size={16} /> 회원 삭제
              </button>

              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setIsResetOpen(true)}
                disabled={loading}
              >
                <Key size={16} /> 임시 비밀번호 설정
              </button>
            </div>

            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              <Save size={16} /> 정보 저장
            </button>
          </div>
        </form>
      </div>

      {/* 비밀번호 재설정 모달 */}
      {isResetOpen && (
        <div className="modal-overlay" onClick={() => setIsResetOpen(false)}>
          <div className="modal-content card-sns animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔑 임시 비밀번호 발급</h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              회원의 로그인 비밀번호를 대신할 새로운 임시 비밀번호를 Firestore에 저장합니다.
            </p>
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label>새 임시 비밀번호 *</label>
                <input 
                  type="text" 
                  value={newTempPassword} 
                  onChange={(e) => setNewTempPassword(e.target.value)} 
                  placeholder="최소 6자리 이상"
                  required
                />
              </div>
              <div className="modal-footer" style={{ marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsResetOpen(false)}>취소</button>
                <button type="submit" className="btn-primary">저장</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
