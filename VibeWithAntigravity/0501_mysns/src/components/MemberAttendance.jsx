import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

export default function MemberAttendance({ user, attendanceList }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // 이전 달로 이동
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  // 다음 달로 이동
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // 캘린더 생성 데이터 계산
  const calendarCells = useMemo(() => {
    const cells = [];
    
    // 이번 달 첫째 날의 요일 (0: 일요일, 6: 토요일)
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    // 이번 달 총 일수
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    // 이전 달 총 일수
    const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();

    // 1. 이전 달의 빈 공간 채우기
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthTotalDays - i,
        isCurrentMonth: false,
        dateStr: `${currentMonth === 0 ? currentYear - 1 : currentYear}-${String(currentMonth === 0 ? 12 : currentMonth).padStart(2, '0')}-${String(prevMonthTotalDays - i).padStart(2, '0')}`
      });
    }

    // 2. 이번 달 날짜 채우기
    for (let i = 1; i <= totalDays; i++) {
      cells.push({
        day: i,
        isCurrentMonth: true,
        dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }

    // 3. 다음 달의 빈 공간 채우기 (7열 배수 맞추기)
    const remaining = 42 - cells.length; // 보통 6주 분량(42셀) 기준
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        dateStr: `${currentMonth === 11 ? currentYear + 1 : currentYear}-${String(currentMonth === 11 ? 1 : currentMonth + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }

    return cells;
  }, [currentYear, currentMonth]);

  // 이번 달 전체 내 출결 기록들 매칭
  const myAttendanceMap = useMemo(() => {
    if (!user) return {};
    const map = {};
    attendanceList
      .filter(a => a.userId === user.uid)
      .forEach(a => {
        map[a.date] = a;
      });
    return map;
  }, [user, attendanceList]);

  // 상세 보기 모달 관련 상태
  const [selectedRecord, setSelectedRecord] = useState(null);

  const handleCellClick = (cell) => {
    const record = myAttendanceMap[cell.dateStr];
    if (record) {
      setSelectedRecord(record);
    } else if (cell.isCurrentMonth) {
      setSelectedRecord({
        date: cell.dateStr,
        status: 'none',
        memo: '출결 기록이 없습니다.'
      });
    }
  };

  // 캘린더 하단 출석률 집계
  const stats = useMemo(() => {
    const records = Object.values(myAttendanceMap).filter(a => {
      const [y, m] = a.date.split('-').map(Number);
      return y === currentYear && m === (currentMonth + 1);
    });

    const total = records.length;
    const attend = records.filter(a => a.status === 'attend').length;
    const late = records.filter(a => a.status === 'late').length;
    const absent = records.filter(a => a.status === 'absent').length;
    const rate = total > 0 ? Math.round(((attend + late) / total) * 100) : 0;

    return { total, attend, late, absent, rate };
  }, [myAttendanceMap, currentYear, currentMonth]);

  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="animate-pop" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>📅 내 출결 기록 조회</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
          월별 캘린더를 통해 출결 체크 이력을 실시간 조회합니다.
        </p>
      </div>

      <div className="card-sns calendar-container">
        {/* Calendar Navigation Header */}
        <div className="calendar-header">
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
            {currentYear}년 {currentMonth + 1}월
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-icon" onClick={handlePrevMonth} title="이전 달">
              <ChevronLeft size={16} />
            </button>
            <button className="btn-icon" onClick={handleNextMonth} title="다음 달">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Days of Week Labels */}
        <div className="calendar-grid">
          {daysOfWeek.map((day, idx) => (
            <div 
              key={day} 
              className="calendar-day-label" 
              style={{ color: idx === 0 ? 'var(--danger)' : idx === 6 ? 'var(--primary)' : 'var(--text-secondary)' }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid Cells */}
        <div className="calendar-grid" style={{ marginTop: '8px' }}>
          {calendarCells.map((cell, idx) => {
            const att = myAttendanceMap[cell.dateStr];
            const isToday = cell.dateStr === new Date().toISOString().slice(0, 10);
            
            return (
              <div 
                key={`${cell.dateStr}_${idx}`}
                className={`calendar-cell ${cell.isCurrentMonth ? 'current-month' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => handleCellClick(cell)}
                style={{ cursor: cell.isCurrentMonth ? 'pointer' : 'default', opacity: cell.isCurrentMonth ? 1 : 0.4 }}
              >
                <span className="day-number">{cell.day}</span>
                {att && cell.isCurrentMonth && (
                  <span className="day-status">
                    {att.status === 'attend' && <span className="badge active" style={{ padding: '2px 6px', fontSize: '9px' }}>출석</span>}
                    {att.status === 'late' && <span className="badge late" style={{ padding: '2px 6px', fontSize: '9px' }}>지각</span>}
                    {att.status === 'absent' && <span className="badge stopped" style={{ padding: '2px 6px', fontSize: '9px' }}>결석</span>}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Stats Summary Bar */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '12px', fontSize: '13px', fontWeight: 600 }}>
          <span style={{ color: 'var(--primary)' }}>이번 달 출석률: {stats.rate}%</span>
          <span style={{ color: 'var(--success)' }}>출석: {stats.attend}회</span>
          <span style={{ color: 'var(--warning)' }}>지각: {stats.late}회</span>
          <span style={{ color: 'var(--danger)' }}>결석: {stats.absent}회</span>
        </div>
      </div>

      {/* 출결 상세 팝업 다이얼로그 */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal-content card-sns animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>📌 출결 상세 정보</h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', marginTop: '4px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>날짜:</span>{' '}
                <span style={{ fontWeight: 700 }}>{selectedRecord.date}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>상태:</span>{' '}
                <span className={`badge ${
                  selectedRecord.status === 'attend' ? 'active' : 
                  selectedRecord.status === 'late' ? 'late' : 
                  selectedRecord.status === 'absent' ? 'stopped' : ''
                }`}>
                  {selectedRecord.status === 'attend' ? '출석' : 
                   selectedRecord.status === 'late' ? '지각' : 
                   selectedRecord.status === 'absent' ? '결석' : '기록 없음'}
                </span>
              </div>
              <div style={{ background: '#f0f2f5', padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <AlertCircle size={16} style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 600, display: 'block', marginBottom: '2px' }}>특이사항/사유:</span>
                  {selectedRecord.memo || '기록된 사유가 없습니다.'}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ marginTop: '8px' }}>
              <button className="btn-primary" onClick={() => setSelectedRecord(null)}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
