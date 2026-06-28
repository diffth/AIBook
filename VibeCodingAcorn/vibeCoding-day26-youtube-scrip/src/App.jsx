import React, { useState } from 'react';
import { AlertTriangle, Play } from 'lucide-react';
import InputSection from './components/InputSection';
import TitleSelector from './components/TitleSelector';
import ScriptViewer from './components/ScriptViewer';

export default function App() {
  const [step, setStep] = useState(1); // 1: 입력, 2: 제목/시간 선택, 3: 대본 출력
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1단계 분석 데이터 저장 상태
  const [summary, setSummary] = useState('');
  const [titles, setTitles] = useState([]);
  const [originalText, setOriginalText] = useState('');

  // 2단계 기획 데이터 저장 상태
  const [selectedTitle, setSelectedTitle] = useState('');
  
  // 3단계 최종 생성 데이터 저장 상태
  const [generatedScript, setGeneratedScript] = useState('');

  // 1단계: 원본 자막 분석 및 영상 주제 추천 요청
  const handleAnalyze = async (payload) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSummary(data.summary);
        setTitles(data.titles);
        setOriginalText(data.originalText);
        setStep(2);
      } else {
        setError(data.message || '콘텐츠를 분석하는 데 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      setError('서버 통신에 실패했습니다. 백엔드 서버가 작동 중인지 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 2단계: 선택된 기획안 기반 유튜브 마크다운 대본 집필 요청
  const handleGenerateScript = async ({ title, duration }) => {
    setLoading(true);
    setError('');
    setSelectedTitle(title);

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          summary,
          originalText,
          duration,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedScript(data.script);
        setStep(3);
      } else {
        setError(data.message || '유튜브 대본을 집필하는 데 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      setError('서버와 통신하는 중 에러가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setError('');
  };

  const handleReset = () => {
    setStep(1);
    setSummary('');
    setTitles([]);
    setOriginalText('');
    setSelectedTitle('');
    setGeneratedScript('');
    setError('');
  };

  return (
    <div>
      {/* 앱 상단 헤더 */}
      <header className="app-header">
        <h1 className="gradient-title">
          <Play size={32} style={{ fill: '#ff0000', stroke: '#ff0000' }} /> Tuberscript
        </h1>
        <p className="subtitle">Gemini AI 기반 유튜브 롱폼 영상 대본 생성기</p>
      </header>

      {/* 위저드 진행률 바 */}
      <div className="wizard-steps">
        <div className={`step-item ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
          <div className="step-circle">{step > 1 ? '✓' : '1'}</div>
          <span className="step-label">자료 입력</span>
        </div>
        <div className={`step-item ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
          <div className="step-circle">{step > 2 ? '✓' : '2'}</div>
          <span className="step-label">주제 및 시간 기획</span>
        </div>
        <div className={`step-item ${step === 3 ? 'active' : ''}`}>
          <div className="step-circle">3</div>
          <span className="step-label">대본 집필 완료</span>
        </div>
      </div>

      {/* 글로벌 에러 창 */}
      {error && (
        <div className="error-message">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} /> {error}
          </span>
        </div>
      )}

      {/* 단계별 위젯 스위처 */}
      <main>
        {step === 1 && (
          <InputSection onAnalyze={handleAnalyze} loading={loading} />
        )}

        {step === 2 && (
          <TitleSelector
            summary={summary}
            titles={titles}
            onGenerate={handleGenerateScript}
            onBack={handleBack}
            loading={loading}
          />
        )}

        {step === 3 && (
          <ScriptViewer
            title={selectedTitle}
            script={generatedScript}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}
