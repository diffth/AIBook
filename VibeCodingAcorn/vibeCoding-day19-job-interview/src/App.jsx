import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [step, setStep] = useState('setup'); // setup, question, evaluating, result
  const [topic, setTopic] = useState('프론트엔드 개발자');
  const [customTopic, setCustomTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [diffValue, setDiffValue] = useState(2); // 1 = 하, 2 = 중, 3 = 상

  const getDifficultyLabel = (val) => {
    if (val === 1) return '하';
    if (val === 3) return '상';
    return '중';
  };

  // Web Speech API 관련 설정
  const recognitionRef = useRef(null);

  // 미리 정의된 추천 직무 리스트
  const recommendedTopics = [
    '프론트엔드 개발자',
    '백엔드 개발자',
    '서비스 기획자 / PM',
    'UI/UX 디자이너',
    '마케터',
    '데이터 분석가',
    '인사/HR 담당자',
    '기술 영업'
  ];

  useEffect(() => {
    // SpeechRecognition 초기 설정
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ko-KR';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // 완성된 텍스트와 임시 텍스트를 결합하여 답변 상태에 실시간 업데이트
        if (finalTranscript) {
          setAnswer((prev) => prev + ' ' + finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 사용을 허용해 주세요.');
        } else {
          setError(`음성 인식 오류가 발생했습니다: ${event.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // 음성 인식 시작/종료 토글
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setError('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 혹은 Safari 브라우저를 사용하시거나 직접 텍스트로 입력해 주세요.');
      return;
    }

    setError('');
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error(err);
        setError('음성 인식을 시작하는 데 실패했습니다.');
      }
    }
  };

  // 면접 시작 (질문 생성 요청)
  const startInterview = async () => {
    const selectedTopic = topic === 'custom' ? customTopic : topic;
    if (!selectedTopic.trim()) {
      setError('면접 주제나 직무를 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    setAnswer('');
    try {
      const response = await fetch('/api/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic: selectedTopic,
          difficulty: getDifficultyLabel(diffValue)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '질문 생성에 실패했습니다.');
      }

      const data = await response.json();
      setQuestion(data.question);
      setStep('question');
    } catch (err) {
      setError(err.message || '네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 답변 제출 및 평가
  const submitAnswer = async () => {
    if (!answer.trim()) {
      setError('답변을 입력하거나 음성으로 말씀해 주세요.');
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    setStep('evaluating');
    setError('');
    const selectedTopic = topic === 'custom' ? customTopic : topic;

    try {
      const response = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic,
          question,
          answer
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '답변 평가에 실패했습니다.');
      }

      const data = await response.json();
      setEvaluation(data);
      setStep('result');
    } catch (err) {
      setError(err.message || '평가 중 오류가 발생했습니다.');
      setStep('question'); // 다시 질문 화면으로 롤백
    }
  };

  // 처음으로 돌아가기
  const resetInterview = () => {
    setQuestion('');
    setAnswer('');
    setEvaluation(null);
    setError('');
    setStep('setup');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-section">
          <span className="logo-emoji">🎙️</span>
          <h1>AI 면접 시뮬레이터</h1>
        </div>
        <p className="subtitle">AI 면접관의 날카로운 질문에 답하고, 즉시 논리성 및 표현력 피드백을 받아보세요.</p>
      </header>

      <main className="app-content">
        {error && (
          <div className="error-alert">
            <span className="error-icon">⚠️</span>
            <p className="error-message">{error}</p>
            <button className="error-close" onClick={() => setError('')}>&times;</button>
          </div>
        )}

        {/* 1단계: 세팅 화면 */}
        {step === 'setup' && (
          <div className="card glass setup-card">
            <h2>🎯 면접 분야 설정</h2>
            <p className="card-desc">연습하고 싶은 직무나 면접 주제를 선택하세요. 구체적인 직무일수록 더 알맞은 질문이 생성됩니다.</p>
            
            <div className="topic-grid">
              {recommendedTopics.map((t) => (
                <button
                  key={t}
                  className={`topic-btn ${topic === t ? 'active' : ''}`}
                  onClick={() => {
                    setTopic(t);
                    setError('');
                  }}
                >
                  {t}
                </button>
              ))}
              <button
                className={`topic-btn ${topic === 'custom' ? 'active' : ''}`}
                onClick={() => {
                  setTopic('custom');
                  setError('');
                }}
              >
                ✏️ 직접 입력
              </button>
            </div>

            {topic === 'custom' && (
              <div className="custom-input-group fade-in">
                <label htmlFor="custom-topic-input">원하는 직무 또는 분야를 상세히 써주세요</label>
                <input
                  id="custom-topic-input"
                  type="text"
                  placeholder="예: 3년차 파이썬 백엔드 개발자, 신입 UI 디자이너"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                />
              </div>
            )}

            <div className="difficulty-section">
              <div className="difficulty-header">
                <span className="diff-label">⚙️ 질문 난이도 설정</span>
                <span className={`diff-badge diff-${getDifficultyLabel(diffValue)}`}>
                  난이도: {getDifficultyLabel(diffValue)}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="1"
                value={diffValue}
                onChange={(e) => setDiffValue(parseInt(e.target.value))}
                className="difficulty-slider"
              />
              <div className="difficulty-ticks">
                <span onClick={() => setDiffValue(1)} className={`tick-btn ${diffValue === 1 ? 'active' : ''}`}>하 (초급)</span>
                <span onClick={() => setDiffValue(2)} className={`tick-btn ${diffValue === 2 ? 'active' : ''}`}>중 (실무)</span>
                <span onClick={() => setDiffValue(3)} className={`tick-btn ${diffValue === 3 ? 'active' : ''}`}>상 (고급)</span>
              </div>
            </div>

            <button 
              className="primary-btn start-btn" 
              onClick={startInterview}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="spinner-container">
                  <span className="spinner"></span> 면접관 매칭 중...
                </span>
              ) : '면접관 입장 및 시작'}
            </button>
          </div>
        )}

        {/* 2단계: 질문 및 답변 단계 */}
        {step === 'question' && (
          <div className="card glass question-card fade-in">
            <div className="question-header">
              <span className="badge">AI 면접관의 질문</span>
              <span className={`diff-badge-sm diff-${getDifficultyLabel(diffValue)}`}>난이도: {getDifficultyLabel(diffValue)}</span>
              <span className="topic-badge">{topic === 'custom' ? customTopic : topic}</span>
            </div>
            
            <div className="question-box">
              <p>"{question}"</p>
            </div>

            <div className="answer-section">
              <label htmlFor="answer-textarea">나의 답변</label>
              <textarea
                id="answer-textarea"
                rows="6"
                placeholder="마이크 버튼을 눌러 말하거나, 여기에 직접 답변을 입력해 주세요..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              ></textarea>

              <div className="audio-control-bar">
                <button 
                  className={`mic-btn ${isRecording ? 'recording' : ''}`} 
                  onClick={toggleRecording}
                  title={isRecording ? '녹음 중지' : '음성 답변 시작'}
                >
                  <span className="mic-icon">{isRecording ? '🛑' : '🎤'}</span>
                  <span className="mic-text">
                    {isRecording ? '말씀을 다 하셨으면 정지버튼을 누르세요' : '마이크로 답변하기'}
                  </span>
                  {isRecording && <span className="pulse-ring"></span>}
                </button>

                <div className="btn-group-right">
                  <button className="secondary-btn" onClick={resetInterview}>
                    처음으로
                  </button>
                  <button 
                    className="primary-btn submit-btn" 
                    onClick={submitAnswer}
                    disabled={!answer.trim()}
                  >
                    답변 완료 및 평가받기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3단계: 평가 대기 로딩 화면 */}
        {step === 'evaluating' && (
          <div className="card glass evaluating-card fade-in">
            <div className="loading-animation">
              <div className="brain-loader">
                <span>🧠</span>
                <div className="radar"></div>
              </div>
              <h3>AI 면접관이 답변을 심층 분석하고 있습니다...</h3>
              <p>답변의 논리성과 표현력, 전체적인 구조를 종합 평가 중입니다. 잠시만 기다려 주세요.</p>
            </div>
          </div>
        )}

        {/* 4단계: 결과 화면 */}
        {step === 'result' && evaluation && (
          <div className="card glass result-card fade-in">
            <h2>📊 AI 면접관의 평가 리포트</h2>
            
            <div className="score-summary">
              <div className="score-radial">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path className="circle-bg"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path className="circle"
                    strokeDasharray={`${evaluation.score}, 100`}
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.35" className="percentage">{evaluation.score}점</text>
                </svg>
              </div>
              <div className="score-text-section">
                <h3>
                  {topic === 'custom' ? customTopic : topic} 모의 면접 결과
                  <span className={`diff-badge-sm inline-diff diff-${getDifficultyLabel(diffValue)}`}>{getDifficultyLabel(diffValue)}</span>
                </h3>
                <p className="score-comment">
                  {evaluation.score >= 90 ? '🌟 훌륭하고 명쾌한 답변입니다! 실전에서도 좋은 반응을 얻을 수 있습니다.' : 
                   evaluation.score >= 80 ? '👍 안정적이고 탄탄한 구조를 갖춘 좋은 답변입니다.' : 
                   evaluation.score >= 70 ? '🤔 기본적인 내용은 담겨있으나 일부 표현을 보완하면 더 좋겠습니다.' : 
                   '💡 질문의 요점을 조금 더 파악하고 구체적인 예시를 들어 보완이 필요합니다.'}
                </p>
              </div>
            </div>

            <div className="feedback-details">
              <div className="feedback-section glass-dark">
                <h4>📐 논리성 평가 (Logic & Structure)</h4>
                <p>{evaluation.logicFeedback}</p>
              </div>
              
              <div className="feedback-section glass-dark">
                <h4>✨ 표현력 평가 (Expression & Delivery)</h4>
                <p>{evaluation.expressionFeedback}</p>
              </div>

              <div className="feedback-section glass-dark highlighted">
                <h4>💡 종합 조언 및 보완점 (Overall Suggestion)</h4>
                <p>{evaluation.overallFeedback}</p>
              </div>
            </div>

            <div className="qa-history glass-dark">
              <h5>Q. {question}</h5>
              <p className="user-ans"><strong>A.</strong> {answer}</p>
            </div>

            <div className="result-actions">
              <button className="secondary-btn" onClick={resetInterview}>
                다른 주제 선택하기
              </button>
              <button className="primary-btn" onClick={startInterview}>
                같은 주제로 한 번 더 연습하기
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>© 2026 AI Job Interview Simulator. Powered by Google Gemini 2.5 & Web Speech API.</p>
      </footer>
    </div>
  );
}

export default App;
