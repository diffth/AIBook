import React, { useState, useRef } from 'react';
import { UploadCloud, File } from 'lucide-react';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function FileUpload({ onUpload, uploadProgress, isUploading, showToast }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const validateAndUpload = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      showToast('⚠️ 파일 크기는 최대 50MB까지 업로드 가능합니다.', 'error');
      return;
    }
    onUpload(file);
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div 
      className={`dropzone card-glass ${dragActive ? 'drag-active' : ''} animate-fade`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={!isUploading ? onButtonClick : undefined}
      style={{ pointerEvents: isUploading ? 'none' : 'auto', opacity: isUploading ? 0.7 : 1 }}
    >
      <input 
        ref={fileInputRef}
        type="file" 
        style={{ display: 'none' }} 
        onChange={handleChange}
        disabled={isUploading}
      />
      
      {!isUploading ? (
        <>
          <UploadCloud size={48} className="dropzone-icon" />
          <div>
            <p style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>
              클릭하여 파일을 선택하거나 이곳에 드래그하세요.
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              최대 50MB 이하의 모든 파일 형식 업로드 가능
            </p>
          </div>
        </>
      ) : (
        <>
          <File size={36} style={{ color: 'var(--secondary)' }} />
          <div className="upload-progress-container">
            <div className="progress-text">
              <span>업로드 중...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="progress-bar-wrapper">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
