import { 
  db, 
  doc, setDoc, getDoc, updateDoc, collection, addDoc, getDocs, query, where, deleteDoc, writeBatch
} from "./firebase-config.js";

import { generateLevelTestSet, generateEnglishSentences, getGeminiApiKey, setGeminiApiKey } from "./gemini.js";

// 상태 변수
let isLogged = false;
let usersList = [];
let sentencesList = [];
let testsList = [];

// DOM 엘리먼트
const loginView = document.getElementById("admin-login-view");
const mainLayout = document.getElementById("admin-main-layout");

// 메뉴 패널 맵
const menuPanels = {
  "menu-dashboard": document.getElementById("panel-dashboard"),
  "menu-users": document.getElementById("panel-users"),
  "menu-sentences": document.getElementById("panel-sentences"),
  "menu-tests": document.getElementById("panel-tests"),
  "menu-settings": document.getElementById("panel-settings")
};

// 토스트 유틸리티
function showToast(message, isError = false) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  if (isError) {
    toast.style.borderColor = "var(--accent-pink)";
    toast.style.boxShadow = "var(--shadow-neon-pink)";
    toast.innerHTML = `❌ <span>${message}</span>`;
  } else {
    toast.innerHTML = `✨ <span>${message}</span>`;
  }
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 50);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 1. 관리자 인증 확인
function checkAdminAuth() {
  const sessionAuth = sessionStorage.getItem("admin_logged_in");
  if (sessionAuth === "true") {
    isLogged = true;
    loginView.style.display = "none";
    mainLayout.style.display = "flex";
    loadDashboardData();
  } else {
    isLogged = false;
    loginView.style.display = "flex";
    mainLayout.style.display = "none";
  }
}

// 관리자 로그인
document.getElementById("admin-login-btn").addEventListener("click", () => {
  const idInput = document.getElementById("admin-id").value;
  const pwInput = document.getElementById("admin-pw").value;
  
  if (idInput === "admin" && pwInput === "admin1234") {
    sessionStorage.setItem("admin_logged_in", "true");
    showToast("관리자 로그인에 성공했습니다.");
    checkAdminAuth();
  } else {
    showToast("아이디 혹은 비밀번호가 일치하지 않습니다.", true);
  }
});

// 관리자 로그아웃
document.getElementById("admin-logout-btn").addEventListener("click", () => {
  sessionStorage.removeItem("admin_logged_in");
  showToast("관리자 세션이 해제되었습니다.");
  checkAdminAuth();
});

// 2. 사이드 메뉴 전환 처리
Object.keys(menuPanels).forEach(menuId => {
  document.getElementById(menuId).addEventListener("click", (e) => {
    // 메뉴 active 효과 제어
    Object.keys(menuPanels).forEach(id => {
      document.getElementById(id).classList.remove("active");
      menuPanels[id].style.display = "none";
    });
    e.target.classList.add("active");
    menuPanels[menuId].style.display = "block";
    
    // 메뉴 별 데이터 갱신
    if (menuId === "menu-dashboard") {
      loadDashboardData();
    } else if (menuId === "menu-users") {
      loadUsersData();
    } else if (menuId === "menu-sentences") {
      loadSentencesData();
    } else if (menuId === "menu-tests") {
      loadTestsData();
    } else if (menuId === "menu-settings") {
      loadSettingsData();
    }
  });
});

// 3. 대시보드 통계 수집
async function loadDashboardData() {
  try {
    // 1) 사용자 로드
    const userCol = collection(db, "users");
    const userSnap = await getDocs(userCol);
    const totalUsers = userSnap.size;
    document.getElementById("stat-total-users").textContent = totalUsers;
    
    // 2) 문장 로드
    const sentCol = collection(db, "sentences");
    const sentSnap = await getDocs(sentCol);
    
    let beg = 0, inter = 0, adv = 0;
    sentSnap.forEach(doc => {
      const data = doc.data();
      if (data.level === "초급") beg++;
      else if (data.level === "중급") inter++;
      else if (data.level === "고급") adv++;
    });
    
    document.getElementById("stat-beginner-count").textContent = beg;
    document.getElementById("stat-intermediate-count").textContent = inter;
    document.getElementById("stat-advanced-count").textContent = adv;
  } catch (error) {
    console.error("대시보드 통계 로딩 에러:", error);
  }
}

