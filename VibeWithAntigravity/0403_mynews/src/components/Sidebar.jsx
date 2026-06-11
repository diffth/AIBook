import React from "react";
import CategorySelector from "./CategorySelector";

export default function Sidebar({
  currentTab,
  onTabChange,
  selectedCategories,
  onToggleCategory,
  onOpenConfig
}) {
  return (
    <aside className="sidebar" id="app-sidebar">
      <div className="logo-container">
        <div className="logo-icon">N</div>
        <div className="logo-text">MyNews</div>
      </div>
      
      {/* Navigation Menu */}
      <nav className="menu-section">
        <h2 className="menu-title">대시보드</h2>
        <a 
          className={`menu-item ${currentTab === "feed" ? "active" : ""}`} 
          onClick={() => onTabChange("feed")}
        >
          <i className="ri-newspaper-line"></i>
          <span>뉴스 피드</span>
        </a>
        <a 
          className={`menu-item ${currentTab === "bookmarks" ? "active" : ""}`} 
          onClick={() => onTabChange("bookmarks")}
        >
          <i className="ri-bookmark-line"></i>
          <span>북마크 모아보기</span>
        </a>
        <a 
          className="menu-item" 
          onClick={onOpenConfig}
        >
          <i className="ri-settings-4-line"></i>
          <span>Firebase 설정</span>
        </a>
      </nav>
      
      {/* Category Checklist Manager */}
      {currentTab === "feed" && (
        <section className="keyword-manager">
          <h2 className="menu-title">관심 카테고리</h2>
          <CategorySelector 
            selectedCategories={selectedCategories}
            onToggleCategory={onToggleCategory}
          />
        </section>
      )}
      
      {/* Sidebar Footer (Profile) */}
      <footer className="sidebar-footer">
        <div class="user-profile">
          <div class="user-avatar">G</div>
          <div class="user-name-wrapper">
            <span class="user-name">Guest User</span>
            <span class="user-role">구독형 뉴스 독자</span>
          </div>
        </div>
      </footer>
    </aside>
  );
}
