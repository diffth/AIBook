import React from 'react';
import { Users, BookOpen, BarChart3 } from 'lucide-react';

export default function AdminDashboard({ members, posts }) {
  
  // 관리자가 아닌 일반 회원 계정만 집계
  const totalMembers = members.filter(m => m.role === 'member').length;
  const totalPosts = posts.length;

  return (
    <div className="animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1c223f' }}>📊 대시보드 통계</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
          서비스에 가입된 회원 수 및 업로드된 총 콘텐츠 수 요약입니다.
        </p>
      </div>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* 회원 수 통계 카드 */}
        <div className="dashboard-card card-sns" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid var(--primary)' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Users size={28} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>총 가입 사용자 수</span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {totalMembers} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>명</span>
            </span>
          </div>
        </div>

        {/* 게시글 콘텐츠 수 통계 카드 */}
        <div className="dashboard-card card-sns" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid var(--success)' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--success-light)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <BookOpen size={28} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>총 등록 콘텐츠 수</span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {totalPosts} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>개</span>
            </span>
          </div>
        </div>

      </div>

      {/* 실시간 모니터링 브리핑 */}
      <div className="card-sns" style={{ padding: '20px', background: 'var(--bg-secondary)', marginTop: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <BarChart3 size={18} style={{ color: 'var(--primary)' }} /> 어드민 브리핑 가이드
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          좌측 메뉴의 **[사용자 관리]** 탭을 클릭하여 불량 사용자의 계정을 접속 차단(블락) 또는 강제 삭제 처리하실 수 있습니다.
          또한 **[콘텐츠 관리]** 탭에서는 사용자들이 올린 모든 게시글, 댓글, 사진 및 동영상을 실시간 편집 및 개별 삭제 가능합니다.
        </p>
      </div>
    </div>
  );
}
