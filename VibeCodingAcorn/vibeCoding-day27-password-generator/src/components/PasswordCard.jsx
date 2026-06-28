import React, { useState } from 'react';
import { Eye, EyeOff, Copy, Check, Save, Key, AlertCircle } from 'lucide-react';

export default function PasswordCard({ passwordItem, index }) {
  const [showPwd, setShowPwd] = useState(false);
  const [copied, setCopied] = useState(false);
  const { pwd, node } = passwordItem;

  // 1. 크래킹 난이도 분석 헬퍼
  const analyzePassword = (p) => {
    let score = 0;
    if (p.length >= 8) score += 1;
    if (p.length >= 12) score += 1;
    if (/[A-Z]/.test(p)) score += 1;
    if (/[a-z]/.test(p)) score += 1;
    if (/[0-9]/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;

    let strength = "보통";
    let time = "약 3일 소요";
    let color = "var(--entropy-medium)";
    let pct = "50%";

    if (score <= 3 || p.length < 8) {
      strength = "취약";
      time = "약 2분 소요 (Brute Force 취약)";
      color = "var(--entropy-weak)";
      pct = "25%";
    } else if (score >= 5 && p.length >= 12) {
      strength = "매우 강력";
      time = "약 28,000년 소요 (안전)";
      color = "var(--entropy-strong)";
      pct = "100%";
    } else if (score >= 4) {
      strength = "안전";
      time = "약 150년 소요 (비교적 안전)";
      color = "var(--entropy-strong)";
      pct = "75%";
    }

    return { strength, time, color, pct };
  };

  const analysis = analyzePassword(pwd);

  // 2. 클립보드 복사
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pwd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("복사 실패:", err);
    }
  };

  // 3. 비밀번호 다른이름으로 저장 (텍스트 파일 내보내기 규칙)
  const handleSave = async () => {
    const defaultFileName = `비밀번호_후보${index + 1}.txt`;
    const fileContent = `[Cryptoguard AI 비밀번호 안전 보관함]

비밀번호 후보군 ${index + 1}
---------------------------------
비밀번호: ${pwd}
생성 조건: ${node}
분석 등급: ${analysis.strength} (크래킹 소요 시간: ${analysis.time})
---------------------------------
* 경고: 본 파일은 비밀번호가 평문으로 적혀 있으므로, 안전한 암호화 하드 드라이브나 물리 포맷 보관함에 격리하여 보관해 주세요.`;

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultFileName,
          types: [{
            description: 'Text Files',
            accept: {
              'text/plain': ['.txt'],
            },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(fileContent);
        await writable.close();
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("파일 저장 실패:", err);
        }
      }
    } else {
      // 대체 Blob 다운로드 방식
      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = defaultFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // revokeObjectURL 즉시 해제 금지 규칙 (최소 30초 이상 지연)
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 40000);
    }
  };

  return (
    <div className="pwd-card fade-in">
      {/* 카드 상단 헤더 */}
      <div className="pwd-header">
        <span className="pwd-badge">
          <Key size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          후보 #{index + 1}
        </span>
        <span style={{ fontSize: '0.8rem', color: analysis.color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
          보안 지표: {analysis.strength}
        </span>
      </div>

      {/* 비밀번호 표시 박스 */}
      <div className="pwd-display-wrapper">
        <div className={`pwd-text ${!showPwd ? 'masked' : ''}`}>
          {showPwd ? pwd : '••••••••••••••••'}
        </div>
        
        {/* 컨트롤 버튼들 */}
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button
            type="button"
            className="icon-btn"
            title={showPwd ? "가리기" : "보기"}
            onClick={() => setShowPwd(!showPwd)}
          >
            {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          
          <button
            type="button"
            className="icon-btn"
            title="복사"
            onClick={handleCopy}
          >
            {copied ? <Check size={18} style={{ color: 'var(--entropy-strong)' }} /> : <Copy size={18} />}
          </button>

          <button
            type="button"
            className="icon-btn"
            title="메모장 저장"
            onClick={handleSave}
          >
            <Save size={18} />
          </button>
        </div>
      </div>

      {/* 엔트로피 게이지 바 */}
      <div className="entropy-meter">
        <span style={{ color: 'var(--text-muted)' }}>크랙 소요:</span>
        <div className="entropy-bar">
          <div
            className="entropy-fill"
            style={{
              width: analysis.pct,
              backgroundColor: analysis.color
            }}
          />
        </div>
        <span style={{ color: '#fff', fontSize: '0.8rem' }}>{analysis.time}</span>
      </div>

      {/* 기억 힌트 안내 영역 */}
      <div className="hint-box">
        <div className="hint-label">🧠 기억 가이드 (Note)</div>
        <div className="hint-text">{node}</div>
      </div>
    </div>
  );
}
