import React, { useMemo } from 'react';
import { UserCheck, Users, MessageSquare, ArrowRight, ClipboardList, BarChart3 } from 'lucide-react';

export default function AdminDashboard({ 
  members, 
  attendanceList, 
  chatRooms, 
  onNavigate 
}) {
  
  // 오늘 날짜 문자열 구하기 (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // 통계 산출
  const stats = useMemo(() => {
    const totalMembers = members.filter(m => m.role === 'member').length;
    
    // 오늘의 출석 정보
    const todayAtt = attendanceList.filter(a => a.date === todayStr);
    const attendedCount = todayAtt.filter(a => a.status === 'attend' || a.status === 'late').length;
    const attendanceRate = totalMembers > 0 ? Math.round((attendedCount / totalMembers) * 100) : 0;

    // 읽지 않은 대화방 수
    const unreadChats = chatRooms.filter(room => room.unreadCount && room.unreadCount > 0).length;

    return {
      totalMembers,
      attendedCount,
      attendanceRate,
      unreadChats
    };
  }, [members, attendanceList, chatRooms, todayStr]);

  return (
    <div className="animate-pop" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>👋 관리자 님, 환영합니다!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
          회원관리 및 소통 대시보드 요약 정보입니다.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-grid">
        {/* Attendance Stats Card */}
        <div className="dashboard-card card-sns" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="card-icon-container" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
            <UserCheck size={24} />
          </div>
          <div className="stats-info" style={{ flexGrow: 1 }}>
            <span className="stats-title">오늘의 출석현황</span>
            <span className="stats-value">{stats.attendanceRate}% <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>({stats.attendedCount}명 출석)</span></span>
          </div>
        </div>

        {/* Total Members Card */}
        <div className="dashboard-card card-sns" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="card-icon-container" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Users size={24} />
          </div>
          <div className="stats-info" style={{ flexGrow: 1 }}>
            <span className="stats-title">전체 등록 회원</span>
            <span className="stats-value">{stats.totalMembers} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>명</span></span>
          </div>
        </div>

        {/* Unread Chats Card */}
        <div className="dashboard-card card-sns" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="card-icon-container" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
            <MessageSquare size={24} />
          </div>
          <div className="stats-info" style={{ flexGrow: 1 }}>
            <span className="stats-title">새로운 채팅 문의</span>
            <span className="stats-value">{stats.unreadChats} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>개 대화방</span></span>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div style={{ marginTop: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>⚡ 빠른 메뉴 바로가기</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          
          <div className="card-sns" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer' }} onClick={() => onNavigate('members')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Users size={20} style={{ color: 'var(--primary)' }} />
              <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>회원 전체 관리</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>신규 회원 가입 및 정보 수정</span>
            </div>
          </div>

          <div className="card-sns" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer' }} onClick={() => onNavigate('attendance')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <ClipboardList size={20} style={{ color: 'var(--success)' }} />
              <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>일별 출결 관리</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>오늘 및 일자별 회원 출석 관리</span>
            </div>
          </div>

          <div className="card-sns" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer' }} onClick={() => onNavigate('stats')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <BarChart3 size={20} style={{ color: '#ec4899' }} />
              <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>기간별 출결 통계</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>주간/월간 그래프 및 출결 순위</span>
            </div>
          </div>

          <div className="card-sns" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer' }} onClick={() => onNavigate('chats')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <MessageSquare size={20} style={{ color: 'var(--warning)' }} />
              <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>1:1 소통 채팅방</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>회원 실시간 문의 응답 채널</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
