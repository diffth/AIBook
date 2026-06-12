import React from 'react';
import { FileText, Film, Image, File, Download, Play, Edit2, Trash2 } from 'lucide-react';

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function FileGrid({ files, user, onPreview, onDownload, onEdit, onDelete }) {
  
  const getFileIcon = (file) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isPdf = file.type === 'application/pdf';
    const isText = file.type.startsWith('text/') || file.name.endsWith('.txt');

    if (isImage) return <Image size={32} style={{ color: '#ec4899' }} />;
    if (isVideo) return <Film size={32} style={{ color: '#06b6d4' }} />;
    if (isPdf || isText) return <FileText size={32} style={{ color: '#f59e0b' }} />;
    return <File size={32} style={{ color: 'var(--text-secondary)' }} />;
  };

  const renderThumbnail = (file) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (isImage) {
      return <img src={file.downloadUrl} alt={file.name} loading="lazy" />;
    }
    if (isVideo) {
      return (
        <video src={file.downloadUrl} muted preload="metadata">
          브라우저가 비디오 태그를 지원하지 않습니다.
        </video>
      );
    }
    return getFileIcon(file);
  };

  return (
    <div className="file-grid">
      {files.map((file) => {
        const isPreviewable = 
          file.type.startsWith('image/') || 
          file.type.startsWith('video/') || 
          file.type === 'application/pdf' || 
          file.type.startsWith('text/') || 
          file.name.endsWith('.txt');

        return (
          <div 
            key={file.id} 
            className="grid-card card-glass animate-fade"
            onDoubleClick={() => onPreview(file)}
          >
            <div className="card-thumbnail" onClick={() => onPreview(file)}>
              {renderThumbnail(file)}
              {file.type.startsWith('video/') && (
                <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                  <Play size={12} fill="white" style={{ color: 'white' }} />
                </div>
              )}
            </div>
            
            <div className="card-info" onClick={() => onPreview(file)}>
              <span className="file-name" title={file.name}>{file.name}</span>
              <div className="file-meta">
                <span>{formatBytes(file.size)}</span>
                <span>{file.createdAt ? new Date(file.createdAt.seconds * 1000).toLocaleDateString() : ''}</span>
              </div>
            </div>

            <div className="card-actions">
              {isPreviewable && (
                <button 
                  className="btn-icon" 
                  onClick={() => onPreview(file)}
                  title="실행 (미리보기)"
                >
                  <Play size={16} />
                </button>
              )}
              <button 
                className="btn-icon" 
                onClick={() => onDownload(file)}
                title="다운로드"
              >
                <Download size={16} />
              </button>
              {user && (
                <>
                  <button 
                    className="btn-icon" 
                    onClick={() => onEdit(file)}
                    title="이름 수정"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    className="btn-icon" 
                    style={{ color: '#f87171' }}
                    onClick={() => onDelete(file)}
                    title="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
