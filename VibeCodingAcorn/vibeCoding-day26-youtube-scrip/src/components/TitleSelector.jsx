import React, { useState } from 'react';
import { RefreshCw, ArrowLeft, PenTool, Clock } from 'lucide-react';

export default function TitleSelector({ summary, titles, onGenerate, onBack, loading }) {
  const [selectedTitle, setSelectedTitle] = useState(titles[0] || '');
  const [selectedDuration, setSelectedDuration] = useState('10'); // '5' | '10' | '15' (기본 10분)

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTitle) return;
    onGenerate({ title: selectedTitle, duration: selectedDuration });
  };

  return (
    <div className="studio-card">
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)' }}>
        📝 원본 요약 및 영상 기획 설정
      </h3>

      {/* 요약 박스 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-light)',
        borderRadius: '10px',
        padding: '16px 20px',
        marginBottom: '28px'
      }}>
        <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '6px' }}>
          💡 분석 요약
        </strong>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{summary}</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 제목 선택 */}
        <div className="form-group">
          <label className="form-label">🎯 제작할 영상 제목 선택 (추천 제목 3가지)</label>
          <div className="title-card-list">
            {titles.map((title, idx) => (
              <div
                key={idx}
                className={`title-option-card ${selectedTitle === title ? 'selected' : ''}`}
                onClick={() => !loading && setSelectedTitle(title)}
              >
                <div className="radio-dot" />
                <span className="title-text">{title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 대본 재생 분량 선택 */}
        <div className="form-group">
          <label className="form-label">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} /> 대본 재생 분량 설정 (시간 목표)
            </span>
          </label>
          <div className="duration-group">
            {[
              { val: '5', label: '5분 내외', desc: '핵심 요약형 대본 (약 1,200자)' },
              { val: '10', label: '10분 내외', desc: '표준 설명형 대본 (약 2,500자)' },
              { val: '15', label: '15분 내외', desc: '심층 고밀도 대본 (약 3,800자)' }
            ].map((d) => (
              <div
                key={d.val}
                className={`duration-btn ${selectedDuration === d.val ? 'selected' : ''}`}
                onClick={() => !loading && setSelectedDuration(d.val)}
                style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}
              >
                <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>{d.label}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.7 }}>{d.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBack}
            disabled={loading}
            style={{ flexShrink: 0 }}
          >
            <ArrowLeft size={16} /> 이전 단계로
          </button>
          
          <button
            type="submit"
            className="btn btn-red"
            disabled={loading || !selectedTitle}
            style={{ flexGrow: 1 }}
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                선택한 대본으로 AI 초안 집필 중...
              </>
            ) : (
              <>
                <PenTool size={18} />
                유튜브 마크다운 대본 생성 시작
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
