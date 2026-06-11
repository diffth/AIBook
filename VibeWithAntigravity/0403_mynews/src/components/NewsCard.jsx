import React from "react";

export default function NewsCard({ article, isBookmarked, onBookmarkToggle }) {
  const handleCardClick = () => {
    window.open(article.link, "_blank");
  };

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    onBookmarkToggle(article);
  };

  // HTML 이스케이프가 필요한 특수문자 디코딩 처리 (React는 기본적으로 string 출력 시 자체 이스케이프하므로 추가 유틸 없이 안전함)
  
  // 날짜 포맷팅
  let dateStr = "";
  if (article.pubDate) {
    const d = new Date(article.pubDate);
    dateStr = isNaN(d.getTime()) 
      ? article.pubDate 
      : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }

  return (
    <div className="news-card" onClick={handleCardClick}>
      <div className="card-header">
        <div className="news-card-tags">
          <span className="news-source">{article.source || "Google 뉴스"}</span>
          {article.keyword && <span className="news-keyword-tag">#{article.keyword}</span>}
        </div>
        <button 
          className={`btn-bookmark ${isBookmarked ? "active" : ""}`} 
          onClick={handleBookmarkClick}
          title={isBookmarked ? "북마크 해제" : "북마크 추가"}
        >
          <i className={isBookmarked ? "ri-bookmark-fill" : "ri-bookmark-line"}></i>
        </button>
      </div>
      <div className="card-body">
        <h3 className="news-title">{article.title}</h3>
      </div>
      <div className="card-footer">
        <span className="news-date">
          <i className="ri-time-line"></i> {dateStr}
        </span>
        <span className="view-link">원문 읽기 <i class="ri-arrow-right-up-line"></i></span>
      </div>
    </div>
  );
}
