import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Save, MessageSquare, Edit } from 'lucide-react';

export default function AdminAttendance({ 
  members, 
  attendanceList, 
  onSaveAttendance, 
  showToast 
}) {
  const [targetDate, setTargetDate] = useState('');
  
  // 임시 출결 상태 변경 정보를 모아두는 맵 { userId: { status, memo } }
  const [tempAttendance, setTempAttendance] = useState({});
  const [loading, setLoading] = useState(false);

  // 사유 메모 입력 모달 관련 상태
  const [memoModalOpen, setMemoModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [memoText, setMemoText] = useState('');

  // 오늘 날짜 기본 세팅
  useEffect(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setTargetDate(todayStr);
  }, []);

  const activeMembers = useMemo(() => {
    return members.filter(m => m.role === 'member' && m.status === 'active');
  }, [members]);

  // 날짜나 회원 목록이 변경될 때마다 임시 상태 초기 바인딩
  useEffect(() => {
    if (!targetDate) return;

    const initialTemp = {};
    activeMembers.forEach(member => {
      // 이미 저장된 출결 상태가 있는지 매칭
      const matched = attendanceList.find(a => a.userId === member.id && a.date === targetDate);
      initialTemp[member.id] = {
        status: matched ? matched.status : 'absent', // 기본값은 결석
        memo: matched ? matched.memo : ''
      };
    });
    setTempAttendance(initialTemp);
  }, [targetDate, activeMembers, attendanceList]);

  // 출결 상태 변경 핸들러
  const handleStatusChange = (userId, status) => {
    setTempAttendance(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        status
      }
    }));
  };

  // 메모 모달 열기
  const openMemoModal = (userId) => {
    setSelectedUserId(userId);
    setMemoText(tempAttendance[userId]?.memo || '');
    setMemoModalOpen(true);
  };

  // 메모 저장
  const saveMemo = () => {
    if (selectedUserId) {
      setTempAttendance(prev => ({
        ...prev,
        [selectedUserId]: {
          ...prev[selectedUserId],
          memo: memoText
        }
      }));
    }
    setMemoModalOpen(false);
    setSelectedUserId(null);
  };

  // 일괄 저장 핸들러
  const handleSaveAll = async () => {
    setLoading(true);
    try {
      const recordsToSave = activeMembers.map(member => {
        const info = tempAttendance[member.id] || { status: 'absent', memo: '' };
        return {
          userId: member.id,
          userName: member.name,
          date: targetDate,
          status: info.status,
          memo: info.memo
        };
      });

      await onSaveAttendance(recordsToSave, targetDate);
      showToast(`💾 ${targetDate} 출결 정보가 저장되었습니다.`, 'success');
    } catch (error) {
      console.error(error);
      showToast('❌ 출결 정보 저장에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-pop" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>📅 회원 출결 관리</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
            지정된 날짜의 전체 회원 출결을 체크 및 수정합니다.
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '160px' }}>
            <input 
              type="date" 
              value={targetDate} 
              onChange={(e) => setTargetDate(e.target.value)} 
              disabled={loading}
              style={{ padding: '8px 12px', paddingLeft: '32px' }}
            />
            <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
          
          <button className="btn-primary" onClick={handleSaveAll} disabled={loading} style={{ padding: '8px 14px', fontSize: '13px' }}>
            <Save size={16} /> 일괄 저장
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="table-wrapper card-sns">
        <table className="sns-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>출결 구분</th>
              <th>사유 / 메모</th>
              <th style={{ textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {activeMembers.length > 0 ? (
              activeMembers.map((member) => {
                const info = tempAttendance[member.id] || { status: 'absent', memo: '' };
                return (
                  <tr key={member.id}>
                    <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="avatar-circle" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                        {member.name.charAt(0)}
                      </div>
                      {member.name}
                    </td>
                    <td>
                      <select 
                        style={{ width: '100px', padding: '6px 10px', fontSize: '13px' }}
                        value={info.status}
                        onChange={(e) => handleStatusChange(member.id, e.target.value)}
                        disabled={loading}
                      >
                        <option value="attend">출석</option>
                        <option value="late">지각</option>
                        <option value="absent">결석</option>
                      </select>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: info.memo ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {info.memo || '사유가 작성되지 않았습니다.'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn-secondary" 
                        onClick={() => openMemoModal(member.id)}
                        disabled={loading}
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      >
                        <MessageSquare size={14} /> 사유 작성
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  출결을 체크할 수 있는 활성화된 회원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 사유 입력 모달 */}
      {memoModalOpen && (
        <div className="modal-overlay" onClick={() => setMemoModalOpen(false)}>
          <div className="modal-content card-sns animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>📝 결석/지각 사유 입력</h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              해당 회원의 출결 특이사항 또는 결석 사유를 간단히 기입하세요.
            </p>
            <div className="form-group">
              <textarea 
                rows="4" 
                value={memoText} 
                onChange={(e) => setMemoText(e.target.value)} 
                placeholder="예: 독감으로 인한 병가 결석, 늦잠으로 인한 지각 등"
              />
            </div>
            <div className="modal-footer" style={{ marginTop: '8px' }}>
              <button className="btn-secondary" onClick={() => setMemoModalOpen(false)}>취소</button>
              <button className="btn-primary" onClick={saveMemo}>사유 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
