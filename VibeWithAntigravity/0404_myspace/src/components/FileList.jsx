import React from 'react';
import { FileText, Film, Image, File, Download, Play, Edit2, Trash2 } from 'lucide-react';
import { formatBytes } from './FileGrid';

export default function FileList({ files, user, onPreview, onDownload, onEdit, onDelete }) {
  
  const getFileIcon = (file) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isPdf = file.type === 'application/pdf';
    const isText = file.type.startsWith('text/') || file.name.endsWith('.txt');

    if (isImage) return <Image size={18} className="table-icon" style={{ color: '#ec4899' }} />;
    if (isVideo) return <Film size={18} className="table-icon" style={{ color: '#06b6d4' }} />;
    if (isPdf || isText) return <FileText size={18} className="table-icon" style={{ color: '#f59e0b' }} />;
    return <File size={18} className="table-icon" style={{ color: 'var(--text-secondary)' }} />;
  };

  return (
    <div className="file-list-wrapper card-glass animate-fade">
      <table className="file-table">
        <thead>
          <tr>
            <th>이름</th>
            <th>크기</th>
            <th>업로드 날짜</th>
            <th style={{ textAlign: 'right' }}>작업</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const isPreviewable = 
              file.type.startsWith('image/') || 
              file.type.startsWith('video/') || 
              file.type === 'application/pdf' || 
              file.type.startsWith('text/') || 
              file.name.endsWith('.txt');

            return (
              <tr key={file.id} onDoubleClick={() => onPreview(file)}>
                <td>
                  <div className="table-file-name" onClick={() => onPreview(file)}>
                    {getFileIcon(file)}
                    <span title={file.name}>{file.name}</span>
                  </div>
                </td>
                <td onClick={() => onPreview(file)}>{formatBytes(file.size)}</td>
                <td onClick={() => onPreview(file)}>
                  {file.createdAt ? new Date(file.createdAt.seconds * 1000).toLocaleDateString() : ''}
                </td>
                <td>
                  <div className="table-actions">
                    {isPreviewable && (
                      <button 
                        className="btn-icon" 
                        onClick={() => onPreview(file)}
                        title="실행 (미리보기)"
                      >
                        <Play size={15} />
                      </button>
                    )}
                    <button 
                      className="btn-icon" 
                      onClick={() => onDownload(file)}
                      title="다운로드"
                    >
                      <Download size={15} />
                    </button>
                    {user && (
                      <>
                        <button 
                          className="btn-icon" 
                          onClick={() => onEdit(file)}
                          title="이름 수정"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          className="btn-icon" 
                          style={{ color: '#f87171' }}
                          onClick={() => onDelete(file)}
                          title="삭제"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
