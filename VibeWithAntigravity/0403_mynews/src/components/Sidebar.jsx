import React from "react";
import CategorySelector from "./CategorySelector";

/**
 * 대시보드 좌측에 위치하여 네비게이션 메뉴 및 카테고리 체크박스를 포함하는 사이드바 컴포넌트
 * 
 * @param {Object} props
 * @param {string} props.currentTab - 현재 활성화된 메인 탭 ("feed" | "bookmarks")
 * @param {Function} props.onTabChange - 메인 탭 전환을 조작하는 콜백 함수
 * @param {string[]} props.selectedCategories - 사용자가 구독 선택한 카테고리 목록
 * @param {Function} props.onToggleCategory - 카테고리 체크박스 클릭 토글 핸들러 함수
 * @param {Function} props.onOpenConfig - Firebase 설정 창 모달을 오픈하는 콜백 함수
 */
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
        <div className="user-profile">
          <div className="user-avatar">G</div>
          <div className="user-name-wrapper">
            <span className="user-name">Guest User</span>
            <span className="user-role">구독형 뉴스 독자</span>
          </div>
        </div>
      </footer>
    </aside>
  );
}
