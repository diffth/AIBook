// ===== Sheet Memo - Google Sheets 연동 메모장 =====

// ★★★ 아래 URL을 Google Apps Script 배포 URL로 변경하세요 ★★★
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzjY6C8uM3XJ3uo3BJh_fUEjkMCsATgzTQch2vcmbavYO1b26_xeKtb0Cq2BZqluWKB/exec';

// ===== DOM Elements =====
const memoForm = document.getElementById('memo-form');
const memoTitleInput = document.getElementById('memo-title');
const memoCategorySelect = document.getElementById('memo-category');
const memoContentInput = document.getElementById('memo-content');
const btnSave = document.getElementById('btn-save');
const memoListContainer = document.getElementById('memo-list');
const searchInput = document.getElementById('search-input');
const filterCategory = document.getElementById('filter-category');
const statusBar = document.getElementById('status-bar');
const configBanner = document.getElementById('config-banner');

// Dashboard elements
const statTotal = document.getElementById('stat-total');
const statWeek = document.getElementById('stat-week');
const statRecent = document.getElementById('stat-recent');
const statStreak = document.getElementById('stat-streak');

// ===== State =====
let allMemos = [];
let dailyChart = null;
let categoryChart = null;

// ===== Category Mapping =====
const CATEGORY_MAP = {
  '업무': { icon: '💼', cssClass: 'cat-work', color: '#7c5cfc' },
  '개인': { icon: '🏠', cssClass: 'cat-personal', color: '#f472b6' },
  '아이디어': { icon: '💡', cssClass: 'cat-idea', color: '#fbbf24' },
  '학습': { icon: '📚', cssClass: 'cat-study', color: '#34d399' },
  '기타': { icon: '📌', cssClass: 'cat-etc', color: '#94a3b8' },
};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  checkConfig();
  loadMemos();
});

// ===== Config Check =====
function checkConfig() {
  if (!GAS_URL) {
    configBanner.style.display = 'flex';
  }
}

// ===== Tab Navigation =====
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');

      // Re-init icons for newly visible tab
      lucide.createIcons();

      // Refresh dashboard when switching to it
      if (targetTab === 'dashboard') {
        renderDashboard();
      }
      if (targetTab === 'list') {
        renderMemoList();
      }
    });
  });
}

// ===== Status Toast =====
function showStatus(message, type = 'success') {
  statusBar.textContent = message;
  statusBar.className = `status-bar ${type} show`;
  
  setTimeout(() => {
    statusBar.classList.remove('show');
  }, 3000);
}

// ===== Date Helpers =====
function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${mins}`;
  } catch {
    return dateStr;
  }
}

function getRelativeTime(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return '방금 전';
    if (mins < 60) return `${mins}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return formatDate(dateStr);
  } catch {
    return '';
  }
}

function isThisWeek(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

function getDateKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ===== CRUD Operations =====

// --- Load Memos ---
async function loadMemos() {
  if (!GAS_URL) {
    // Demo mode with sample data
    allMemos = getDemoMemos();
    renderMemoList();
    renderDashboard();
    return;
  }

  showStatus('📡 메모를 불러오는 중...', 'loading');

  try {
    const response = await fetch(`${GAS_URL}?action=list`);
    const data = await response.json();

    if (data.status === 'success') {
      allMemos = data.memos || [];
      showStatus(`✅ ${allMemos.length}개의 메모를 불러왔습니다!`, 'success');
    } else {
      throw new Error(data.message || '데이터 로드 실패');
    }
  } catch (error) {
    console.error('Load error:', error);
    showStatus('❌ 메모 로드 실패. 네트워크를 확인하세요.', 'error');
    allMemos = [];
  }

  renderMemoList();
  renderDashboard();
}

// --- Save Memo ---
memoForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = memoTitleInput.value.trim();
  const category = memoCategorySelect.value;
  const content = memoContentInput.value.trim();

  if (!title || !content) {
    showStatus('⚠️ 제목과 내용을 모두 입력해 주세요.', 'error');
    return;
  }

  btnSave.disabled = true;
  btnSave.innerHTML = '<span class="loading-spinner"></span> 저장 중...';

  const memo = {
    action: 'save',
    title,
    category,
    content,
    date: new Date().toISOString()
  };

  if (!GAS_URL) {
    // Demo mode
    const newMemo = {
      id: Date.now().toString(),
      date: memo.date,
      title: memo.title,
      category: memo.category,
      content: memo.content
    };
    allMemos.unshift(newMemo);
    showStatus('✅ 메모가 저장되었습니다! (데모 모드)', 'success');
    memoForm.reset();
    btnSave.disabled = false;
    btnSave.innerHTML = '<i data-lucide="save"></i> 메모 저장하기';
    lucide.createIcons();
    renderMemoList();
    renderDashboard();
    return;
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(memo)
    });
    const data = await response.json();

    if (data.status === 'success') {
      showStatus('✅ 메모가 구글 시트에 저장되었습니다!', 'success');
      memoForm.reset();
      await loadMemos();
    } else {
      throw new Error(data.message || '저장 실패');
    }
  } catch (error) {
    console.error('Save error:', error);
    showStatus('❌ 저장 실패. 네트워크를 확인하세요.', 'error');
  }

  btnSave.disabled = false;
  btnSave.innerHTML = '<i data-lucide="save"></i> 메모 저장하기';
  lucide.createIcons();
});

