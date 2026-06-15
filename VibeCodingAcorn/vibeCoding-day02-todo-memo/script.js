/**
 * 도토리의 Vibe To-Do - 로직 스크립트
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM 요소 선택
  const todoForm = document.getElementById('todoForm');
  const todoInput = document.getElementById('todoInput');
  const todoList = document.getElementById('todoList');
  const activeCountEl = document.getElementById('activeCount');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const filterBtns = document.querySelectorAll('.filter-btn');

  // To-Do 데이터 배열
  let todos = [];
  let currentFilter = 'all';

  // 1. 초기 데이터 로드
  init();

  function init() {
    // LocalStorage에서 데이터 읽기
    const savedTodos = localStorage.getItem('vibe-todos');
    if (savedTodos) {
      todos = JSON.parse(savedTodos);
    }
    
    // UI 업데이트
    renderTodos();
  }

  // 2. To-Do 렌더링 함수
  function renderTodos() {
    // 리스트 초기화
    todoList.innerHTML = '';

    // 현재 선택된 필터에 따라 데이터 가공
    const filteredTodos = todos.filter(todo => {
      if (currentFilter === 'active') return !todo.completed;
      if (currentFilter === 'completed') return todo.completed;
      return true; // 'all'
    });

    // 만약 리스트가 비어있다면 Empty State 표시
    if (filteredTodos.length === 0) {
      const emptyState = document.createElement('li');
      emptyState.className = 'empty-state';
      
      let message = '등록된 할 일이 없습니다.';
      if (currentFilter === 'active') message = '진행 중인 할 일이 없습니다. 👍';
      if (currentFilter === 'completed') message = '완료된 할 일이 아직 없네요! 💪';

      emptyState.innerHTML = `
        <i class="fa-regular fa-folder-open empty-icon"></i>
        <p>${message}</p>
      `;
      todoList.appendChild(emptyState);
    } else {
      // 리스트 아이템 렌더링
      filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.setAttribute('data-id', todo.id);

        // 체크박스 아이콘 결정
        const checkIconClass = todo.completed ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle';

        li.innerHTML = `
          <div class="checkbox-wrapper">
            <i class="${checkIconClass} check-icon"></i>
          </div>
          <span class="todo-text">${escapeHTML(todo.text)}</span>
          <button class="btn-delete" aria-label="삭제">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        `;

        todoList.appendChild(li);
      });
    }

    // 통계(남은 일) 업데이트
    updateStats();
  }

  // 통계 및 개수 카운터 업데이트
  function updateStats() {
    const activeTodos = todos.filter(todo => !todo.completed);
    activeCountEl.textContent = activeTodos.length;
  }

  // 로컬스토리지 저장 함수
  function saveToLocalStorage() {
    localStorage.setItem('vibe-todos', JSON.stringify(todos));
  }

  // HTML 이스케이프 유틸리티 (XSS 방지)
  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
