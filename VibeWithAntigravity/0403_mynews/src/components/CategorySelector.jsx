import React from "react";

export const PREDEFINED_CATEGORIES = [
  "정치", "경제", "사회", "IT/과학", "스포츠", "연예", "세계", "게임"
];

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
