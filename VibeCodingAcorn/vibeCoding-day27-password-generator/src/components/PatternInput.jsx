import React, { useState } from 'react';
import { Shield, Sparkles } from 'lucide-react';

const PRESETS = [
  "영화 타이타닉 기반, 최소 12자, 대문자 포함, 특수문자 필수",
  "인생 격언 기반, 최소 15자, Leetspeak 치환, 특수문자 2개",
  "좋아하는 팝송 노래 가사, 대소문자 혼합, 숫자 필수",
  "나만의 좌우명 기반, 12자 이상, 대문자 및 특수기호 필수"
];

export default function PatternInput({ onGenerate, loading }) {
  const [pattern, setPattern] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pattern.trim() || loading) return;
    onGenerate(pattern.trim());
  };

  return (
    <div className="cyber-card">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} className="text-primary" style={{ color: 'var(--primary)' }} /> 
            자연어 패턴 및 보안 옵션 입력
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="예시: 영화 아바타 기반, 최소 12자, 대문자 포함, 특수문자 2개"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            disabled={loading}
            required
            autoFocus
          />
        </div>

        {/* 프리셋 그룹 */}
        <div style={{ marginBottom: '24px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
            💡 추천 프리셋 칩 (클릭하여 즉시 적용):
          </span>
          <div className="preset-container">
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                className="preset-chip"
                onClick={() => !loading && setPattern(preset)}
                disabled={loading}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-cyan"
          disabled={loading || !pattern.trim()}
          style={{ width: '100%', padding: '14px', borderRadius: '8px' }}
        >
          <Sparkles size={16} />
          {loading ? '기억하기 쉬운 보안 비밀번호 설계 중...' : '안전한 AI 비밀번호 3선 생성'}
        </button>
      </form>
    </div>
  );
}
