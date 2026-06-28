import React, { useState } from 'react';
import { FileText, UploadCloud, Link } from 'lucide-react';

// 자체 YouTube SVG 아이콘 (lucide-react 버전 호환 대비)
const YoutubeIcon = ({ size = 16, ...props }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor" 
    {...props}
  >
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.528 3.545 12 3.545 12 3.545s-7.528 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.022 0 12 0 12s0 3.978.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.86.508 9.388.508 9.388.508s7.528 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.978 24 12 24 12s0-3.978-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export default function InputSection({ onAnalyze, loading }) {
  const [activeTab, setActiveTab] = useState('youtube'); // 'youtube' | 'file'
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [fileText, setFileText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // 파일 읽기 헬퍼
  const handleFileRead = (file) => {
    if (!file) return;
    
    if (file.type !== 'text/plain' && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      alert("텍스트 파일(.txt 또는 .md)만 업로드할 수 있습니다.");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileText(e.target.result);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileRead(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileRead(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeTab === 'youtube') {
      if (!youtubeUrl.trim()) return;
      onAnalyze({ youtubeUrl: youtubeUrl.trim() });
    } else {
      if (!fileText.trim()) return;
      onAnalyze({ text: fileText.trim() });
    }
  };

  return (
    <div className="studio-card">
      {/* 탭 버튼 그룹 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'youtube' ? 'btn-red' : 'btn-secondary'}`}
          onClick={() => setActiveTab('youtube')}
          disabled={loading}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          <YoutubeIcon size={16} /> 유튜브 링크 분석
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'file' ? 'btn-red' : 'btn-secondary'}`}
          onClick={() => setActiveTab('file')}
          disabled={loading}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          <FileText size={16} /> 대본 파일 업로드
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {activeTab === 'youtube' ? (
          /* 유튜브 입력 탭 */
          <div className="form-group">
            <label className="form-label">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Link size={16} className="text-secondary" /> YouTube 영상 링크
              </span>
            </label>
            <input
              type="url"
              className="form-input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={loading}
              required
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              * 자막이 내장되거나 활성화된 유튜브 영상의 대본을 자동으로 수집하여 분석합니다.
            </p>
          </div>
        ) : (
          /* 파일 업로드 탭 */
          <div className="form-group">
            <label className="form-label">참조 텍스트 대본 파일 업로드</label>
            <div
              className="dropzone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !loading && document.getElementById('file-input').click()}
              style={{
                borderColor: isDragOver ? 'var(--primary)' : 'rgba(255, 255, 255, 0.15)',
                backgroundColor: isDragOver ? 'rgba(255, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.01)',
                opacity: loading ? 0.6 : 1
              }}
            >
              <UploadCloud size={36} className="text-secondary" style={{ color: isDragOver ? 'var(--primary)' : 'var(--text-muted)' }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
                  {fileName ? `선택된 파일: ${fileName}` : '여기에 파일 드래그 앤 드롭 또는 클릭하여 업로드'}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  * txt, md 포맷의 한글/영어 텍스트 대본을 지원합니다.
                </p>
              </div>
              <input
                id="file-input"
                type="file"
                accept=".txt,.md"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>
          </div>
        )}

        <div style={{ textAlign: 'right' }}>
          <button
            type="submit"
            className="btn btn-red"
            disabled={loading || (activeTab === 'youtube' ? !youtubeUrl.trim() : !fileText.trim())}
            style={{ width: '100%', padding: '14px' }}
          >
            {loading ? '영상을 가져와서 분석 중...' : '콘텐츠 분석 및 제목 추천'}
          </button>
        </div>
      </form>
    </div>
  );
}
