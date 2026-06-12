import React from 'react';
import { HardDrive, LogIn, LogOut, Settings } from 'lucide-react';

export default function Header({ user, onLoginClick, onLogout, onConfigClick }) {
  return (
    <header className="app-header card-glass animate-fade">
      <div className="logo-section">
        <HardDrive className="logo-icon" size={32} />
        <h1>MySpace Drive</h1>
      </div>
      
      <div className="header-actions">
        {user && <span className="admin-badge">Admin</span>}
        
        <button className="btn-icon" onClick={onConfigClick} title="Firebase 설정">
          <Settings size={20} />
        </button>

        {user ? (
          <button className="btn-secondary" onClick={onLogout}>
            <LogOut size={16} /> 로그아웃
          </button>
        ) : (
          <button className="btn-primary" onClick={onLoginClick}>
            <LogIn size={16} /> 관리자 로그인
          </button>
        )}
      </div>
    </header>
  );
}