// 4. 사용자 데이터 테이블 로드
async function loadUsersData() {
  const tbody = document.getElementById("user-table-body");
  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">로딩 중...</td></tr>`;
  
  try {
    const userCol = collection(db, "users");
    const snap = await getDocs(userCol);
    usersList = [];
    snap.forEach(doc => {
      usersList.push({ uid: doc.id, ...doc.data() });
    });
    
    tbody.innerHTML = "";
    if (usersList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">가입된 사용자가 없습니다.</td></tr>`;
      return;
    }
    
    usersList.forEach(u => {
      const tr = document.createElement("tr");
      
      // 날짜 파싱
      let joinedDateStr = "-";
      if (u.joinedDate) {
        const d = u.joinedDate.toDate ? u.joinedDate.toDate() : new Date(u.joinedDate);
        joinedDateStr = d.toLocaleDateString();
      }

      tr.innerHTML = `
        <td>
          <div class="table-user-info">
            <img class="table-user-avatar" src="${u.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}" alt="Avatar">
            <span class="user-nickname-btn" style="cursor: pointer; font-weight: 700; color: var(--accent-cyan); text-decoration: underline;" data-uid="${u.uid}">${u.nickname}</span>
          </div>
        </td>
        <td><span class="user-level-badge" style="font-size: 0.8rem; background: var(--bg-glass-active); padding: 4px 10px; border-radius: 12px; border: 1px solid var(--border-glass);">${u.level || '미지정'}</span></td>
        <td>${u.activeDaysCount || 0}회</td>
        <td>${u.lastActiveDate || '-'}</td>
        <td>${joinedDateStr}</td>
        <td>
          <label class="switch">
            <input type="checkbox" class="user-toggle-status" data-uid="${u.uid}" ${u.status === "정지" ? "checked" : ""}>
            <span class="slider-toggle"></span>
          </label>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    // 이벤트 바인딩
    // 1) 닉네임 클릭 -> 상세 팝업
    document.querySelectorAll(".user-nickname-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const uid = e.target.getAttribute("data-uid");
        showUserDetailModal(uid);
      });
    });
    
    // 2) 토글 버튼 이벤트
    document.querySelectorAll(".user-toggle-status").forEach(chk => {
      chk.addEventListener("change", async (e) => {
        const uid = e.target.getAttribute("data-uid");
        const isBlocked = e.target.checked;
        const newStatus = isBlocked ? "정지" : "사용";
        
        try {
          await updateDoc(doc(db, "users", uid), { status: newStatus });
          showToast(`학습자 상태를 [${newStatus}]으로 변경하였습니다.`);
        } catch (error) {
          console.error("유저 토글 실패:", error);
          showToast("계정 상태 변경에 실패했습니다.", true);
          e.target.checked = !isBlocked; // 복구
        }
      });
    });
  } catch (error) {
    console.error("사용자 목록 로드 에러:", error);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--accent-pink);">사용자 로딩 중 에러가 발생했습니다.</td></tr>`;
  }
}

// 사용자 상세 기록 보기 모달
async function showUserDetailModal(uid) {
  const user = usersList.find(u => u.uid === uid);
  if (!user) return;
  
  const title = document.getElementById("modal-user-title");
  const content = document.getElementById("modal-user-content");
  
  title.textContent = `👥 ${user.nickname} 학습 정보 상세`;
  content.innerHTML = `<p style="color: var(--text-muted); text-align: center;">학습 이력을 불러오는 중...</p>`;
  
  document.getElementById("modal-user-detail").classList.add("open");
  
  try {
    const historyCol = collection(db, "history");
    const q = query(historyCol, where("uid", "==", uid));
    const snap = await getDocs(q);
    
    let histories = [];
    snap.forEach(d => histories.push(d.data()));
    
    if (histories.length === 0) {
      content.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-muted);">
          현재까지 학습 기록이 한 건도 없습니다.
        </div>
      `;
      return;
    }
    
    // 날짜별 내림차순 정렬
    histories.sort((a,b) => b.date.localeCompare(a.date));
    
    content.innerHTML = histories.map(h => `
      <div class="glass-card" style="padding: 16px; border-left: 3px solid var(--accent-purple);">
        <div class="flex-between mb-24">
          <strong style="color: var(--accent-cyan); font-size: 1.05rem;">📅 ${h.date}</strong>
          <span style="font-size: 0.85rem; color: var(--text-muted);">학습 당시 레벨: ${h.level}</span>
        </div>
        <ol style="margin-left: 20px; color: var(--text-main); font-size: 0.95rem; display: flex; flex-direction: column; gap: 8px;">
          ${h.sentences.map(s => `
            <li>
              <strong>${s.sentence}</strong>
              <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 2px;">└ ${s.translation}</div>
            </li>
          `).join('')}
        </ol>
      </div>
    `).join('');
  } catch (error) {
    console.error("사용자 이력 로딩 에러:", error);
    content.innerHTML = `<p style="color: var(--accent-pink); text-align: center;">이력 조회 중 오류가 발생했습니다.</p>`;
  }
}

// 5. 영어 문장 관리
async function loadSentencesData() {
  const tbody = document.getElementById("sentence-table-body");
  tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">로딩 중...</td></tr>`;
  
  try {
    const sentCol = collection(db, "sentences");
    const snap = await getDocs(sentCol);
    sentencesList = [];
    snap.forEach(doc => {
      sentencesList.push({ id: doc.id, ...doc.data() });
    });
    
    renderSentencesTable();
  } catch (error) {
    console.error("문장 리스트 로딩 에러:", error);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--accent-pink);">데이터 로드 오류</td></tr>`;
  }
}

function renderSentencesTable() {
  const tbody = document.getElementById("sentence-table-body");
  const filterLevel = document.getElementById("sentence-level-filter").value;
  const searchKeyword = document.getElementById("sentence-search-input").value.toLowerCase().trim();
  
  let filtered = sentencesList;
  
  if (filterLevel !== "all") {
    filtered = filtered.filter(s => s.level === filterLevel);
  }
  
  if (searchKeyword) {
    filtered = filtered.filter(s => 
      s.sentence.toLowerCase().includes(searchKeyword) || 
      s.translation.toLowerCase().includes(searchKeyword) ||
      s.grammar.toLowerCase().includes(searchKeyword)
    );
  }
  
  tbody.innerHTML = "";
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">데이터가 없습니다.</td></tr>`;
    return;
  }
  
  filtered.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="user-level-badge" style="background: var(--accent-purple); color: white;">${s.level}</span></td>
      <td style="font-weight: 700;">${s.sentence}</td>
      <td style="color: var(--text-muted);">${s.translation}</td>
      <td>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sent-detail" style="padding: 6px 12px; font-size: 0.8rem;" data-id="${s.id}">상세</button>
          <button class="btn btn-danger btn-sent-delete" style="padding: 6px 12px; font-size: 0.8rem;" data-id="${s.id}">삭제</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // 상세 및 삭제 액션 바인딩
  document.querySelectorAll(".btn-sent-detail").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      showSentenceDetailModal(id);
    });
  });
  
  document.querySelectorAll(".btn-sent-delete").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.getAttribute("data-id");
      if (confirm("정말로 이 영어 문장 카드를 삭제하시겠습니까?")) {
        try {
          await deleteDoc(doc(db, "sentences", id));
          showToast("영어 문장이 정상적으로 삭제되었습니다.");
          loadSentencesData();
        } catch (err) {
          showToast("문장 삭제 실패", true);
        }
      }
    });
  });
}

