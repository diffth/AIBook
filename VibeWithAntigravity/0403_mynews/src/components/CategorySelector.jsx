import React from "react";

/**
 * 대시보드에서 제공하는 8가지 기본 카테고리 고정 정의 목록
 */
export const PREDEFINED_CATEGORIES = [
  "정치", "경제", "사회", "IT/과학", "스포츠", "연예", "세계", "게임"
];

/**
 * 사전 정의된 뉴스 카테고리들을 체크박스 리스트로 보여주는 컴포넌트
 * 
 * @param {Object} props
 * @param {string[]} props.selectedCategories - 사용자가 현재 구독(선택) 중인 카테고리 목록
 * @param {Function} props.onToggleCategory - 카테고리 체크박스 선택/해제 토글 콜백 함수
 */
export default function CategorySelector({ selectedCategories, onToggleCategory }) {
  return (
    <div className="category-checklist">
      {PREDEFINED_CATEGORIES.map((cat) => {
        const isChecked = selectedCategories.includes(cat);
        return (
          <label key={cat} className="category-checkbox-label">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggleCategory(cat)}
            />
            <span>{cat}</span>
          </label>
        );
      })}
    </div>
  );
}
