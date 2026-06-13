import React from 'react';
import { BarChart3, Users, BookOpen, LogOut, Settings } from 'lucide-react';

export default function AdminLayout({ activeTab, onTabChange, onLogout, children }) {
  return (
    <div className="admin-container">
      {/* Sidebar navigation */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <Settings size={22} style={{ animation: 'spin 4s linear infinite' }} />
          <span>MemberSpace 어드민</span>
        </div>

        <nav className="admin-nav-list">
          <button 
            className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => onTabChange('dashboard')}
          >
            <BarChart3 size={18} /> 대시보드 통계
          </button>
          
          <button 
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => onTabChange('users')}
          >
            <Users size={18} /> 사용자 관리
          </button>

          <button 
            className={`admin-nav-item ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => onTabChange('posts')}
          >
            <BookOpen size={18} /> 콘텐츠 관리
          </button>

          <button 
            className="admin-nav-item" 
            onClick={onLogout}
            style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}
          >
            <LogOut size={18} /> 로그아웃
          </button>
        </nav>
      </aside>

      {/* Main Admin Content Section */}
      <main className="admin-content-area">
        {children}
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