// 필터 및 검색 이벤트
document.getElementById("sentence-level-filter").addEventListener("change", renderSentencesTable);
document.getElementById("sentence-search-input").addEventListener("input", renderSentencesTable);

// 문장 상세 모달
function showSentenceDetailModal(id) {
  const s = sentencesList.find(item => item.id === id);
  if (!s) return;
  
  const content = document.getElementById("modal-sentence-content");
  content.innerHTML = `
    <div>
      <span class="user-level-badge" style="background: var(--accent-purple); color: white;">${s.level}</span>
      <h3 style="font-size: 1.8rem; font-weight: 800; margin-top: 10px;">${s.sentence}</h3>
      <p style="color: var(--accent-cyan); font-size: 1.15rem; margin-top: 6px; font-weight: 600;">${s.translation}</p>
    </div>
    
    <div class="grammar-section">
      <h4>Grammar Guide</h4>
      <p>${s.grammar}</p>
    </div>
    
    <div>
      <h4 class="mb-24" style="color: var(--text-muted); font-size: 0.9rem;">핵심 영단어</h4>
      <div class="vocab-tag-list">
        ${s.vocabulary && s.vocabulary.length > 0 ? s.vocabulary.map(v => `
          <div class="vocab-tag">
            <span class="vocab-word">${v.word}</span>
            <span class="vocab-meaning">${v.meaning}</span>
          </div>
        `).join('') : '<span style="color: var(--text-muted);">등록된 단어가 없습니다.</span>'}
      </div>
    </div>
    
    <div class="similar-expr-section">
      <h4>유사 표현 가이드</h4>
      ${s.similarExpressions && s.similarExpressions.length > 0 ? s.similarExpressions.map(ex => `
        <div class="similar-expr-item">${ex}</div>
      `).join('') : '<div class="similar-expr-item" style="color: var(--text-muted);">유사 표현이 없습니다.</div>'}
    </div>
  `;
  document.getElementById("modal-sentence-detail").classList.add("open");
}

