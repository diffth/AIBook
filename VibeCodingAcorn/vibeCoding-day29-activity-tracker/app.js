// ==========================================
// Vivid Habit Tracker JS
// Core Application Logic
// ==========================================

// 1. 상태 데이터 초기화
let habits = [];

// DOM 요소 캐싱
const habitsContainer = document.getElementById('habits-container');
const emptyState = document.getElementById('empty-state');
const addHabitModal = document.getElementById('add-habit-modal');
const addHabitForm = document.getElementById('add-habit-form');

const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancel = document.getElementById('btn-cancel');
const btnEmptyAdd = document.getElementById('btn-empty-add');

const btnExport = document.getElementById('btn-export');
const btnImportTrigger = document.getElementById('btn-import-trigger');
const fileImportInput = document.getElementById('file-import');
const btnReset = document.getElementById('btn-reset');

// 2. 로컬 스토리지 연동 함수
function loadHabits() {
    const stored = localStorage.getItem('vivid-habits');
    if (stored) {
        try {
            habits = JSON.parse(stored);
        } catch (e) {
            console.error('로컬 스토리지를 분석하는 중에 오류가 발생했습니다:', e);
            habits = [];
        }
    } else {
        habits = [];
    }
}

function saveHabits() {
    localStorage.setItem('vivid-habits', JSON.stringify(habits));
}

// 3. 통계 계산 헬퍼 함수
// 전체 진행률 계산 (완료일수 / 35 * 100)
function calculateProgress(history) {
    const doneCount = history.filter(val => val).length;
    return Math.round((doneCount / 35) * 100);
}

