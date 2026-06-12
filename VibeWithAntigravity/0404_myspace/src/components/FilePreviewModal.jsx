import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Film, Image, File } from 'lucide-react';

export default function FilePreviewModal({ isOpen, onClose, file }) {
  const [textContent, setTextContent] = useState('');
  const [loadingText, setLoadingText] = useState(false);

  useEffect(() => {
    if (isOpen && file && (file.type.startsWith('text/') || file.name.endsWith('.txt'))) {
      setLoadingText(true);
      setTextContent('');
      fetch(file.downloadUrl)
        .then(res => {
          if (!res.ok) throw new Error('텍스트를 불러오지 못했습니다.');
          return res.text();
        })
        .then(data => {
          setTextContent(data);
          setLoadingText(false);
        })
        .catch(err => {
          console.error(err);
          setTextContent('파일 내용을 불러오는 중에 오류가 발생했습니다.');
          setLoadingText(false);
        });
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isPdf = file.type === 'application/pdf';
  const isText = file.type.startsWith('text/') || file.name.endsWith('.txt');

  const renderPreview = () => {
    if (isImage) {
      return (
        <img 
          src={file.downloadUrl} 
          alt={file.name} 
          className="preview-image" 
        />
      );
    }
    
    if (isVideo) {
      return (
        <video 
          src={file.downloadUrl} 
          controls 
          autoPlay 
          className="preview-video"
        />
      );
    }
    
    if (isPdf) {
      return (
        <iframe 
          src={`${file.downloadUrl}#toolbar=0`} 
          title={file.name} 
          className="preview-pdf"
        />
      );
    }
    
    if (isText) {
      if (loadingText) {
        return <div style={{ color: 'var(--text-secondary)' }}>텍스트 읽어오는 중...</div>;
      }
      return <pre className="preview-text">{textContent}</pre>;
    }

    return (
      <div className="preview-unsupported">
        <File size={64} className="thumbnail-icon" />
        <p style={{ fontSize: '15px', fontWeight: 500 }}>
          이 파일 형식은 브라우저 미리보기를 지원하지 않습니다.
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          다운로드하여 파일을 실행해 주세요.
        </p>
        <a 
          href={file.downloadUrl} 
          download={file.name} 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn-primary" 
          style={{ textDecoration: 'none', display: 'inline-flex', padding: '10px 20px', fontSize: '14px', borderRadius: 'var(--radius-md)' }}
        >
          <Download size={16} /> 파일 다운로드
        </a>
      </div>
    );
  };

  const getFileIcon = () => {
    if (isImage) return <Image size={20} className="table-icon" style={{ color: '#ec4899' }} />;
    if (isVideo) return <Film size={20} className="table-icon" style={{ color: '#06b6d4' }} />;
    if (isPdf || isText) return <FileText size={20} className="table-icon" style={{ color: '#f59e0b' }} />;
    return <File size={20} className="table-icon" style={{ color: 'var(--text-secondary)' }} />;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content preview-modal-content card-glass animate-scale" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignPage: 'center', gap: '8px', overflow: 'hidden' }}>
            {getFileIcon()}
            <h2 className="file-name" style={{ fontSize: '16px', maxWidth: '400px' }} title={file.name}>
              {file.name}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {(isImage || isVideo || isPdf || isText) && (
              <a 
                href={file.downloadUrl} 
                download={file.name}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-icon" 
                title="다운로드"
                style={{ color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
              >
                <Download size={18} />
              </a>
            )}
            <button className="close-btn" onClick={onClose} title="닫기">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="preview-body">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}