// AI 학습 문장 생성 팝업 열기
document.getElementById("admin-create-sentence-btn").addEventListener("click", () => {
  document.getElementById("modal-create-sentence").classList.add("open");
});

// AI 문장 생성 실행
document.getElementById("create-sent-execute-btn").addEventListener("click", async () => {
  const level = document.getElementById("create-sent-level").value;
  const count = parseInt(document.getElementById("create-sent-count").value);
  
  document.getElementById("modal-create-sentence").classList.remove("open");
  showToast(`Gemini API를 사용하여 [${level}] 문장 카드를 ${count}개 생성 중입니다...`);
  
  try {
    const aiSentences = await generateEnglishSentences(level, count);
    
    // Batch 추가
    const batch = writeBatch(db);
    aiSentences.forEach(s => {
      const newId = "sent_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
      s.level = level;
      s.sentenceId = newId;
      s.createdAt = new Date();
      
      const docRef = doc(db, "sentences", newId);
      batch.set(docRef, s);
    });
    
    await batch.commit();
    showToast(`AI 영어 문장 ${count}개가 성공적으로 생성되어 데이터베이스에 기록되었습니다!`);
    loadSentencesData();
  } catch (error) {
    console.error("AI 문장 생성 실패:", error);
    showToast("Gemini API 호출에 실패했거나 파싱 오류가 발생했습니다. 설정을 확인해 주세요.", true);
  }
});

