import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import ProfileCard from './components/ProfileCard';
import LanguageChart from './components/LanguageChart';
import RepoGrid from './components/RepoGrid';
import VisitorCounter from './components/VisitorCounter';

export default function App() {
  const [usernameInput, setUsernameInput] = useState('');
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshTimer, setRefreshTimer] = useState(60);

  const timerRef = useRef(null);
  const activeUserRef = useRef('');

  // 컴포넌트 마운트 시, 이전에 조회했던 유저가 있다면 복원
  useEffect(() => {
    const savedUser = localStorage.getItem('last_searched_github_user');
    if (savedUser) {
      setUsernameInput(savedUser);
      fetchPortfolio(savedUser);
    }
  }, []);

  // 자동 새로고침 타이머 Effect
  useEffect(() => {
    if (autoRefresh && portfolioData) {
      timerRef.current = setInterval(() => {
        setRefreshTimer((prev) => {
          if (prev <= 1) {
            // 시간 만료 시 새로고침
            triggerRefresh();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRefreshTimer(60);
    }

    return () => clearInterval(timerRef.current);
  }, [autoRefresh, portfolioData]);

  // 포트폴리오 정보 가져오기 API 호출
  const fetchPortfolio = async (user) => {
    if (!user.trim()) return;
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/portfolio/${user.trim()}`);
      const data = await response.json();
      
      if (data.success) {
        setPortfolioData(data);
        activeUserRef.current = user.trim();
        localStorage.setItem('last_searched_github_user', user.trim());
      } else {
        setError(data.message || '데이터를 로드하는 데 실패했습니다.');
        setPortfolioData(null);
        setAutoRefresh(false);
      }
    } catch (err) {
      console.error(err);
      setError('서버와 통신하는 중 문제가 발생했습니다.');
      setPortfolioData(null);
      setAutoRefresh(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (usernameInput.trim()) {
      fetchPortfolio(usernameInput);
    }
  };

  const generateMarkdown = (data) => {
    let md = `# 📁 ${data.profile.name} (@${data.profile.username})의 AI GitHub Portfolio\n\n`;
    md += `> GitHub API와 Gemini AI가 자동으로 생성한 포트폴리오 마크다운 문서입니다.\n\n`;
    
    md += `## 👤 프로필\n`;
    md += `- **소개글**: ${data.profile.bio}\n`;
    md += `- **팔로워 수**: ${data.profile.followers.toLocaleString()}명\n`;
    md += `- **공개 저장소**: ${data.profile.public_repos.toLocaleString()}개\n`;
    md += `- **GitHub 프로필 주소**: [바로가기](${data.profile.html_url})\n\n`;
    
    md += `## 📊 주요 사용 언어 분포\n`;
    Object.entries(data.languages)
      .sort((a, b) => b[1] - a[1])
      .forEach(([lang, count]) => {
        md += `- **${lang}**: ${count}개 저장소\n`;
      });
    md += `\n`;
    
    md += `## 🚀 주요 프로젝트 쇼케이스\n\n`;
    data.repos.forEach((repo, idx) => {
      const summary = repo.geminiSummary || {};
      md += `### ${idx + 1}. [${repo.name}](${repo.html_url})\n`;
      md += `- **별/포크**: ⭐ ${repo.stars} / 🍴 ${repo.forks}\n`;
      md += `- **주요 기술**: ${summary.techStack?.map(t => `\`${t}\``).join(', ') || repo.language || '정보 없음'}\n`;
      md += `- **프로젝트 요약**: ${summary.summary || repo.description || '설명이 없습니다.'}\n`;
      if (summary.updates && summary.updates.length > 0) {
        md += `- **주요 특징 및 기능**:\n`;
        summary.updates.forEach(up => {
          md += `  - ${up}\n`;
        });
      }
      md += `\n---\n\n`;
    });
    
    return md;
  };

  const handleExportMarkdown = async () => {
    if (!portfolioData) return;

    const markdownContent = generateMarkdown(portfolioData);

    // Chrome 86+ showSaveFilePicker API 우선 사용
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: `${portfolioData.profile.username}_portfolio.md`,
          types: [{
            description: 'Markdown Files',
            accept: {
              'text/markdown': ['.md'],
            },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(markdownContent);
        await writable.close();
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('파일 저장 실패:', err);
        }
      }
    } else {
      // 대체 수단: Blob 방식
      const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${portfolioData.profile.username}_portfolio.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // revokeObjectURL 즉시 호출하지 않고 30초 이상 지연
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 40000);
    }
  };

  const triggerRefresh = () => {
    if (activeUserRef.current) {
      fetchPortfolio(activeUserRef.current);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
  };

  return (
    <div>
      {/* 타이틀 및 헤더 */}
      <header style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 className="gradient-title">Gitfolio</h1>
        <p className="subtitle">
          GitHub API와 Gemini AI가 자동으로 요약 및 시각화해주는 개발자 포트폴리오
        </p>
      </header>

      {/* 검색 입력 영역 */}
      <form onSubmit={handleSearch} className="search-container">
        <div className="search-input-wrapper">
          <Search size={20} className="search-icon-left" />
          <input
            type="text"
            className="search-input"
            placeholder="GitHub 사용자 아이디 입력 (예: facebook, vercel)"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            disabled={loading}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? (
            <>
              <RefreshCw size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              생성 중...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              포트폴리오 생성
            </>
          )}
        </button>
      </form>

      {/* 에러 출력 */}
      {error && (
        <div className="error-message">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} />
            {error}
          </span>
        </div>
      )}

      {/* 메인 콘텐츠 영역 (로딩 혹은 결과 화면) */}
      {loading ? (
        <div className="dashboard-grid">
          {/* 사이드바 스켈레톤 */}
          <div className="sidebar">
            <div className="glass-card" style={{ height: '380px' }}>
              <div className="skeleton" style={{ width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 20px auto' }}></div>
              <div className="skeleton skeleton-title" style={{ margin: '0 auto 16px auto', width: '70%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '90%', margin: '0 auto 8px auto' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '60%', margin: '0 auto 24px auto' }}></div>
              <div className="skeleton" style={{ height: '40px', borderRadius: '8px' }}></div>
            </div>
            <div className="glass-card" style={{ height: '320px' }}>
              <div className="skeleton skeleton-title" style={{ width: '50%' }}></div>
              <div className="skeleton" style={{ width: '150px', height: '150px', borderRadius: '50%', margin: '0 auto' }}></div>
            </div>
          </div>
          {/* 리포지토리 목록 스켈레톤 */}
          <div className="repos-container">
            <div className="skeleton skeleton-title" style={{ width: '30%' }}></div>
            <div className="repo-grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="glass-card repo-card" style={{ height: '280px' }}>
                  <div className="skeleton skeleton-title" style={{ width: '80%' }}></div>
                  <div className="skeleton" style={{ height: '100px', borderRadius: '8px', marginBottom: '16px' }}></div>
                  <div className="skeleton skeleton-text" style={{ width: '90%' }}></div>
                  <div className="skeleton skeleton-text" style={{ width: '40%' }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        portfolioData && (
          <main className="dashboard-grid">
            {/* 왼쪽 사이드바 (프로필 및 언어 차트) */}
            <aside className="sidebar">
              <ProfileCard profile={portfolioData.profile} onExport={handleExportMarkdown} />
              <LanguageChart languages={portfolioData.languages} />
            </aside>

            {/* 오른쪽 콘텐츠 (리포지토리 목록) */}
            <section>
              <RepoGrid repos={portfolioData.repos} />
            </section>
          </main>
        )
      )}

      {/* 푸터 영역 (방문자 수 및 자동 새로고침) */}
      <footer className="footer-bar">
        <VisitorCounter />

        {portfolioData && !loading && (
          <div 
            className={`auto-refresh-toggle ${autoRefresh ? 'active' : ''}`}
            onClick={toggleAutoRefresh}
          >
            <span className="status-indicator" />
            <span>
              {autoRefresh ? `자동 새로고침 중 (${refreshTimer}초)` : '자동 새로고침 켜기'}
            </span>
          </div>
        )}
      </footer>

      {/* 인라인 회전 키프레임 정의 */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
