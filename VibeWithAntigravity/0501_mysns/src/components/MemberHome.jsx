import React, { useMemo } from 'react';
import { UserCheck, ClipboardList, Calendar, CheckCircle } from 'lucide-react';

export default function MemberHome({ 
  user, 
  memberData, 
  attendanceList, 
  onCheckIn, 
  showToast 
}) {
  
  // 오늘 날짜 문자열 (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // 오늘 날짜의 내 출석 기록이 있는지 확인
  const todayRecord = useMemo(() => {
    if (!user) return null;
    return attendanceList.find(a => a.userId === user.uid && a.date === todayStr);
  }, [user, attendanceList, todayStr]);

  // 이번 달 내 출석률 계산
  const monthlyStats = useMemo(() => {
    if (!user) return { rate: 0, total: 0, attended: 0 };
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    // 이번 달 내 출결 기록들 필터링
    const myMonthlyRecords = attendanceList.filter(a => {
      if (a.userId !== user.uid) return false;
      const [y, m] = a.date.split('-').map(Number);
      return y === currentYear && m === currentMonth;
    });

    const total = myMonthlyRecords.length;
    const attended = myMonthlyRecords.filter(a => a.status === 'attend' || a.status === 'late').length;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

    return { rate, total, attended };
  }, [user, attendanceList]);

  // 출석 체크 실행 핸들러 (시간 기준 판정)
  const handleCheckInClick = () => {
    if (todayRecord) {
      showToast('⚠️ 오늘은 이미 출석 체크가 완료되었습니다.', 'warning');
      return;
    }

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    let status = 'absent';
    let label = '결석';

    // 시간 판정 규칙: 
    // 09:00 이하 -> 출석 (totalMinutes <= 9 * 60 = 540)
    // 09:30 이하 -> 지각 (totalMinutes <= 9 * 60 + 30 = 570)
    // 09:30 초과 -> 결석 (totalMinutes > 570)
    if (totalMinutes <= 540) {
      status = 'attend';
      label = '출석';
    } else if (totalMinutes <= 570) {
      status = 'late';
      label = '지각';
    }

    onCheckIn(status);
    showToast(`⏰ 오늘의 출석 체크 결과: [${label}] 처리되었습니다!`, 'success');
  };

  return (
    <div className="animate-pop" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome message card */}
      <div className="card-sns" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, var(--primary-light) 0%, #ffffff 100%)', border: '1px solid var(--primary-light)' }}>
        <div className="avatar-circle" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
          {memberData?.name?.charAt(0) || 'U'}
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>안녕하세요, {memberData?.name || '회원'} 님!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
            오늘도 활기찬 하루가 시작되었습니다. 아래 버튼을 눌러 출석을 기록해 주세요.
          </p>
        </div>
      </div>

      {/* Attendance Checkin Area */}
      <div className="card-sns attendance-checkin-card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>📅 오늘의 출석 체크인</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          출석 기준: ~09:00 출석 / 09:00~09:30 지각 / 09:30~ 결석
        </p>

        <div style={{ margin: '20px 0' }}>
          {todayRecord ? (
            <div className="checkin-circle disabled">
              <CheckCircle size={32} style={{ color: 'var(--success)' }} />
              <span style={{ fontSize: '15px', fontWeight: 700 }}>출석 완료</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {todayRecord.status === 'attend' ? '출석' : todayRecord.status === 'late' ? '지각' : '결석'}
              </span>
            </div>
          ) : (
            <div className="checkin-circle" onClick={handleCheckInClick}>
              <UserCheck size={32} />
              <span style={{ fontSize: '15px', fontWeight: 700 }}>출석 체크</span>
              <span style={{ fontSize: '11px' }}>체크인 하기</span>
            </div>
          )}
        </div>

        {todayRecord && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', background: 'var(--success-light)', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
            오늘 출석 기록이 존재합니다. ({todayRecord.status === 'attend' ? '출석' : todayRecord.status === 'late' ? '지각' : '결석'})
          </div>
        )}
      </div>

      {/* Stats Summary Grid */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="dashboard-card card-sns" style={{ borderLeft: '4px solid var(--primary)', padding: '16px' }}>
          <div className="card-icon-container" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', width: '40px', height: '40px' }}>
            <ClipboardList size={20} />
          </div>
          <div className="stats-info">
            <span className="stats-title" style={{ fontSize: '12px' }}>이번 달 출석률</span>
            <span className="stats-value" style={{ fontSize: '20px' }}>{monthlyStats.rate}%</span>
          </div>
        </div>

        <div className="dashboard-card card-sns" style={{ borderLeft: '4px solid var(--success)', padding: '16px' }}>
          <div className="card-icon-container" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', width: '40px', height: '40px' }}>
            <Calendar size={20} />
          </div>
          <div className="stats-info">
            <span className="stats-title" style={{ fontSize: '12px' }}>출석 인정 일수</span>
            <span className="stats-value" style={{ fontSize: '20px' }}>{monthlyStats.attended}일 / {monthlyStats.total}일</span>
          </div>
        </div>
      </div>
    </div>
  );
}
