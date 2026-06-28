import React from 'react';
import { Users, BookOpen } from 'lucide-react';

// 자체 GitHub SVG 아이콘 정의 (lucide-react 버전 호환성 대비)
const GithubIcon = ({ size = 16, ...props }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    stroke="currentColor" 
    strokeWidth="2" 
    fill="none" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
  </svg>
);

export default function ProfileCard({ profile, onExport }) {
  if (!profile) return null;

  return (
    <div className="glass-card profile-card">
      <img 
        src={profile.avatar_url} 
        alt={`${profile.name} 아바타`} 
        className="profile-avatar" 
      />
      <h2 className="profile-name">{profile.name}</h2>
      <p className="profile-username">@{profile.username}</p>
      
      <p className="profile-bio">{profile.bio}</p>

      <div className="profile-stats">
        <div className="stat-item">
          <span className="stat-val">{profile.followers.toLocaleString()}</span>
          <span className="stat-lbl">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle' }}>
              <Users size={12} /> 팔로워
            </span>
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-val">{profile.public_repos.toLocaleString()}</span>
          <span className="stat-lbl">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle' }}>
              <BookOpen size={12} /> 저장소
            </span>
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <a 
          href={profile.html_url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="profile-link"
        >
          <GithubIcon size={16} /> GitHub 프로필 방문
        </a>
        
        {onExport && (
          <button 
            onClick={onExport}
            className="profile-link"
            style={{ 
              background: 'var(--primary)', 
              borderColor: 'rgba(167, 139, 250, 0.4)',
              cursor: 'pointer',
              width: '100%',
              borderStyle: 'solid'
            }}
          >
            📄 포트폴리오 .md 저장
          </button>
        )}
      </div>
    </div>
  );
}