// --- Delete Memo ---
async function deleteMemo(id) {
  if (!confirm('이 메모를 삭제하시겠습니까?')) return;

  if (!GAS_URL) {
    allMemos = allMemos.filter(m => m.id !== id);
    showStatus('🗑️ 메모가 삭제되었습니다. (데모 모드)', 'success');
    renderMemoList();
    renderDashboard();
    return;
  }

  showStatus('🗑️ 삭제 중...', 'loading');

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'delete', id })
    });
    const data = await response.json();

    if (data.status === 'success') {
      showStatus('🗑️ 메모가 삭제되었습니다!', 'success');
      await loadMemos();
    } else {
      throw new Error(data.message || '삭제 실패');
    }
  } catch (error) {
    console.error('Delete error:', error);
    showStatus('❌ 삭제 실패.', 'error');
  }
}

// ===== Render Memo List =====
function renderMemoList() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const filterCat = filterCategory.value;

  let filtered = allMemos.filter(memo => {
    const matchSearch = !searchTerm ||
      memo.title.toLowerCase().includes(searchTerm) ||
      memo.content.toLowerCase().includes(searchTerm);
    const matchCat = filterCat === 'all' || memo.category === filterCat;
    return matchSearch && matchCat;
  });

  if (filtered.length === 0) {
    memoListContainer.innerHTML = `
      <div class="empty-state">
        <i data-lucide="inbox"></i>
        <h3>${searchTerm || filterCat !== 'all' ? '검색 결과가 없습니다' : '아직 메모가 없습니다'}</h3>
        <p>${searchTerm || filterCat !== 'all' ? '다른 검색어나 필터를 시도해 보세요.' : "'메모 작성' 탭에서 첫 번째 메모를 만들어 보세요!"}</p>
      </div>`;
    lucide.createIcons();
    return;
  }

  memoListContainer.innerHTML = filtered.map(memo => {
    const catInfo = CATEGORY_MAP[memo.category] || CATEGORY_MAP['기타'];
    return `
      <div class="memo-item" data-id="${memo.id}">
        <div class="memo-category-dot ${catInfo.cssClass}"></div>
        <div class="memo-body">
          <div class="memo-title">${escapeHtml(memo.title)}</div>
          <div class="memo-content">${escapeHtml(memo.content)}</div>
          <div class="memo-meta">
            <span class="memo-meta-item"><i data-lucide="clock"></i> ${getRelativeTime(memo.date)}</span>
            <span class="memo-meta-item"><i data-lucide="tag"></i> ${catInfo.icon} ${memo.category}</span>
          </div>
        </div>
        <div class="memo-actions">
          <button class="btn-icon delete" onclick="deleteMemo('${memo.id}')" title="삭제">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>`;
  }).join('');

  lucide.createIcons();
}

// Search & Filter Event Listeners
searchInput.addEventListener('input', renderMemoList);
filterCategory.addEventListener('change', renderMemoList);

// ===== HTML Escape =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== Dashboard =====
function renderDashboard() {
  if (allMemos.length === 0) {
    statTotal.textContent = '0';
    statWeek.textContent = '0';
    statRecent.textContent = '-';
    statStreak.textContent = '0';
    return;
  }

  // --- Summary Stats ---
  statTotal.textContent = allMemos.length;
  statWeek.textContent = allMemos.filter(m => isThisWeek(m.date)).length;
  
  const sorted = [...allMemos].sort((a, b) => new Date(b.date) - new Date(a.date));
  statRecent.textContent = getRelativeTime(sorted[0].date);

  // Streak calculation
  const uniqueDays = [...new Set(allMemos.map(m => getDateKey(m.date)))].sort().reverse();
  let streak = 0;
  const today = getDateKey(new Date().toISOString());
  for (let i = 0; i < uniqueDays.length; i++) {
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    const expectedKey = getDateKey(expected.toISOString());
    if (uniqueDays[i] === expectedKey || (i === 0 && uniqueDays[0] === getDateKey(new Date(Date.now() - 86400000).toISOString()))) {
      streak++;
    } else if (i === 0) {
      // Today has no memo, check if yesterday started the streak
      const yesterday = getDateKey(new Date(Date.now() - 86400000).toISOString());
      if (uniqueDays[0] === yesterday) {
        streak = 1;
        continue;
      }
      break;
    } else {
      break;
    }
  }
  statStreak.textContent = streak;

  // --- Daily Chart ---
  renderDailyChart();

  // --- Category Chart ---
  renderCategoryChart();
}

