import React, { useEffect } from 'react';
import { Users } from 'lucide-react';

export default function Splash({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1500); // 1.5초 후 스플래시 종료
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="splash-container">
      <div className="splash-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <Users size={80} />
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '32px', fontWeight: 800, color: 'var(--primary)' }}>
          MemberSpace
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
          회원관리 및 소통 SNS 프로그램
        </p>
      </div>
      
      <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '24px',
          height: '24px',
          border: '3px solid var(--border-color)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>인증 상태 확인 중...</span>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
