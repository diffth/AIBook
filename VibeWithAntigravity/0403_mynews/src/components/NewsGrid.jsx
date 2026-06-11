import React from "react";
import NewsCard from "./NewsCard";

export default function NewsGrid({ articles, bookmarks, onBookmarkToggle, currentTab }) {
  if (articles.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><i className="ri-newspaper-line"></i></div>
        <h3>표시할 뉴스 기사가 없습니다.</h3>
        <p>
          {currentTab === "feed" 
            ? "좌측 사이드바에 키워드를 추가하고 우측 상단의 '뉴스 동기화'를 눌러 실시간 크롤링을 진행해 보세요." 
            : "보관하고 싶은 기사 카드 우측 상단의 북마크 아이콘을 클릭하여 보관해 보세요."}
        </p>
      </div>
    );
  }

  return (
    <div className="news-grid">
      {articles.map((art) => {
        const isBookmarked = !!bookmarks[art.id];
        return (
          <NewsCard
            key={art.id}
            article={art}
            isBookmarked={isBookmarked}
            onBookmarkToggle={onBookmarkToggle}
          />
        );
      })}
    </div>
  );
}
