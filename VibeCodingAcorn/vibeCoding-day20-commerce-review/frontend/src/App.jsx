import React, { useState, useRef, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Chart.js 필수 컴포넌트 등록
ChartJS.register(ArcElement, Tooltip, Legend);

// 초간단 마크다운 파서 헬퍼
const parseMarkdown = (text) => {
  if (!text) return '';
  let lines = text.split('\n');
  let inList = false;
  let htmlResult = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // 빈 줄 처리
    if (!line) {
      if (inList) {
        htmlResult.push('</ul>');
        inList = false;
      }
      continue;
    }

    // 제목 처리 (### 또는 ## 또는 #)
    if (line.startsWith('### ')) {
      if (inList) { htmlResult.push('</ul>'); inList = false; }
      htmlResult.push(`<h3>${line.substring(4)}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { htmlResult.push('</ul>'); inList = false; }
      htmlResult.push(`<h2>${line.substring(3)}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) { htmlResult.push('</ul>'); inList = false; }
      htmlResult.push(`<h1>${line.substring(2)}</h1>`);
      continue;
    }

    // 글머리 기호 리스트 처리 (- 또는 *)
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        htmlResult.push('<ul>');
        inList = true;
      }
      let content = line.substring(2);
      // 인라인 강조 처리 (**text**)
      content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      htmlResult.push(`<li>${content}</li>`);
      continue;
    }

    // 일반 문단 처리
    if (inList) {
      htmlResult.push('</ul>');
      inList = false;
    }
    // 인라인 강조 처리
    let parsedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    htmlResult.push(`<p>${parsedLine}</p>`);
  }

  if (inList) {
    htmlResult.push('</ul>');
  }

  return htmlResult.join('');
};