// 현재 연속 달성일 계산
// 규칙: 가장 최근에 체크된 true가 있는 index부터 거꾸로 내려오며 연속된 true 개수를 카운팅
function calculateStreak(history) {
    let lastDoneIndex = -1;
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i]) {
            lastDoneIndex = i;
            break;
        }
    }
    
    if (lastDoneIndex === -1) return 0;
    
    let streak = 0;
    for (let i = lastDoneIndex; i >= 0; i--) {
        if (history[i]) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

// 4. UI 렌더링 함수
function renderHabits() {
    habitsContainer.innerHTML = '';
    
    if (habits.length === 0) {
        emptyState.classList.remove('hidden');
        habitsContainer.classList.add('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    habitsContainer.classList.remove('hidden');
    
    habits.forEach(habit => {
        const progress = calculateProgress(habit.history);
        const streak = calculateStreak(habit.history);
        
        // 카드 엘리먼트 생성
        const card = document.createElement('div');
        card.className = 'glass-card habit-card';
        card.setAttribute('data-id', habit.id);
        
        // 헤더
        const header = document.createElement('div');
        header.className = 'habit-card-header';
        
        const infoGroup = document.createElement('div');
        infoGroup.className = 'habit-info-group';
        
        const avatar = document.createElement('div');
        avatar.className = 'habit-avatar';
        avatar.textContent = habit.icon;
        // 테마 색상으로 미세한 글로우 보더 적용
        avatar.style.border = `1px solid ${habit.color}`;
        avatar.style.boxShadow = `0 0 10px ${habit.color}22`;
        
        const textGroup = document.createElement('div');
        textGroup.className = 'habit-text';
        
        const title = document.createElement('h3');
        title.className = 'habit-title';
        title.textContent = habit.name;
        title.title = habit.name;
        
        const desc = document.createElement('p');
        desc.className = 'habit-desc';
        desc.textContent = habit.description || '상세 설명이 없습니다.';
        desc.title = habit.description;
        
        textGroup.appendChild(title);
        textGroup.appendChild(desc);
        infoGroup.appendChild(avatar);
        infoGroup.appendChild(textGroup);
        
        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn-icon text-danger';
        btnDelete.title = '습관 삭제';
        btnDelete.innerHTML = '<i data-lucide="trash-2"></i>';
        btnDelete.addEventListener('click', () => deleteHabit(habit.id));
        
        header.appendChild(infoGroup);
        header.appendChild(btnDelete);
        
        // 통계 영역
        const stats = document.createElement('div');
        stats.className = 'habit-stats';
        
        // streak
        const streakItem = document.createElement('div');
        streakItem.className = 'stat-item';
        streakItem.innerHTML = `
            <span class="stat-label">Current Streak</span>
            <div class="stat-value" style="color: ${habit.color}">
                <span>🔥</span> ${streak}일
            </div>
        `;
        
        // progress
        const progressItem = document.createElement('div');
        progressItem.className = 'stat-item';
        progressItem.innerHTML = `
            <span class="stat-label">Total Progress</span>
            <div class="stat-value" style="color: ${habit.color}">
                <i data-lucide="percent"></i> ${progress}%
            </div>
        `;
        
        // progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        progressContainer.innerHTML = `
            <div class="progress-track">
                <div class="progress-bar" style="width: ${progress}%; background: linear-gradient(90deg, ${habit.color}bb, ${habit.color}); box-shadow: 0 0 8px ${habit.color}88;"></div>
            </div>
        `;
        
        stats.appendChild(streakItem);
        stats.appendChild(progressItem);
        stats.appendChild(progressContainer);
        
        // 7x5 그리드 레이아웃
        const gridSection = document.createElement('div');
        gridSection.className = 'habit-grid-section';
        gridSection.innerHTML = `
            <div class="grid-header">
                <span>Day 1</span>
                <span>Day 35</span>
            </div>
        `;
        
        const gridContainer = document.createElement('div');
        gridContainer.className = 'tracker-grid-container';
        
        // 35일을 5주(7x5)로 나누어 행 구성
        for (let week = 0; week < 5; week++) {
            const weekRow = document.createElement('div');
            weekRow.className = 'tracker-week-row';
            
            for (let day = 0; day < 7; day++) {
                const dayIndex = week * 7 + day;
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.textContent = dayIndex + 1;
                cell.title = `Day ${dayIndex + 1}`;
                
                // 완료 상태 분기
                if (habit.history[dayIndex]) {
                    cell.classList.add('done');
                    cell.style.backgroundColor = habit.color;
                    cell.style.boxShadow = `0 0 10px ${habit.color}`;
                }
                
                // 클릭 토글 이벤트 등록
                cell.addEventListener('click', () => toggleDay(habit.id, dayIndex));
                weekRow.appendChild(cell);
            }
            gridContainer.appendChild(weekRow);
        }
        
        gridSection.appendChild(gridContainer);
        
        // 완성된 카드를 본문에 삽입
        card.appendChild(header);
        card.appendChild(stats);
        card.appendChild(gridSection);
        
        habitsContainer.appendChild(card);
    });
    
    // Lucide Icons 리프레시
    lucide.createIcons();
}

// 5. 기능 관련 핸들러
// 5-1. 습관 삭제
function deleteHabit(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    
    if (confirm(`'${habit.name}' 습관을 정말 삭제하시겠습니까? 기록된 모든 데이터가 삭제됩니다.`)) {
        habits = habits.filter(h => h.id !== id);
        saveHabits();
        renderHabits();
    }
}

// 5-2. 그리드 셀 완료 여부 토글
function toggleDay(habitId, dayIndex) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    
    // 상태 토글
    habit.history[dayIndex] = !habit.history[dayIndex];
    
    saveHabits();
    renderHabits();
}

// 5-3. 습관 추가
addHabitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('habit-name').value.trim();
    const description = document.getElementById('habit-desc').value.trim();
    const icon = document.querySelector('input[name="habit-icon"]:checked').value;
    const color = document.querySelector('input[name="habit-color"]:checked').value;
    
    if (!name) return;
    
    // 새로운 습관 객체 생성
    const newHabit = {
        id: Date.now().toString(),
        name: name,
        description: description,
        icon: icon,
        color: color,
        createdAt: new Date().toISOString(),
        history: Array(35).fill(false) // 35일 히스토리 초기화
    };
    
    habits.push(newHabit);
    saveHabits();
    renderHabits();
    
    // 모달 리셋 및 닫기
    addHabitForm.reset();
    closeModal();
});

// 5-4. 전체 리셋
btnReset.addEventListener('click', () => {
    if (confirm('모든 습관 데이터와 체크 기록을 영구히 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        habits = [];
        saveHabits();
        renderHabits();
    }
});

// 5-5. 데이터 파일 내보내기 (Export)
// 크롬 브라우저의 경우 window.showSaveFilePicker API 지원, 미지원 시 Blob fallback & 35초 지연 revoke
async function handleExport() {
    if (habits.length === 0) {
        alert('백업할 습관 데이터가 없습니다. 먼저 습관을 추가해 보세요!');
        return;
    }
    
    const dataStr = JSON.stringify(habits, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    
    // Chrome 86+ window.showSaveFilePicker() 최우선 활용
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'vivid-habits-backup.json',
                types: [{
                    description: 'Habit Tracker Backup File (.json)',
                    accept: {
                        'application/json': ['.json'],
                    },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            alert('데이터 백업 파일이 성공적으로 저장되었습니다!');
            return;
        } catch (err) {
            // 사용자가 파일 선택 창을 닫은 경우는 예외 처리
            if (err.name === 'AbortError') {
                return;
            }
            console.warn('showSaveFilePicker 사용 실패, 일반 다운로드로 대체합니다.', err);
        }
    }
    
    // Fallback: 일반 Blob 링크 다운로드
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vivid-habits-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // 크롬 완벽 호환 다운로드 규칙: URL.createObjectURL 후 즉시 revoke하지 않고 35초 이상 지연
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 35000);
    
    alert('데이터 백업 다운로드가 시작되었습니다!');
}

// 5-6. 데이터 파일 가져오기 (Import)
btnImportTrigger.addEventListener('click', () => {
    fileImportInput.click();
});

fileImportInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const imported = JSON.parse(event.target.result);
            if (!Array.isArray(imported)) {
                throw new Error('배열 형태의 데이터가 아닙니다.');
            }
            
            // 필수 키 및 히스토리 길이 정밀 검증
            const isValid = imported.every(habit => {
                return habit.hasOwnProperty('id') && 
                       habit.hasOwnProperty('name') && 
                       habit.hasOwnProperty('color') && 
                       habit.hasOwnProperty('icon') && 
                       Array.isArray(habit.history) && 
                       habit.history.length === 35;
            });
            
            if (!isValid) {
                throw new Error('데이터 형식이 올바르지 않거나 35일 일정 정보가 유실되었습니다.');
            }
            
            if (confirm(`가져온 ${imported.length}개의 습관 정보로 덮어쓰시겠습니까? 기존 데이터는 완전히 대체됩니다.`)) {
                habits = imported;
                saveHabits();
                renderHabits();
                alert('데이터 복원이 완료되었습니다!');
            }
        } catch (err) {
            alert('데이터 파일 읽기 실패: ' + err.message);
        }
        // 동일 파일도 다시 감지할 수 있도록 초기화
        e.target.value = '';
    };
    reader.readAsText(file);
});

// 6. 모달 제어 함수
function openModal() {
    addHabitModal.classList.remove('hidden');
}

function closeModal() {
    addHabitModal.classList.add('hidden');
    addHabitForm.reset();
}

// 모달 바깥 배경 클릭 시 닫기
addHabitModal.addEventListener('click', (e) => {
    if (e.target === addHabitModal) {
        closeModal();
    }
});

// 이벤트 바인딩
btnOpenModal.addEventListener('click', openModal);
btnCloseModal.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);
if (btnEmptyAdd) {
    btnEmptyAdd.addEventListener('click', openModal);
}
btnExport.addEventListener('click', handleExport);

// 7. 초기 시작 로직
document.addEventListener('DOMContentLoaded', () => {
    loadHabits();
    renderHabits();
});
