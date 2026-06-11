import React, { useState } from "react";

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
