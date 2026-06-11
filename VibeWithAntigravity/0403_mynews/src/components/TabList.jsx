import React, { useState } from "react";

/**
 * 드래그 앤 드롭(HTML5 Drag and Drop)을 통해 노출 순서를 변경할 수 있는 뉴스 카테고리 탭 목록 컴포넌트
 * 
 * @param {Object} props
 * @param {string[]} props.tabs - 구독 중인 카테고리 탭 배열
 * @param {string|null} props.activeTab - 현재 선택된 활성 탭 (null일 시 '전체 피드')
 * @param {Function} props.onTabSelect - 탭 클릭 선택 시 실행되는 콜백 함수
 * @param {Function} props.onReorderTabs - 드래그 앤 드롭을 통한 탭 순서 정렬 변경 시 실행되는 콜백 함수 (dragIndex, dropIndex 전달)
 */
export default function TabList({ tabs, activeTab, onTabSelect, onReorderTabs }) {
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    onReorderTabs(draggedIndex, dropIndex);
    setDraggedIndex(null);
  };

  return (
    <div className="filter-tabs">
      {/* '전체 피드'는 항상 고정되어 있으며 순서 변경에서 제외 (기본값) */}
      <button
        className={`filter-tab ${activeTab === null ? "active" : ""}`}
        onClick={() => onTabSelect(null)}
      >
        전체 피드
      </button>

      {tabs.map((tab, idx) => (
        <button
          key={tab}
          draggable
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, idx)}
          className={`filter-tab ${activeTab === tab ? "active" : ""}`}
          onClick={() => onTabSelect(tab)}
          style={{
            cursor: "grab",
            opacity: draggedIndex === idx ? 0.4 : 1,
            transition: "opacity 0.2s"
          }}
          title="드래그하여 순서를 변경할 수 있습니다."
        >
          <i className="ri-drag-move-fill" style={{ fontSize: "0.75rem", marginRight: "4px", opacity: 0.5 }}></i>
          {tab}
        </button>
      ))}
    </div>
  );
}
