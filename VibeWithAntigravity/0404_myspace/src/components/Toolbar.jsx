import React from 'react';
import { Search, Grid, List } from 'lucide-react';

export default function Toolbar({ 
  searchQuery, 
  setSearchQuery, 
  filterType, 
  setFilterType, 
  viewMode, 
  setViewMode 
}) {
  return (
    <div className="toolbar card-glass animate-fade">
      <div className="search-filter-section">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="파일 이름 검색..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <select 
          className="filter-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">전체 파일</option>
          <option value="image">이미지</option>
          <option value="video">비디오</option>
          <option value="document">문서 (PDF/Text)</option>
          <option value="other">기타 파일</option>
        </select>
      </div>

      <div className="view-actions">
        <button 
          className={`btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => setViewMode('grid')}
          title="그리드 뷰"
        >
          <Grid size={20} />
        </button>
        <button 
          className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
          title="리스트 뷰"
        >
          <List size={20} />
        </button>
      </div>
    </div>
  );
}