// 6. 레벨 테스트 관리
async function loadTestsData() {
  const tbody = document.getElementById("test-table-body");
  tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">로딩 중...</td></tr>`;
  
  try {
    const testCol = collection(db, "level_tests");
    const snap = await getDocs(testCol);
    testsList = [];
    snap.forEach(doc => {
      testsList.push({ id: doc.id, ...doc.data() });
    });
    
    tbody.innerHTML = "";
    if (testsList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">생성된 테스트 문제 세트가 없습니다.</td></tr>`;
      return;
    }
    
    testsList.forEach(t => {
      const tr = document.createElement("tr");
      let dateStr = "-";
      if (t.createdAt) {
        const d = t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        dateStr = d.toLocaleString();
      }
      
      tr.innerHTML = `
        <td style="font-family: monospace; font-weight: bold;">${t.id}</td>
        <td>${dateStr}</td>
        <td>${t.questions ? t.questions.length : 0}개 문항</td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-test-view" style="padding: 6px 12px; font-size: 0.8rem;" data-id="${t.id}">문항 보기</button>
            <button class="btn btn-primary btn-test-run" style="padding: 6px 12px; font-size: 0.8rem;" data-id="${t.id}">테스트 해보기</button>
            <button class="btn btn-danger btn-test-delete" style="padding: 6px 12px; font-size: 0.8rem;" data-id="${t.id}">삭제</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    // 버튼 이벤트 바인딩
    document.querySelectorAll(".btn-test-view").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        showTestQuestionsModal(id);
      });
    });
    
    document.querySelectorAll(".btn-test-run").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        runTestSimulation(id);
      });
    });
    
    document.querySelectorAll(".btn-test-delete").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.getAttribute("data-id");
        if (confirm("정말로 이 레벨 테스트 문제 세트를 삭제하시겠습니까?")) {
          try {
            await deleteDoc(doc(db, "level_tests", id));
            showToast("테스트 세트가 삭제되었습니다.");
            loadTestsData();
          } catch (err) {
            showToast("세트 삭제 실패", true);
          }
        }
      });
    });
  } catch (error) {
    console.error("테스트 데이터 로드 실패:", error);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--accent-pink);">데이터 로드 에러</td></tr>`;
  }
}

// 테스트 문제 보기 모달
function showTestQuestionsModal(id) {
  const t = testsList.find(item => item.id === id);
  if (!t) return;
  
  const title = document.getElementById("modal-test-title");
  const content = document.getElementById("modal-test-content");
  
  title.textContent = `📝 테스트 세트 문항 목록 [${t.id}]`;
  
  content.innerHTML = t.questions.map((q, idx) => `
    <div class="glass-card" style="padding: 16px;">
      <h4 style="font-size: 1.05rem; color: var(--accent-purple); margin-bottom: 8px;">Q${q.questionNumber || (idx + 1)}. ${q.questionText}</h4>
      <ol style="margin-left: 20px; font-size: 0.9rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px;">
        ${q.options.map((opt, oIdx) => `
          <li style="${oIdx === q.correctAnswer ? 'color: var(--accent-cyan); font-weight: bold;' : ''}">
            ${opt} ${oIdx === q.correctAnswer ? '✅ (정답)' : ''}
          </li>
        `).join('')}
      </ol>
      <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; margin-top: 10px; font-size: 0.85rem; border-left: 3px solid var(--accent-cyan);">
        <strong>해설:</strong> ${q.explanation}
      </div>
    </div>
  `).join('');
  
  document.getElementById("modal-test-detail").classList.add("open");
}

// AI 레벨 테스트 문제 자동 출제
document.getElementById("admin-create-test-btn").addEventListener("click", async () => {
  showToast("Gemini AI를 사용하여 신규 레벨 테스트 세트(10문항)를 출제하는 중입니다...");
  
  try {
    const newSet = await generateLevelTestSet();
    const newId = "set_" + Date.now();
    newSet.setId = newId;
    newSet.createdAt = new Date();
    
    await setDoc(doc(db, "level_tests", newId), newSet);
    showToast("신규 레벨 테스트 문제 세트가 생성되어 등록되었습니다!");
    loadTestsData();
  } catch (error) {
    console.error("AI 테스트 세트 생성 실패:", error);
    showToast("출제 중 에러가 발생했습니다. API 설정을 확인해 보세요.", true);
  }
});

// 관리자 직접 테스트 해보기
function runTestSimulation(id) {
  const t = testsList.find(item => item.id === id);
  if (!t) return;
  
  let simIndex = 0;
  let simAnswers = [];
  
  const title = document.getElementById("modal-test-title");
  const content = document.getElementById("modal-test-content");
  
  title.textContent = `📝 [테스트 해보기] 세트: ${t.id}`;
  
  function renderSimQuestion() {
    if (simIndex >= 10) {
      // 결과 채점
      let score = 0;
      t.questions.forEach((q, idx) => {
        if (simAnswers[idx] === q.correctAnswer) score++;
      });
      
      let level = "초급";
      if (score >= 5 && score <= 7) level = "중급";
      else if (score >= 8) level = "고급";
      
      content.innerHTML = `
        <div style="text-align: center; padding: 30px; display: flex; flex-direction: column; gap: 16px; align-items: center;">
          <h3 style="color: var(--accent-cyan); font-size: 1.6rem;">테스트 시뮬레이션 완료</h3>
          <div class="glass-card" style="padding: 20px; font-family: Outfit; font-size: 2.2rem; font-weight: 800; color: var(--accent-purple);">
            ${score} / 10 맞춤
          </div>
          <p style="font-size: 1.15rem;">최종 판정 등급: <strong>${level}</strong></p>
          <button id="sim-close-btn" class="btn btn-primary" style="margin-top: 10px;">시뮬레이션 종료</button>
        </div>
      `;
      
      document.getElementById("sim-close-btn").addEventListener("click", () => {
        document.getElementById("modal-test-detail").classList.remove("open");
      });
      return;
    }
    
    const q = t.questions[simIndex];
    content.innerHTML = `
      <div class="flex-column gap-16" style="padding: 10px;">
        <div class="flex-between">
          <span style="font-weight: bold; color: var(--text-muted);">문항 ${simIndex + 1} / 10</span>
        </div>
        <h3 style="font-size: 1.2rem; line-height: 1.4;">Q${simIndex + 1}. ${q.questionText}</h3>
        <div class="flex-column gap-12" style="list-style: none;">
          ${q.options.map((opt, oIdx) => `
            <button class="test-option-btn sim-option-btn" data-index="${oIdx}">
              <span class="option-number">${oIdx + 1}</span>
              <span>${opt}</span>
            </button>
          `).join('')}
        </div>
        <div class="flex-between" style="margin-top: 10px;">
          <button id="sim-prev-btn" class="btn btn-secondary" ${simIndex === 0 ? 'style="display:none;"' : ''}>이전</button>
          <button id="sim-next-btn" class="btn btn-primary" style="margin-left:auto;">다음</button>
        </div>
      </div>
    `;
    
    // 시뮬레이션 옵션 선택 이벤트
    const btns = content.querySelectorAll(".sim-option-btn");
    btns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const oIdx = parseInt(e.currentTarget.getAttribute("data-index"));
        simAnswers[simIndex] = oIdx;
        btns.forEach(b => b.classList.remove("selected"));
        e.currentTarget.classList.add("selected");
      });
      
      // 이미 선택했던 경우 복구
      const oIdx = parseInt(btn.getAttribute("data-index"));
      if (simAnswers[simIndex] === oIdx) {
        btn.classList.add("selected");
      }
    });
    
    // 다음/이전 버튼 리스너
    content.querySelector("#sim-next-btn").addEventListener("click", () => {
      if (simAnswers[simIndex] === undefined) {
        showToast("답변을 선택해 주세요.", true);
        return;
      }
      simIndex++;
      renderSimQuestion();
    });
    
    if (simIndex > 0) {
      content.querySelector("#sim-prev-btn").addEventListener("click", () => {
        simIndex--;
        renderSimQuestion();
      });
    }
  }
  
  document.getElementById("modal-test-detail").classList.add("open");
  renderSimQuestion();
}