function renderDailyChart() {
  const canvas = document.getElementById('chart-daily');
  if (!canvas) return;

  // Aggregate memos by date (last 14 days)
  const dayLabels = [];
  const dayCounts = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = getDateKey(d.toISOString());
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    dayLabels.push(label);
    dayCounts.push(allMemos.filter(m => getDateKey(m.date) === key).length);
  }

  if (dailyChart) dailyChart.destroy();

  dailyChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: dayLabels,
      datasets: [{
        label: '메모 수',
        data: dayCounts,
        borderColor: '#7c5cfc',
        backgroundColor: 'rgba(124, 92, 252, 0.15)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#7c5cfc',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(22, 22, 37, 0.95)',
          borderColor: 'rgba(124, 92, 252, 0.3)',
          borderWidth: 1,
          titleColor: '#e8e8f0',
          bodyColor: '#9494b8',
          padding: 12,
          cornerRadius: 8,
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#6a6a8e', font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { 
            color: '#6a6a8e', 
            font: { size: 11 },
            stepSize: 1,
            precision: 0
          }
        }
      }
    }
  });
}

function renderCategoryChart() {
  const canvas = document.getElementById('chart-category');
  if (!canvas) return;

  const catCounts = {};
  const catColors = [];
  const catLabels = [];

  allMemos.forEach(m => {
    const cat = m.category || '기타';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });

  Object.keys(catCounts).forEach(cat => {
    catLabels.push(`${(CATEGORY_MAP[cat]?.icon || '📌')} ${cat}`);
    catColors.push(CATEGORY_MAP[cat]?.color || '#94a3b8');
  });

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: catLabels,
      datasets: [{
        data: Object.values(catCounts),
        backgroundColor: catColors,
        borderColor: 'rgba(15, 15, 26, 0.8)',
        borderWidth: 3,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#9494b8',
            padding: 16,
            font: { size: 12 },
            usePointStyle: true,
            pointStyleWidth: 10,
          }
        },
        tooltip: {
          backgroundColor: 'rgba(22, 22, 37, 0.95)',
          borderColor: 'rgba(124, 92, 252, 0.3)',
          borderWidth: 1,
          titleColor: '#e8e8f0',
          bodyColor: '#9494b8',
          padding: 12,
          cornerRadius: 8,
        }
      }
    }
  });
}

// ===== Demo Data =====
function getDemoMemos() {
  const now = Date.now();
  const day = 86400000;
  return [
    { id: '1', date: new Date(now).toISOString(), title: 'Sheet Memo 프로젝트 시작!', category: '업무', content: '구글 시트를 데이터베이스로 활용하는 메모장 웹앱 개발을 시작했다. Apps Script로 백엔드를 구성하고 Chart.js로 대시보드를 만들 예정.' },
    { id: '2', date: new Date(now - day * 1).toISOString(), title: '자바스크립트 async/await 정리', category: '학습', content: 'Promise 체인 대신 async/await를 사용하면 코드가 훨씬 깔끔해진다. try-catch로 에러 핸들링도 직관적!' },
    { id: '3', date: new Date(now - day * 1).toISOString(), title: '주간 회의 안건 정리', category: '업무', content: '1. 프로젝트 진행 상황 공유\n2. 다음 스프린트 계획\n3. 코드 리뷰 일정 조율' },
    { id: '4', date: new Date(now - day * 2).toISOString(), title: '새 앱 아이디어: 습관 트래커', category: '아이디어', content: '매일 습관을 기록하고 달성률을 시각화하는 앱. 깃허브 잔디처럼 히트맵으로 표시하면 동기부여 될 듯!' },
    { id: '5', date: new Date(now - day * 3).toISOString(), title: '주말 독서 목록', category: '개인', content: '- 클린 코드 (로버트 마틴)\n- 함께 자라기 (김창준)\n- 오브젝트 (조영호)' },
    { id: '6', date: new Date(now - day * 4).toISOString(), title: 'CSS Grid vs Flexbox 비교', category: '학습', content: 'Grid: 2차원 레이아웃에 적합\nFlexbox: 1차원 정렬에 적합\n실무에서는 두 가지를 섞어 사용하는 것이 가장 좋다.' },
    { id: '7', date: new Date(now - day * 5).toISOString(), title: '팀 점심 장소 후보', category: '기타', content: '1. 서초동 스시 오마카세\n2. 강남역 파스타 맛집\n3. 역삼동 한정식' },
    { id: '8', date: new Date(now - day * 6).toISOString(), title: 'API 응답 캐싱 전략', category: '업무', content: 'SWR 패턴: stale-while-revalidate 방식으로 캐시된 데이터를 먼저 보여주고 백그라운드에서 갱신. 사용자 경험이 크게 개선된다.' },
    { id: '9', date: new Date(now - day * 8).toISOString(), title: '운동 루틴 변경', category: '개인', content: '월: 상체\n화: 하체\n수: 유산소\n목: 상체\n금: 하체\n주말: 가벼운 조깅 or 등산' },
    { id: '10', date: new Date(now - day * 10).toISOString(), title: 'Chrome DevTools 단축키', category: '학습', content: 'F12: DevTools 열기\nCtrl+Shift+C: 요소 선택 모드\nCtrl+Shift+J: 콘솔 열기\nCtrl+Shift+M: 모바일 뷰 토글' },
  ];
}
