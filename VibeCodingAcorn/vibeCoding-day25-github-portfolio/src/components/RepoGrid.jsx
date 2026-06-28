import React from 'react';
import { Star, GitFork, Sparkles, Folder } from 'lucide-react';

// 주요 언어별 대표 네온 테마 색상 정의 (LanguageChart와 동일)
const languageColors = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Shell: '#89e051',
  Vue: '#41b883',
  React: '#61dafb'
};

export default function RepoGrid({ repos }) {
  if (!repos || repos.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
        <p className="text-secondary">보유한 저장소가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="repos-container">
      <h3 className="section-title">
        <Folder size={20} className="text-primary" /> 주요 프로젝트 쇼케이스
      </h3>
      
      <div className="repo-grid">
        {repos.map((repo) => {
          const summary = repo.geminiSummary || {};
          const techStack = summary.techStack || [];
          const updates = summary.updates || [];
          const langColor = languageColors[repo.language] || '#9ca3af';

          return (
            <div key={repo.id} className="glass-card repo-card">
              <div>
                {/* 헤더: 저장소 이름 & 스타, 포크 */}
                <div className="repo-header">
                  <a 
                    href={repo.html_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="repo-name-link"
                  >
                    {repo.name}
                  </a>
                  <div className="repo-stars-forks">
                    <span>
                      <Star size={14} style={{ fill: '#f59e0b', stroke: '#f59e0b' }} /> {repo.stars}
                    </span>
                    <span>
                      <GitFork size={14} /> {repo.forks}
                    </span>
                  </div>
                </div>

                {/* AI 요약 박스 */}
                <div className="ai-summary-box">
                  <div className="ai-label">
                    <Sparkles size={12} /> AI Project Summary
                  </div>
                  <p className="ai-summary-text">
                    {summary.summary || repo.description || "프로젝트 상세 요약 준비 중입니다."}
                  </p>
                  
                  {updates.length > 0 && (
                    <ul style={{ marginTop: '8px' }}>
                      {updates.map((update, uIdx) => (
                        <li key={uIdx} className="ai-bullet">
                          {update}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* 하단 영역: 사용 기술 태그 & 대표 언어 */}
              <div className="repo-footer">
                <div className="repo-tech-tags">
                  {techStack.map((tech, tIdx) => (
                    <span key={tIdx} className="tech-tag">
                      {tech}
                    </span>
                  ))}
                  {techStack.length === 0 && repo.language && (
                    <span className="tech-tag">{repo.language}</span>
                  )}
                </div>

                <div className="repo-lang">
                  <span 
                    className="lang-indicator" 
                    style={{ backgroundColor: langColor }}
                  />
                  {repo.language}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