// 7. API 키 및 파이어베이스 설정 뷰
function loadSettingsData() {
  document.getElementById("settings-gemini-key").value = getGeminiApiKey();
  
  // 로컬 스토리지에 저장된 파이어베이스 설정 가져오기
  const savedFirebase = localStorage.getItem("firebase_config");
  if (savedFirebase) {
    document.getElementById("settings-firebase-config").value = JSON.stringify(JSON.parse(savedFirebase), null, 2);
  } else {
    // 디폴트 설정값 로딩 (firebase-config.js에서 가져오기)
    // index.html과 유사한 형식으로 고정되어 있으므로 admin.html에서도 덮어쓰기 처리를 위함
    document.getElementById("settings-firebase-config").value = `{
  "apiKey": "AIzaSyCLTPc1nPApUZJl53ImngZCw9xFiIxgLdI",
  "authDomain": "aienglish-a8c9b2.firebaseapp.com",
  "projectId": "aienglish-a8c9b2",
  "storageBucket": "aienglish-a8c9b2.firebasestorage.app",
  "messagingSenderId": "302286704180",
  "appId": "1:302286704180:web:d6e08076880401cac3c461"
}`;
  }
}

// 설정 저장
document.getElementById("settings-save-btn").addEventListener("click", () => {
  const geminiKey = document.getElementById("settings-gemini-key").value.trim();
  const firebaseJson = document.getElementById("settings-firebase-config").value.trim();
  
  try {
    // 1) Gemini Key 저장
    setGeminiApiKey(geminiKey);
    
    // 2) Firebase Config 검증 및 저장
    if (firebaseJson) {
      const parsed = JSON.parse(firebaseJson);
      if (!parsed.projectId || !parsed.apiKey) {
        throw new Error("apiKey 및 projectId는 필수 설정 필드입니다.");
      }
      localStorage.setItem("firebase_config", JSON.stringify(parsed));
    } else {
      localStorage.removeItem("firebase_config");
    }
    
    showToast("설정이 성공적으로 저장되었습니다. 적용을 위해 화면을 새로고침합니다.");
    setTimeout(() => window.location.reload(), 1500);
  } catch (error) {
    showToast("입력된 설정 형식이 유효하지 않습니다: " + error.message, true);
  }
});

// 설정 리셋
document.getElementById("settings-reset-btn").addEventListener("click", () => {
  if (confirm("모든 API 및 파이어베이스 커스텀 설정을 밀어버리고 기본값으로 되돌리겠습니까?")) {
    localStorage.removeItem("gemini_api_key");
    localStorage.removeItem("firebase_config");
    showToast("설정이 기본값으로 재설정되었습니다. 새로고침 중...");
    setTimeout(() => window.location.reload(), 1000);
  }
});

// 페이지 로드 시 확인
checkAdminAuth();
