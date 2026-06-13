import React, { useEffect } from 'react';
import { Users } from 'lucide-react';

export default function Splash({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="splash-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      <div className="splash-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <Users size={80} style={{ color: 'var(--primary)', animation: 'pulseLogo 1.5s infinite ease-in-out' }} />
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '32px', fontWeight: 800, color: 'var(--primary)' }}>
          MemberSpace SNS
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
          소셜 피드 & 콘텐츠 공유 서비스
        </p>
      </div>

      <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div className="spinner" style={{
          width: '24px',
          height: '24px',
          border: '3px solid var(--border-light)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulseLogo {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px var(--primary-glow)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 16px var(--primary)); }
        }
      `}</style>
    </div>
  );
}
