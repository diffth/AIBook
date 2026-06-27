import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [keyword, setKeyword] = useState('');
  const [tone, setTone] = useState('friendly');
  const [length, setLength] = useState('medium');
  
  // UI 단계 상태: 'input' | 'loading' | 'result'
  const [uiState, setUiState] = useState('input');
  
  // 로딩 단계 진행 상태
  const [progress, setProgress] = useState(0);
  const [loadingTitle, setLoadingTitle] = useState('키워드 맥락 분석 중...');
  const [loadingDesc, setLoadingDesc] = useState('제공해 주신 키워드의 핵심 인사이트를 분석하고 있습니다.');
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);

  // 생성 데이터 결과
  const [blogData, setBlogData] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const progressIntervalRef = useRef(null);

  // 로딩바 애니메이션 시뮬레이션
  const startLoadingSimulation = () => {
    setProgress(0);
    setActiveStep(1);
    setCompletedSteps([]);
    setLoadingTitle('키워드 맥락 분석 중...');
    
    const steps = [
      { pct: 25, title: '키워드 맥락 분석 중...', desc: '제공해 주신 키워드의 핵심 인사이트와 연관도를 정제하고 있습니다.', stepNum: 1 },
      { pct: 60, title: 'AI 3단 본문 집필 중...', desc: 'Gemini가 설정된 분위기에 맞춰 서론-본론-결론 스크립트를 작성하고 있습니다.', stepNum: 2 },
      { pct: 85, title: 'Unsplash 이미지 매칭 중...', desc: '글에 어울리는 최적의 고화질 이미지 검색 및 작가 저작권 링크를 빌드하고 있습니다.', stepNum: 3 },
      { pct: 95, title: '블로그 발행 요약 중...', desc: '최종 렌더링 템플릿과 내보내기 파일을 컴파일하고 있습니다.', stepNum: 4 }
    ];

    let currentPct = 0;
    progressIntervalRef.current = setInterval(() => {
      if (currentPct < 95) {
        currentPct++;
        setProgress(currentPct);

        const currentStep = steps.find(s => currentPct <= s.pct) || steps[steps.length - 1];
        setLoadingTitle(currentStep.title);
        setLoadingDesc(currentStep.desc);
        setActiveStep(currentStep.stepNum);

        // 이전 단계들을 완료 처리
        const completed = steps
          .filter(s => currentPct > s.pct)
          .map(s => s.stepNum);
        setCompletedSteps(completed);
      }
    }, 150);
  };

  const stopLoadingSimulation = (targetPct) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgress(targetPct);
    if (targetPct === 100) {
      setCompletedSteps([1, 2, 3, 4]);
      setActiveStep(4);
    }
  };

  // 컴포넌트 언마운트 시 인터벌 정리
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // ── 블로그 생성 핸들러 ──────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!keyword.trim()) {
      alert('주제 키워드를 입력해 주세요.');
      return;
    }

    setUiState('loading');
    startLoadingSimulation();

    try {
      // 1. 블로그 콘텐츠 API 호출
      const generateRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, tone, length })
      });

      if (!generateRes.ok) {
        const errData = await generateRes.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || '블로그 생성에 실패했습니다.');
      }

      const generateData = await generateRes.json();
      const blogContent = generateData.data;

      // 2. Unsplash 이미지 매칭 API 호출
      const imagesRes = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword })
      });

      const imagesData = await imagesRes.json().catch(() => ({ success: false, images: [] }));
      const fetchedImages = imagesData.success ? imagesData.images : [];

      // 시뮬레이션 끝마치기
      stopLoadingSimulation(100);

      setTimeout(() => {
        setBlogData(blogContent);
        setImages(fetchedImages);
        if (fetchedImages.length > 0) {
          setSelectedImage(fetchedImages[0]);
        } else {
          // 기본 폴백 이미지 매핑
          setSelectedImage({
            url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200',
            author: 'Andrew Neel',
            profile: 'https://unsplash.com/@andrewneel'
          });
        }
        setUiState('result');
      }, 500);

    } catch (error) {
      stopLoadingSimulation(0);
      alert(`오류: ${error.message}`);
      setUiState('input');
    }
  };

  // ── 내보내기 1: 클립보드 전체 복사 ──────────────────────────────────
  const handleCopyText = () => {
    if (!blogData) return;
    
    const textToCopy = `
[제목]
${blogData.title}

[요약]
${blogData.summary}

[서론]
${blogData.introduction}

[본론]
${blogData.body}

[결론]
${blogData.conclusion}

[해시태그]
${blogData.tags ? blogData.tags.map(t => `#${t.replace(/#/g, '')}`).join(', ') : ''}

[썸네일 이미지 프롬프트]
${blogData.imagePrompt || ''}

[커버 이미지]
Unsplash Photo by ${selectedImage ? selectedImage.author : 'AI'} (${selectedImage ? selectedImage.url : ''})
    `.trim();

    navigator.clipboard.writeText(textToCopy)
      .then(() => alert('전체 블로그 콘텐츠가 클립보드에 복사되었습니다! 📋'))
      .catch(err => alert('복사 중 에러가 발생했습니다: ' + err));
  };

  // ── 내보내기 2: 크롬 완벽 호환 Markdown 저장 ──────────────────────────
  const handleDownloadMarkdown = async () => {
    if (!blogData) return;

    const mdContent = `
# ${blogData.title}

> ${blogData.summary}

![Blog Cover](${selectedImage ? selectedImage.url : ''})
*Photo by [${selectedImage ? selectedImage.author : 'Author'}](${selectedImage ? selectedImage.profile : '#'}) on Unsplash*

---

### 들어가는 글
${blogData.introduction}

### 깊이 알아보기
${blogData.body}

### 마치며
${blogData.conclusion}

---
**Thumbnail Prompt:** \`${blogData.imagePrompt || ''}\`

**Tags:** ${blogData.tags ? blogData.tags.map(t => `#${t.replace(/#/g,'')}`).join(' ') : ''}
`.trim();

    const blob = new Blob([mdContent], { type: 'text/markdown; charset=utf-8' });
    const filename = `Blog_${blogData.title.replace(/[^a-zA-Z0-9가-힣]/g, '_').substring(0, 20)}.md`;

    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'Markdown Document', accept: { 'text/markdown': ['.md'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } catch (err) {
        if (err.name !== 'AbortError') fallbackDownload(blob, filename);
      }
    } else {
      fallbackDownload(blob, filename);
    }
  };

  // ── 내보내기 3: 크롬 완벽 호환 HTML 저장 ──────────────────────────────
  const handleDownloadHtml = async () => {
    if (!blogData) return;

    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blogData.title}</title>
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; line-height: 1.8; color: #333; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 2.5rem; font-weight: bold; margin-bottom: 20px; color: #111; }
    .cover-img { width: 100%; max-height: 450px; object-fit: cover; border-radius: 12px; margin-bottom: 20px; }
    .caption { font-size: 0.9rem; color: #666; text-align: center; margin-bottom: 30px; }
    blockquote { border-left: 4px solid #00d2ff; padding: 10px 20px; background: #f0f8ff; margin: 0 0 30px 0; font-size: 1.1rem; color: #555; border-radius: 0 8px 8px 0; }
    h3 { font-size: 1.5rem; margin-top: 40px; border-bottom: 2px solid #eaeaea; padding-bottom: 8px; color: #222; }
    p { margin-bottom: 20px; font-size: 1.05rem; }
    .tags { margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
    .tag { display: inline-block; background: #f0f0f0; padding: 5px 12px; border-radius: 20px; font-size: 0.9rem; color: #555; margin-right: 8px; text-decoration: none; }
    .prompt-box { background: #faf5ff; border: 1px dashed #d8b4fe; padding: 15px; border-radius: 8px; margin-bottom: 30px; font-size: 0.95rem; }
  </style>
</head>
<body>
  <h1>${blogData.title}</h1>
  <img class="cover-img" src="${selectedImage ? selectedImage.url : ''}" alt="Cover Image">
  <div class="caption">Photo by <a href="${selectedImage ? selectedImage.profile : '#'}">${selectedImage ? selectedImage.author : 'Author'}</a> on Unsplash</div>
  
  <blockquote>${blogData.summary}</blockquote>

  <div class="prompt-box">
    <strong>Thumbnail Design Prompt:</strong><br>
    <em>${blogData.imagePrompt || ''}</em>
  </div>

  <h3>들어가는 글</h3>
  <p>${blogData.introduction.replace(/\n/g, '<br>')}</p>

  <h3>깊이 알아보기</h3>
  <p>${blogData.body.replace(/\n/g, '<br>')}</p>

  <h3>마치며</h3>
  <p>${blogData.conclusion.replace(/\n/g, '<br>')}</p>

  <div class="tags">
    ${blogData.tags ? blogData.tags.map(t => `<span class="tag">#${t.replace(/#/g,'')}</span>`).join(' ') : ''}
  </div>
</body>
</html>
`.trim();

    const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
    const filename = `Blog_${blogData.title.replace(/[^a-zA-Z0-9가-힣]/g, '_').substring(0, 20)}.html`;

    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'HTML Page', accept: { 'text/html': ['.html'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } catch (err) {
        if (err.name !== 'AbortError') fallbackDownload(blob, filename);
      }
    } else {
      fallbackDownload(blob, filename);
    }
  };

  // 폴백 파일 다운로드
  const fallbackDownload = (blobObj, name) => {
    const url = URL.createObjectURL(blobObj);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handleRestart = () => {
    setUiState('input');
    setKeyword('');
    setBlogData(null);
    setImages([]);
    setSelectedImage(null);
  };

  return (
    <div className="app-wrapper">
      <div className="glass-bg"></div>
      
      <main className="container">
        {/* 헤더 영역 */}
        <header className="header">
          <div className="logo">
            <i className="fa-solid fa-pen-nib"></i>
            <span>BLOGIFY<span className="highlight">AI</span></span>
          </div>
          <h1>키워드 기반 AI 블로그 콘텐츠 생성기</h1>
          <p className="subtitle">
            주제 키워드만 입력하면 Gemini가 전문 문맥을 집필하고, Unsplash의 고화질 이미지를 즉시 매칭해 줍니다.
          </p>
        </header>

        {/* 1단계: 입력 폼 */}
        {uiState === 'input' && (
          <section className="card control-card">
            <div className="card-header">
              <h2><i className="fa-solid fa-wand-magic-sparkles"></i> 블로그 기획 및 설정</h2>
              <p>어떤 주제에 대해 블로그 포스트를 작성해 볼까요?</p>
            </div>

            <div className="input-group">
              <label htmlFor="keywordInput">주제 키워드 <span className="required">*</span></label>
              <div className="search-box">
                <i className="fa-solid fa-tags input-icon"></i>
                <input
                  type="text"
                  id="keywordInput"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="예: 미니멀 라이프스타일, 생성형 AI 트렌드, 직장인 재테크 팁"
                  required
                />
              </div>
            </div>

            <div className="options-grid">
              <div className="option-field">
                <label>글의 어조 및 분위기</label>
                <div className="segment-control">
                  <button
                    className={`segment-btn ${tone === 'friendly' ? 'active' : ''}`}
                    onClick={() => setTone('friendly')}
                  >
                    <i className="fa-regular fa-face-smile"></i> 친근한 대화체
                  </button>
                  <button
                    className={`segment-btn ${tone === 'professional' ? 'active' : ''}`}
                    onClick={() => setTone('professional')}
                  >
                    <i className="fa-solid fa-briefcase"></i> 전문적인 비즈니스
                  </button>
                  <button
                    className={`segment-btn ${tone === 'creative' ? 'active' : ''}`}
                    onClick={() => setTone('creative')}
                  >
                    <i className="fa-solid fa-lightbulb"></i> 창의적인 스토리
                  </button>
                </div>
              </div>

              <div className="option-field">
                <label>텍스트 분량</label>
                <div className="segment-control">
                  <button
                    className={`segment-btn ${length === 'short' ? 'active' : ''}`}
                    onClick={() => setLength('short')}
                  >
                    짧음 (~400자)
                  </button>
                  <button
                    className={`segment-btn ${length === 'medium' ? 'active' : ''}`}
                    onClick={() => setLength('medium')}
                  >
                    중간 (~800자)
                  </button>
                  <button
                    className={`segment-btn ${length === 'long' ? 'active' : ''}`}
                    onClick={() => setLength('long')}
                  >
                    길게 (~1500자)
                  </button>
                </div>
              </div>
            </div>

            <div className="actions">
              <button className="btn btn-primary" onClick={handleGenerate}>
                <i className="fa-solid fa-paper-plane"></i> AI 블로그 생성 시작
              </button>
            </div>
          </section>
        )}

        {/* 2단계: 로딩 진행 상황 */}
        {uiState === 'loading' && (
          <section className="card loading-card">
            <div className="loader-wrapper">
              <div className="spinner"></div>
            </div>
            <h3>{loadingTitle}</h3>
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="loading-desc">{loadingDesc}</p>
            
            <div className="step-tracker">
              <div className={`step ${activeStep === 1 ? 'active' : ''} ${completedSteps.includes(1) ? 'completed' : ''}`}>
                <div className="step-icon">
                  {completedSteps.includes(1) ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-magnifying-glass"></i>}
                </div>
                <span>1. 키워드 분석</span>
              </div>
              <div className={`step ${activeStep === 2 ? 'active' : ''} ${completedSteps.includes(2) ? 'completed' : ''}`}>
                <div className="step-icon">
                  {completedSteps.includes(2) ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-pen-fancy"></i>}
                </div>
                <span>2. AI 본문 집필</span>
              </div>
              <div className={`step ${activeStep === 3 ? 'active' : ''} ${completedSteps.includes(3) ? 'completed' : ''}`}>
                <div className="step-icon">
                  {completedSteps.includes(3) ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-image"></i>}
                </div>
                <span>3. Unsplash 매칭</span>
              </div>
              <div className={`step ${activeStep === 4 ? 'active' : ''} ${completedSteps.includes(4) ? 'completed' : ''}`}>
                <div className="step-icon">
                  {completedSteps.includes(4) ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-check-double"></i>}
                </div>
                <span>4. 퍼블리싱 검토</span>
              </div>
            </div>
          </section>
        )}

        {/* 3단계: 결과 뷰어 */}
        {uiState === 'result' && blogData && (
          <section className="card result-card">
            {/* 대표 커버 이미지 */}
            <div className="blog-cover" style={{ backgroundImage: `url(${selectedImage ? selectedImage.url : ''})` }}>
              <div className="cover-overlay"></div>
              {selectedImage && (
                <div className="cover-info">
                  Photo by <a href={selectedImage.profile} target="_blank" rel="noopener noreferrer">{selectedImage.author}</a> on <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">Unsplash</a>
                </div>
              )}
            </div>

            {/* 블로그 내용 */}
            <div className="blog-content-wrapper">
              <header className="blog-post-header">
                <h1>{blogData.title}</h1>
                <div className="blog-meta">
                  <span className="meta-item">
                    <i className="fa-regular fa-calendar"></i> 
                    <span>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                  </span>
                  <span className="meta-item"><i class="fa-regular fa-user"></i> Blogify AI</span>
                </div>
                <div className="tag-list">
                  {blogData.tags && blogData.tags.map((tag, idx) => (
                    <span key={idx} className="tag-chip">
                      {tag.startsWith('#') ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              </header>

              {/* 핵심 요약 */}
              <blockquote className="blog-summary">
                {blogData.summary}
              </blockquote>

              {/* 이미지 묘사 프롬프트 */}
              {blogData.imagePrompt && (
                <div className="prompt-box">
                  <h4><i className="fa-solid fa-wand-magic-sparkles"></i> AI 썸네일 이미지 생성 프롬프트</h4>
                  <p>{blogData.imagePrompt}</p>
                </div>
              )}

              {/* 본문 단락 */}
              <article className="blog-article-body">
                <section className="blog-section">
                  <h3 className="section-title"><i className="fa-solid fa-circle-play"></i> 들어가는 글</h3>
                  <p dangerouslySetInnerHTML={{ __html: blogData.introduction.replace(/\n/g, '<br>') }}></p>
                </section>
                
                <section className="blog-section">
                  <h3 className="section-title"><i className="fa-solid fa-circle-nodes"></i> 깊이 알아보기</h3>
                  <p dangerouslySetInnerHTML={{ __html: blogData.body.replace(/\n/g, '<br>') }}></p>
                </section>
                
                <section className="blog-section">
                  <h3 className="section-title"><i className="fa-solid fa-circle-check"></i> 마치며</h3>
                  <p dangerouslySetInnerHTML={{ __html: blogData.conclusion.replace(/\n/g, '<br>') }}></p>
                </section>
              </article>
            </div>

            {/* Unsplash 이미지 제안 그리드 */}
            <div className="image-gallery-section">
              <h3><i className="fa-solid fa-images"></i> 연관 Unsplash 이미지 제안</h3>
              <p className="gallery-subtitle">생성된 글에 가장 적합한 고화질 배경을 선택해 보세요. (선택 시 메인 커버 자동 교체)</p>
              <div className="gallery-grid">
                {images.length > 0 ? (
                  images.map((img, idx) => (
                    <div
                      key={idx}
                      className={`gallery-card ${selectedImage?.url === img.url ? 'active' : ''}`}
                      style={{ backgroundImage: `url(${img.url})` }}
                      onClick={() => setSelectedImage(img)}
                    >
                      <div className="gallery-overlay">
                        <span>By {img.author}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-images">추천 이미지를 가져오지 못했습니다.</p>
                )}
              </div>
            </div>

            {/* 하단 제어 버튼 */}
            <div className="publish-actions">
              <button className="btn btn-secondary" onClick={handleCopyText}>
                <i className="fa-solid fa-copy"></i> 전체 글 복사
              </button>
              <button className="btn btn-secondary" onClick={handleDownloadMarkdown}>
                <i className="fa-solid fa-file-arrow-down"></i> Markdown 다운로드
              </button>
              <button className="btn btn-primary" onClick={handleDownloadHtml}>
                <i className="fa-solid fa-code"></i> HTML 소스 다운로드
              </button>
              <button className="btn btn-reset" onClick={handleRestart}>
                <i className="fa-solid fa-arrow-rotate-left"></i> 처음으로
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>&copy; 2026 Blogify AI. Powered by Google Gemini &amp; Unsplash API</p>
      </footer>
    </div>
  );
}

export default App;
