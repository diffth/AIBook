import React, { useState } from 'react';

function App() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('idle'); // idle, processing, success
  const [loadingText, setLoadingText] = useState('');
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // 이메일 수신자 설정 (기본값으로 예시 diffth@nate.com 제공)
  const [emailInput, setEmailInput] = useState('');
  const [recipientEmails, setRecipientEmails] = useState(['diffth@nate.com']);
  const [mailStatus, setMailStatus] = useState('idle'); // idle, sending, success, error
  const [mailError, setMailError] = useState('');

  const [showRawTranscript, setShowRawTranscript] = useState(false);

  // 파일 선택 핸들러
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setErrorMessage('');
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type.startsWith('audio/') || droppedFile.name.endsWith('.mp3') || droppedFile.name.endsWith('.wav')) {
        setFile(droppedFile);
        setErrorMessage('');
      } else {
        setErrorMessage('음성 파일(mp3, wav 등)만 업로드할 수 있습니다.');
      }
    }
  };

  // 회의록 추출 및 요약 분석 요청
  const handleAnalyze = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('audio', file);

    setStep('processing');
    setLoadingText('1단계: 음성 녹음 파일을 전송하는 중입니다... 📡');
    setErrorMessage('');
    setResult(null);

    // 시간차를 두고 로딩 안내 텍스트를 업데이트해 진행 감각을 제공합니다.
    const textTimer1 = setTimeout(() => {
      setLoadingText('2단계: AssemblyAI가 음성을 해독하여 텍스트로 변환하고 있습니다... 🎙️📖');
    }, 3000);

    const textTimer2 = setTimeout(() => {
      setLoadingText('3단계: Gemini가 회의 녹취록을 심층 분석하여 요약 및 할 일을 도출 중입니다... 🧠⚡');
    }, 10000);

    try {
      const response = await fetch('/api/analyze-meeting', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(textTimer1);
      clearTimeout(textTimer2);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '회의록 분석에 실패했습니다.');
      }

      const data = await response.json();
      setResult(data);
      setStep('success');
    } catch (err) {
      clearTimeout(textTimer1);
      clearTimeout(textTimer2);
      console.error(err);
      setErrorMessage(err.message || '네트워크 오류가 발생했습니다.');
      setStep('idle');
    }
  };

  // 이메일 수신자 칩 추가
  const addEmail = (e) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email) return;

    // 간단한 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMailError('올바른 이메일 주소 형식이 아닙니다.');
      return;
    }

    if (recipientEmails.includes(email)) {
      setMailError('이미 추가된 이메일 주소입니다.');
      return;
    }

    setRecipientEmails([...recipientEmails, email]);
    setEmailInput('');
    setMailError('');
  };

  // 이메일 수신자 칩 제거
  const removeEmail = (emailToRemove) => {
    setRecipientEmails(recipientEmails.filter((email) => email !== emailToRemove));
  };

  // 이메일 전송 핸들러
  const handleSendEmail = async () => {
    if (recipientEmails.length === 0 || !result) return;

    setMailStatus('sending');
    setMailError('');

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: recipientEmails,
          analysis: result.analysis,
          transcriptText: result.transcriptText
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '이메일 발송에 실패했습니다.');
      }

      setMailStatus('success');
      // 3초 뒤 메일 발송 성공 문구 초기화
      setTimeout(() => setMailStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setMailError(err.message || '이메일 발송 중 오류가 발생했습니다.');
      setMailStatus('error');
    }
  };

  // 다시 시도
  const handleReset = () => {
    setFile(null);
    setResult(null);
    setStep('idle');
    setErrorMessage('');
    setMailStatus('idle');
    setMailError('');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-section">
          <span className="logo-emoji">📝</span>
          <h1>AI 회의록 요약 & 공유 비서</h1>
        </div>
        <p className="subtitle">회의 음성을 업로드하여 최신 AI로 받아쓰고 핵심 요약과 할 일(Action Items)을 메일로 즉시 공유하세요.</p>
      </header>

      <main className="app-content">
        {errorMessage && (
          <div className="error-alert">
            <span className="error-icon">⚠️</span>
            <p className="error-message">{errorMessage}</p>
            <button className="error-close" onClick={() => setErrorMessage('')}>&times;</button>
          </div>
        )}

        {/* 1단계: 업로드 & 실행 전 */}
        {step === 'idle' && (
          <div className="card glass upload-card">
            <h2>🎙️ 회의 음성 업로드</h2>
            <p className="card-desc">업로드한 음성을 AssemblyAI와 Gemini가 해독하고 구조화된 요약본으로 만들어 줍니다. (mp3, wav 지원)</p>
            
            <div 
              className="dropzone"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="audio-upload"
                accept="audio/*,.mp3,.wav"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="audio-upload" className="dropzone-label">
                <span className="upload-icon">📤</span>
                {file ? (
                  <div className="file-info fade-in">
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">({(file.size / (1024 * 1024)).toFixed(2)} MB)</p>
                  </div>
                ) : (
                  <div>
                    <p className="drop-text">음성 파일을 이곳에 드래그하거나 클릭하여 선택하세요.</p>
                    <p className="drop-sub">최대 파일 제한: 50MB</p>
                  </div>
                )}
              </label>
            </div>

            <button
              className="primary-btn start-btn"
              disabled={!file}
              onClick={handleAnalyze}
            >
              회의록 요약 및 할 일 생성하기
            </button>
          </div>
        )}

        {/* 2단계: 백엔드 처리 중 */}
        {step === 'processing' && (
          <div className="card glass processing-card fade-in">
            <div className="processing-animation">
              <div className="pulse-bar-container">
                <div className="pulse-bar"></div>
                <div className="pulse-bar delay-1"></div>
                <div className="pulse-bar delay-2"></div>
              </div>
              <h3>AI 비서가 회의 내용을 분석하고 있습니다...</h3>
              <p className="loading-state-text">{loadingText}</p>
              <p className="wait-sub">음성 녹음 길이에 따라 완료까지 최대 1분 내외가 소요될 수 있습니다.</p>
            </div>
          </div>
        )}

        {/* 3단계: 분석 완료 화면 */}
        {step === 'success' && result && (
          <div className="result-layout fade-in">
            
            {/* 왼쪽: AI 요약 정보 대시보드 */}
            <div className="result-main-panel">
              <div className="card glass summary-card">
                <div className="card-header">
                  <span className="badge">AI 회의 요약</span>
                  <h2>🔊 {result.analysis.title}</h2>
                </div>

                <div className="summary-body">
                  <h3>📝 핵심 요약</h3>
                  <p className="summary-paragraph">"{result.analysis.summary}"</p>
                  
                  <div className="decisions-section">
                    <h3>💡 주요 결정사항</h3>
                    <ul>
                      {result.analysis.keyDecisions.map((dec, i) => (
                        <li key={i}>📌 {dec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 할 일 목록 (Action Items) 카드 */}
              <div className="card glass action-items-card">
                <h2>📅 할 일 목록 (Action Items)</h2>
                <p className="card-desc">이번 회의를 통해 도출된 구성원들의 할 일입니다.</p>

                <div className="table-responsive">
                  <table className="action-table">
                    <thead>
                      <tr>
                        <th>할 일</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>담당자</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>기한</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.analysis.actionItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="task-cell">
                            <label className="checkbox-container">
                              <input type="checkbox" />
                              <span className="checkmark"></span>
                              <span className="task-text">{item.task}</span>
                            </label>
                          </td>
                          <td className="assignee-cell">{item.assignee}</td>
                          <td className="due-cell">{item.dueDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 녹취록 원문 보기 */}
              <div className="raw-transcript-section">
                <button 
                  className="toggle-transcript-btn"
                  onClick={() => setShowRawTranscript(!showRawTranscript)}
                >
                  {showRawTranscript ? '▲ 전체 회의 녹취 원문 접기' : '▼ 전체 회의 녹취 원문 보기'}
                </button>
                {showRawTranscript && (
                  <div className="raw-transcript-box glass-dark fade-in">
                    <p>{result.transcriptText}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 오른쪽: 이메일 전송 패널 */}
            <div className="result-side-panel">
              <div className="card glass email-card">
                <h2>📧 회의록 공유 메일링</h2>
                <p className="card-desc">요약 보고서와 할 일 목록을 팀원들에게 한 번에 발송합니다.</p>

                <form onSubmit={addEmail} className="email-input-group">
                  <input
                    type="email"
                    placeholder="공유할 이메일 주소 입력..."
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                  <button type="submit" className="primary-btn add-btn">+</button>
                </form>

                {mailError && <p className="field-error">{mailError}</p>}

                <div className="recipient-list">
                  <label>수신처 목록 ({recipientEmails.length}개)</label>
                  {recipientEmails.length === 0 ? (
                    <p className="no-recipients">추가된 이메일 주소가 없습니다.</p>
                  ) : (
                    <div className="email-chips">
                      {recipientEmails.map((email) => (
                        <span key={email} className="email-chip fade-in">
                          {email}
                          <button type="button" onClick={() => removeEmail(email)}>&times;</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="email-actions">
                  <button 
                    className="primary-btn send-mail-btn"
                    onClick={handleSendEmail}
                    disabled={recipientEmails.length === 0 || mailStatus === 'sending'}
                  >
                    {mailStatus === 'sending' ? (
                      <span className="spinner-container">
                        <span className="spinner"></span> 발송 중...
                      </span>
                    ) : '이메일 일괄 전송'}
                  </button>

                  <button className="secondary-btn reset-btn" onClick={handleReset}>
                    처음으로 돌아가기
                  </button>
                </div>

                {/* 메일 발송 결과 알림 메시지 */}
                {mailStatus === 'success' && (
                  <div className="mail-alert success fade-in">
                    <span>✅ 회의록 이메일 발송이 성공했습니다!</span>
                  </div>
                )}
                {mailStatus === 'error' && (
                  <div className="mail-alert error fade-in">
                    <span>❌ 전송 실패: {mailError}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>© 2026 Meeting Summarizer. Powered by AssemblyAI, Google Gemini & Nodemailer.</p>
      </footer>
    </div>
  );
}

export default App;
