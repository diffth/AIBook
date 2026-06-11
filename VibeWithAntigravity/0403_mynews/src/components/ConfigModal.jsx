import React, { useState, useEffect } from "react";

export default function ConfigModal({ isOpen, onClose, currentConfig, onSave, onReset }) {
  const [form, setForm] = useState({
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  });

  useEffect(() => {
    if (currentConfig) {
      setForm({
        apiKey: currentConfig.apiKey || "",
        authDomain: currentConfig.authDomain || "",
        databaseURL: currentConfig.databaseURL || "",
        projectId: currentConfig.projectId || "",
        storageBucket: currentConfig.storageBucket || "",
        messagingSenderId: currentConfig.messagingSenderId || "",
        appId: currentConfig.appId || ""
      });
    }
  }, [currentConfig, isOpen]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    const key = id.replace("cfg-", "").replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    
    // map HTML ID names to state key names
    let stateKey = key;
    if (id === "cfg-db-url") stateKey = "databaseURL";
    if (id === "cfg-sender-id") stateKey = "messagingSenderId";

    setForm((prev) => ({
      ...prev,
      [stateKey]: value
    }));
  };

  const handleSave = () => {
    if (!form.databaseURL.trim()) {
      alert("Database URL은 필수 입력 항목입니다.");
      return;
    }
    onSave(form);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" onClick={(e) => e.target.classList.contains("modal-overlay") && onClose()}>
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">Firebase 연동 설정</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
            개인 프로젝트의 Firebase Realtime Database와 연동하기 위해 아래 정보를 입력해 주세요. 기본 데모 프로젝트 정보가 채워져 있어 바로 테스트해 볼 수 있습니다.
          </p>
          
          <div className="input-group">
            <label htmlFor="cfg-db-url">Database URL *</label>
            <input 
              type="text" 
              id="cfg-db-url" 
              placeholder="https://your-database.firebaseio.com/" 
              value={form.databaseURL} 
              onChange={handleChange}
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="cfg-api-key">API Key</label>
            <input 
              type="text" 
              id="cfg-api-key" 
              placeholder="AIzaSy..." 
              value={form.apiKey} 
              onChange={handleChange}
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="cfg-auth-domain">Auth Domain</label>
            <input 
              type="text" 
              id="cfg-auth-domain" 
              placeholder="your-project.firebaseapp.com" 
              value={form.authDomain} 
              onChange={handleChange}
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="cfg-project-id">Project ID</label>
            <input 
              type="text" 
              id="cfg-project-id" 
              placeholder="your-project" 
              value={form.projectId} 
              onChange={handleChange}
            />
          </div>

          <div className="input-group">
            <label htmlFor="cfg-storage-bucket">Storage Bucket</label>
            <input 
              type="text" 
              id="cfg-storage-bucket" 
              placeholder="your-project.firebasestorage.app" 
              value={form.storageBucket} 
              onChange={handleChange}
            />
          </div>

          <div className="input-group">
            <label htmlFor="cfg-sender-id">Messaging Sender ID</label>
            <input 
              type="text" 
              id="cfg-sender-id" 
              placeholder="880492358594" 
              value={form.messagingSenderId} 
              onChange={handleChange}
            />
          </div>

          <div className="input-group">
            <label htmlFor="cfg-app-id">App ID</label>
            <input 
              type="text" 
              id="cfg-app-id" 
              placeholder="1:880492:web:..." 
              value={form.appId} 
              onChange={handleChange}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onReset}>기본값 리셋</button>
          <button className="btn-primary" onClick={handleSave}>설정 저장</button>
        </div>
      </div>
    </div>
  );
}
