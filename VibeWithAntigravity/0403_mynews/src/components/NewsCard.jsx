import React from "react";

// 카테고리별 고해상도 Unsplash 백업 이미지 정의
const fallbackImages = {
  "정치": "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=500&auto=format&fit=crop&q=60",
  "경제": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=500&auto=format&fit=crop&q=60",
  "사회": "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=500&auto=format&fit=crop&q=60",
  "IT/과학": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60",
  "스포츠": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&auto=format&fit=crop&q=60",
  "연예": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60",
  "세계": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=60",
  "게임": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop&q=60"
};

export default function NewsCard({ article, isBookmarked, onBookmarkToggle }) {
  const handleCardClick = () => {
    window.open(article.link, "_blank");
  };

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    onBookmarkToggle(article);
  };

  // 노출할 이미지 주소 반환 (뉴스 자체 이미지가 없을 시 카테고리별 Unsplash 기본 이미지 활용)
  const getCardImage = () => {
    if (article.image && article.image.startsWith("http")) {
      return article.image;
    }
    const key = article.keyword || "";
    return fallbackImages[key] || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=500&auto=format&fit=crop&q=60";
  };

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
      {/* 뉴스 미디어 이미지 썸네일 */}
      <div className="card-media">
        <img 
          src={getCardImage()} 
          alt={article.title} 
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=500&auto=format&fit=crop&q=60";
          }}
          loading="lazy"
        />
      </div>

      <div className="card-content">
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
          {article.description && (
            <p className="news-desc">{article.description}</p>
          )}
        </div>

        <div className="card-footer">
          <span className="news-date">
            <i className="ri-time-line"></i> {dateStr}
          </span>
          <span className="view-link">원문 읽기 <i className="ri-arrow-right-up-line"></i></span>
        </div>
      </div>
    </div>
  );
}
