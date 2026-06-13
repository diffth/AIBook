import React, { useState } from 'react';
import { Search, Plus, X, User } from 'lucide-react';

export default function AdminMembers({ 
  members, 
  onRegisterMember, 
  onNavigateToEdit, 
  showToast 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, stopped
  
  // 회원 등록 모달 관련 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('male');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [memo, setMemo] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 필터링 적용된 회원 목록 (역할이 member인 대상만)
  const filteredMembers = members
    .filter(m => m.role === 'member')
    .filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            m.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = statusFilter === 'all' || m.status === statusFilter;
      return matchesSearch && matchesFilter;
    });

  // 회원 등록 핸들러
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 유효성 체크
    if (!email || !password || !name || !phone || !birthdate) {
      setError('필수 항목(* 표시)을 모두 입력해 주세요.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      setLoading(false);
      return;
    }

    try {
      await onRegisterMember({
        email,
        password,
        name,
        phone,
        birthdate,
        gender,
        emergencyPhone,
        memo,
        status: 'active'
      });
      showToast('🎉 신규 회원이 등록되었습니다!', 'success');
      
      // 입력값 리셋 및 모달 닫기
      setEmail('');
      setPassword('');
      setName('');
      setPhone('');
      setBirthdate('');
      setGender('male');
      setEmergencyPhone('');
      setMemo('');
      setIsAddModalOpen(false);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('이미 등록된 이메일 주소입니다.');
      } else {
        setError('회원 등록에 실패했습니다. 입력 양식을 확인해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="members-list-container animate-pop">
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>👥 회원 관리 목록</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
          회원 가입 승인 및 회원 상세 정보 관리가 가능합니다.
        </p>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="이름 또는 이메일 검색..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select 
          style={{ width: '130px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">전체 상태</option>
          <option value="active">정상 회원</option>
          <option value="stopped">정지 회원</option>
        </select>
      </div>

      {/* Members Table */}
      <div className="table-wrapper card-sns">
        <table className="sns-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>전화번호</th>
              <th>생년월일</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length > 0 ? (
              filteredMembers.map((m) => (
                <tr key={m.id} onClick={() => onNavigateToEdit(m.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="avatar-circle" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                      {m.name.charAt(0)}
                    </div>
                    {m.name}
                  </td>
                  <td>{m.email}</td>
                  <td>{m.phone}</td>
                  <td>{m.birthdate}</td>
                  <td>
                    <span className={`badge ${m.status === 'active' ? 'active' : 'stopped'}`}>
                      {m.status === 'active' ? '정상' : '정지'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  등록된 회원이 없거나 검색 결과가 존재하지 않습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Action Button for Add Member */}
      <button 
        className="fab-btn" 
        onClick={() => setIsAddModalOpen(true)}
        title="신규 회원 등록"
      >
        <Plus size={24} />
      </button>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content card-sns animate-pop" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>➕ 신규 회원 등록</h2>
              <button className="btn-icon" onClick={() => setIsAddModalOpen(false)} style={{ background: 'none' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ color: 'var(--danger)', background: 'var(--danger-light)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>이메일 주소 *</label>
                  <input 
                    type="email" 
                    placeholder="example@sns.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>임시 비밀번호 *</label>
                  <input 
                    type="password" 
                    placeholder="최소 6자 이상" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>회원 이름 *</label>
                  <input 
                    type="text" 
                    placeholder="홍길동" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>전화번호 *</label>
                  <input 
                    type="tel" 
                    placeholder="010-1234-5678" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>생년월일 *</label>
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

                <div className="form-group full-width">
                  <label>비상 연락처</label>
                  <input 
                    type="tel" 
                    placeholder="010-9876-5432 (부모님 등)" 
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="form-group full-width">
                  <label>메모 사항</label>
                  <textarea 
                    rows="3" 
                    placeholder="특이사항이나 메모를 기록하세요." 
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    disabled={loading}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)} disabled={loading}>취소</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? '등록 중...' : '회원 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
