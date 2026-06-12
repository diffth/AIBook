import React, { useState } from 'react';
import { Settings, X, RefreshCw } from 'lucide-react';

export default function FirebaseConfigModal({ isOpen, onClose, currentConfig, onSave }) {
  const [apiKey, setApiKey] = useState(currentConfig.apiKey || '');
  const [authDomain, setAuthDomain] = useState(currentConfig.authDomain || '');
  const [projectId, setProjectId] = useState(currentConfig.projectId || '');
  const [storageBucket, setStorageBucket] = useState(currentConfig.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(currentConfig.messagingSenderId || '');
  const [appId, setAppId] = useState(currentConfig.appId || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const newConfig = {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId
    };
    onSave(newConfig);
  };

  const handleReset = () => {
    if (window.confirm('기본 Firebase 설정으로 복원하시겠습니까? (이전에 저장된 커스텀 설정이 삭제됩니다)')) {
      localStorage.removeItem('firebase_space_config');
      window.location.reload();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card-glass animate-scale" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Firebase 설정 관리</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          나만의 Firebase 프로젝트를 연결하여 개인 드라이브로 사용할 수 있습니다. 설정 저장 시 페이지가 새로고침됩니다.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label>API Key</label>
            <input 
              type="text" 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)} 
              placeholder="AIzaSy..." 
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Auth Domain</label>
            <input 
              type="text" 
              value={authDomain} 
              onChange={(e) => setAuthDomain(e.target.value)} 
              placeholder="your-project.firebaseapp.com" 
              required 
            />
          </div>

          <div className="form-group">
            <label>Project ID</label>
            <input 
              type="text" 
              value={projectId} 
              onChange={(e) => setProjectId(e.target.value)} 
              placeholder="your-project" 
              required 
            />
          </div>

          <div className="form-group">
            <label>Storage Bucket</label>
            <input 
              type="text" 
              value={storageBucket} 
              onChange={(e) => setStorageBucket(e.target.value)} 
              placeholder="your-project.firebasestorage.app" 
              required 
            />
          </div>

          <div className="form-group">
            <label>Messaging Sender ID</label>
            <input 
              type="text" 
              value={messagingSenderId} 
              onChange={(e) => setMessagingSenderId(e.target.value)} 
              placeholder="880492358594" 
            />
          </div>

          <div className="form-group">
            <label>App ID</label>
            <input 
              type="text" 
              value={appId} 
              onChange={(e) => setAppId(e.target.value)} 
              placeholder="1:880492358594:web:..." 
              required 
            />
          </div>

          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="btn-danger" onClick={handleReset}>
              <RefreshCw size={16} /> 기본값 복원
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>취소</button>
              <button type="submit" className="btn-primary">설정 저장</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