function App() {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: '안녕하세요! 🛍️ 분석하고 싶은 쿠팡 상품의 이름이나 상세 페이지 링크를 입력해 주세요.\n\n예: "몽쉘 생크림케이크 오리지널" 또는 쿠팡 상품 주소\n\n제가 최신 30개 리뷰를 긁어모아 감정 분석과 종합 만족도 요약 보고서를 작성해 드릴게요!',
      type: 'text'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // 자동 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 분석 전송 핸들러
  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userText = inputValue;
    setInputValue('');
    
    // 1. 사용자 메시지 추가
    setMessages((prev) => [...prev, { sender: 'user', text: userText, type: 'text' }]);
    setLoading(true);

    // 2. 봇의 대기 중 메시지 추가
    const botLoadingId = Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: botLoadingId,
        sender: 'bot',
        text: '쿠팡에서 상품 리뷰 30개를 수집하고 분석하는 중입니다. 잠시만 기다려 주세요... 📡🕵️',
        type: 'loading'
      }
    ]);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userText })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '리뷰 분석에 실패했습니다.');
      }

      const data = await response.json();

      // 3. 로딩 메시지를 분석 결과 카드 메시지로 교체
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== botLoadingId).concat({
          sender: 'bot',
          type: 'analysis',
          data: data
        })
      );
    } catch (err) {
      console.error(err);
      // 에러 시 로딩 메시지 제거 후 에러 메시지 출력
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== botLoadingId).concat({
          sender: 'bot',
          text: `❌ 오류가 발생했습니다.\n\n${err.message || '쿠팡 접근 지연이거나 일시적인 장애 상태입니다. 다시 시도해 주세요.'}`,
          type: 'text'
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-section">
          <span className="logo-emoji">💬</span>
          <h1>쿠팡 AI 리뷰 분석 챗봇</h1>
        </div>
        <p className="subtitle">쿠팡 상품 링크나 이름을 입력하면 최신 리뷰 30개를 요약 및 감정 분석해 드립니다.</p>
      </header>

      <main className="chat-window glass">
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}>
              {msg.sender === 'bot' && <span className="bot-avatar">🤖</span>}
              <div className="message-bubble-wrapper">
                {msg.type === 'text' && (
                  <div className="message-bubble text-bubble">
                    <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>
                  </div>
                )}

                {msg.type === 'loading' && (
                  <div className="message-bubble text-bubble loading-bubble">
                    <span className="loading-dots"></span>
                    <p>{msg.text}</p>
                  </div>
                )}

                {msg.type === 'analysis' && msg.data && (
                  <AnalysisResultCard data={msg.data} />
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>

        <div className="chat-input-bar">
          <input
            type="text"
            placeholder="상품명 또는 상품 상세페이지 링크를 입력하세요..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button className="send-btn" onClick={handleSend} disabled={loading || !inputValue.trim()}>
            {loading ? <span className="input-spinner"></span> : '전송'}
          </button>
        </div>
      </main>

      <footer className="app-footer">
        <p>© 2026 Coupang Sentiment Analyzer Chatbot. Powered by FastAPI, BeautifulSoup & Google Gemini.</p>
      </footer>
    </div>
  );
}

// ----------------------------------------------------
// [Sub-Component] 분석 결과 카드 컴포넌트
// ----------------------------------------------------
function AnalysisResultCard({ data }) {
  const { productName, reviews, sentimentResults, summaryReport } = data;
  const [showRawReviews, setShowRawReviews] = useState(false);

  // 긍정, 부정, 중립 개수 카운팅
  const sentimentCounts = sentimentResults.reduce(
    (acc, cur) => {
      acc[cur.sentiment] = (acc[cur.sentiment] || 0) + 1;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 }
  );

  const total = sentimentResults.length;
  const avgRating = (reviews.reduce((acc, cur) => acc + cur.rating, 0) / reviews.length).toFixed(1);

  // Chart.js 데이터 설정
  const chartData = {
    labels: ['긍정 (Positive)', '중립 (Neutral)', '부정 (Negative)'],
    datasets: [
      {
        data: [sentimentCounts.positive, sentimentCounts.neutral, sentimentCounts.negative],
        backgroundColor: [
          'rgba(16, 185, 129, 0.75)', // Green
          'rgba(245, 158, 11, 0.75)',  // Amber/Yellow
          'rgba(239, 68, 68, 0.75)'    // Red
        ],
        borderColor: [
          '#10b981',
          '#f59e0b',
          '#ef4444'
        ],
        borderWidth: 1.5,
        hoverOffset: 6
      }
    ]
  };

  const chartOptions = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#cbd5e1',
          font: { family: 'Noto Sans KR', size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const count = context.raw || 0;
            const percent = ((count / total) * 100).toFixed(1);
            return ` ${context.label}: ${count}개 (${percent}%)`;
          }
        }
      }
    },
    cutout: '65%',
    responsive: true,
    maintainAspectRatio: false
  };

  return (
    <div className="analysis-card fade-in">
      {/* 1. 상품명 헤더 */}
      <div className="analysis-header">
        <span className="analysis-badge">AI 분석 리포트</span>
        <h3>{productName}</h3>
        <div className="meta-stats">
          <span>⭐ 평균 평점: <strong>{avgRating} / 5.0</strong></span>
          <span>📊 수집 리뷰 수: <strong>{total}개</strong></span>
        </div>
      </div>

      {/* 2. 시각화 & 요약 그리드 */}
      <div className="analysis-grid">
        <div className="chart-box">
          <h4>📊 감정 분포 비율</h4>
          <div className="chart-container">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
          <div className="sentiment-stat-list">
            <div className="stat-item pos">
              <span className="dot"></span>
              <span className="label">긍정</span>
              <span className="value">{sentimentCounts.positive}개 ({((sentimentCounts.positive/total)*100).toFixed(0)}%)</span>
            </div>
            <div className="stat-item neu">
              <span className="dot"></span>
              <span className="label">중립</span>
              <span className="value">{sentimentCounts.neutral}개 ({((sentimentCounts.neutral/total)*100).toFixed(0)}%)</span>
            </div>
            <div className="stat-item neg">
              <span className="dot"></span>
              <span className="label">부정</span>
              <span className="value">{sentimentCounts.negative}개 ({((sentimentCounts.negative/total)*100).toFixed(0)}%)</span>
            </div>
          </div>
        </div>

        <div className="report-box">
          <h4>📝 AI 상품 총평 리포트</h4>
          <div 
            className="markdown-content" 
            dangerouslySetInnerHTML={{ __html: parseMarkdown(summaryReport) }}
          />
        </div>
      </div>

      {/* 3. 상세 리뷰 리스트 접이식 */}
      <div className="raw-reviews-section">
        <button className="toggle-reviews-btn" onClick={() => setShowRawReviews(!showRawReviews)}>
          {showRawReviews ? '▲ 크롤링된 상세 리뷰 목록 접기' : '▼ 크롤링된 상세 리뷰 목록 보기'}
        </button>

        {showRawReviews && (
          <div className="reviews-list-dropdown fade-in">
            {reviews.map((rev, i) => {
              const res = sentimentResults[i] || { sentiment: 'neutral', reason: '분석 중' };
              return (
                <div key={i} className="review-item-card glass-dark">
                  <div className="review-item-header">
                    <span className={`sentiment-indicator ${res.sentiment}`}>
                      {res.sentiment === 'positive' ? '긍정' : res.sentiment === 'negative' ? '부정' : '중립'}
                    </span>
                    <span className="review-stars">{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span>
                    <span className="review-date">{rev.date}</span>
                  </div>
                  {rev.headline && <h5 className="review-headline">"{rev.headline}"</h5>}
                  <p className="review-content">{rev.content}</p>
                  <p className="review-reason">💡 <strong>AI 판정 근거:</strong> {res.reason}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
