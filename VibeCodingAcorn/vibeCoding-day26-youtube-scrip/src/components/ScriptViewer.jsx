import React, { useState } from 'react';
import { Copy, Save, Check, RefreshCw, Sparkles } from 'lucide-react';

export default function ScriptViewer({ title, script, onReset }) {
  const [copied, setCopied] = useState(false);

  // 1. 클립보드 복사 함수
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("클립보드 복사 실패:", err);
    }
  };

  // 2. 다른 이름으로 파일 저장 함수 (showSaveFilePicker 사용)
  const handleSaveFile = async () => {
    const defaultFileName = `${title.replace(/[^a-zA-Z0-9가-힣\s_-]/g, '').trim()}_대본.md`;

    // Chrome 86+ showSaveFilePicker API 지원 시 우선 사용
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultFileName,
          types: [{
            description: 'Markdown Files',
            accept: {
              'text/markdown': ['.md'],
            },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(script);
        await writable.close();
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("파일 저장 실패:", err);
        }
      }
    } else {
      // 대체 수단: Blob 다운로드 링크 방식
      const blob = new Blob([script], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = defaultFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // revokeObjectURL 즉시 정리하지 않고 최소 30초 이상 지연 호출
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 40000);
    }
  };

  return (
    <div className="studio-card" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} className="text-primary" /> AI 집필 유튜브 대본 초안
        </h3>
        
        {/* 상단 툴 버튼 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleCopy}
            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
          >
            {copied ? (
              <>
                <Check size={14} style={{ color: 'var(--accent-green)' }} /> 복사 완료!
              </>
            ) : (
              <>
                <Copy size={14} /> 대본 전체 복사
              </>
            )}
          </button>

          <button 
            type="button" 
            className="btn btn-red" 
            onClick={handleSaveFile}
            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
          >
            <Save size={14} /> .md 파일로 저장
          </button>
        </div>
      </div>

      {/* 대본 출력 영역 */}
      <div className="script-preview-area">
        {script}
      </div>

      {/* 처음으로 돌아가기 버튼 */}
      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={onReset}
          style={{ width: '100%', padding: '14px' }}
        >
          <RefreshCw size={16} /> 신규 영상 대본 만들기 (처음으로)
        </button>
      </div>
    </div>
  );
}
