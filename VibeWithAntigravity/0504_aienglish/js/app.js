import { 
  auth, db, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged,
  doc, setDoc, getDoc, updateDoc, collection, addDoc, getDocs, query, where, limit
} from "./firebase-config.js";

import { generateLevelTestSet, generateEnglishSentences } from "./gemini.js";

// 상태 변수
let currentUser = null;
let userData = null;
let currentTestSet = null;
let currentTestIndex = 0;
let userAnswers = [];
let todaySentences = [];
let activeCardIndex = 0;

// DOM 엘리먼트
const viewLogin = document.getElementById("view-login");
const viewRegister = document.getElementById("view-register");
const viewLeveltest = document.getElementById("view-leveltest");
const viewTestResult = document.getElementById("view-test-result");
const viewToday = document.getElementById("view-today");
const viewHistory = document.getElementById("view-history");
const viewBlocked = document.getElementById("view-blocked");

const mainHeader = document.getElementById("main-header");
const headerAvatar = document.getElementById("header-avatar");
const headerNickname = document.getElementById("header-nickname");
const drawer = document.getElementById("drawer");
const drawerOverlay = document.getElementById("drawer-overlay");
const drawerUserSection = document.getElementById("drawer-user-section");
const menuAdminLink = document.getElementById("menu-admin-link");

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

// 뷰 전환 유틸리티
function switchView(targetSection) {
  const sections = [viewLogin, viewRegister, viewLeveltest, viewTestResult, viewToday, viewHistory, viewBlocked];
  sections.forEach(sec => sec.style.display = "none");
  
  targetSection.style.display = targetSection === viewLogin || targetSection === viewRegister || targetSection === viewLeveltest || targetSection === viewTestResult || targetSection === viewBlocked ? "flex" : "block";
  
  if (targetSection === viewLogin || targetSection === viewBlocked) {
    mainHeader.style.display = "none";
  } else {
    mainHeader.style.display = "flex";
  }
  closeDrawer();
}

// 오늘 날짜 문자열 구하기 (KST YYYY-MM-DD)
function getTodayDateString() {
  const offset = 9 * 60; // KST는 UTC+9
  const now = new Date();
  const kst = new Date(now.getTime() + (now.getTimezoneOffset() + offset) * 60000);
  const yyyy = kst.getFullYear();
  const mm = String(kst.getMonth() + 1).padStart(2, '0');
  const dd = String(kst.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// TTS 기능
function playTTS(text) {
  if ('speechSynthesis' in window) {
    // 혹시 실행 중인 재생이 있다면 정지
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // 자연스러운 속도
    
    // 영어 음성 찾기
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    window.speechSynthesis.speak(utterance);
    showToast("음성을 재생합니다.");
  } else {
    showToast("이 브라우저는 음성 합성(TTS)을 지원하지 않습니다.", true);
  }
}

// UI 초기 로드 시 voice list를 채우기 위한 깡통 트리거
if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = () => {};
}

// 1. 구글 로그인 처리
document.getElementById("google-login-btn").addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("로그인 에러:", error);
    showToast("구글 로그인에 실패했습니다. 다시 시도해 주세요.", true);
  }
});

// Auth 상태 변경 감지
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await checkUserRegistration();
  } else {
    currentUser = null;
    userData = null;
    switchView(viewLogin);
  }
});

// 회원 데이터베이스 체크
async function checkUserRegistration() {
  const userDocRef = doc(db, "users", currentUser.uid);
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      userData = userDocSnap.data();
      
      // 정지된 사용자인지 확인
      if (userData.status === "정지") {
        switchView(viewBlocked);
        return;
      }

      // 접속 통계 업데이트 (하루 한 번)
      const todayStr = getTodayDateString();
      if (userData.lastActiveDate !== todayStr) {
        const newActiveDays = (userData.activeDaysCount || 0) + 1;
        await updateDoc(userDocRef, {
          lastActiveDate: todayStr,
          activeDaysCount: newActiveDays
        });
        userData.lastActiveDate = todayStr;
        userData.activeDaysCount = newActiveDays;
      }
      
      setupUserProfileUI();
      switchView(viewToday);
      await loadTodaySentences();
    } else {
      // 미가입 유저 -> 프로필 정보 입력 화면으로
      document.getElementById("reg-nickname").value = currentUser.displayName || "";
      switchView(viewRegister);
    }
  } catch (error) {
    console.error("사용자 정보 조회 에러:", error);
    showToast("사용자 정보 로딩 중 에러가 발생했습니다.", true);
  }
}

// 회원 프로필 렌더링
function setupUserProfileUI() {
  if (!userData) return;
  headerAvatar.src = userData.profileImage;
  headerNickname.textContent = userData.nickname;
  
  // 드로어 렌더링
  drawerUserSection.innerHTML = `
    <img src="${userData.profileImage}" alt="프로필">
    <div class="user-name">${userData.nickname}</div>
    <div class="user-level-badge">${userData.level}</div>
  `;

  // 관리자 링크 표시 여부 (admin 이메일 체크 - toy project용이므로 admin 계정이 아니어도 관리자 메뉴 보기가 유연하게 이동 가능하게 구성)
  if (currentUser.email === "idiffth@gmail.com" || currentUser.email.includes("admin")) {
    menuAdminLink.style.display = "flex";
  } else {
    menuAdminLink.style.display = "flex"; // 테스트 편의상 모든 사용자에게 관리자 모드 이동 링크 오픈
  }
}

// 2. 프로필 입력 완료 후 다음 단계 (레벨 테스트 준비)
document.getElementById("reg-next-btn").addEventListener("click", async () => {
  const nickname = document.getElementById("reg-nickname").value.trim();
  const avatarSelect = document.getElementById("reg-avatar-select").value;
  
  if (!nickname) {
    showToast("닉네임을 입력해 주세요.", true);
    return;
  }
  
  let profileImage = avatarSelect;
  if (avatarSelect === "google") {
    profileImage = currentUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
  }
  
  // 가입 중인 닉네임과 이미지를 로컬 변수에 보관
  userData = {
    nickname,
    profileImage,
    uid: currentUser.uid,
    status: "사용",
    joinedDate: new Date(),
    lastActiveDate: getTodayDateString(),
    activeDaysCount: 1
  };
  
  showToast("레벨 테스트 문항을 로딩하고 있습니다...");
  switchView(viewLeveltest);
  await startLevelTest();
});

// 3. 레벨 테스트 시작
async function startLevelTest() {
  currentTestIndex = 0;
  userAnswers = [];
  currentTestSet = null;

  try {
    // Firestore에서 테스트 문제 세트 가져오기
    const testColRef = collection(db, "level_tests");
    const testSnap = await getDocs(testColRef);
    
    let sets = [];
    testSnap.forEach(doc => {
      sets.push(doc.data());
    });

    if (sets.length > 0) {
      // 랜덤 세트 선택
      currentTestSet = sets[Math.floor(Math.random() * sets.length)];
    } else {
      // DB에 세트가 없을 경우, Gemini API로 즉석 생성 (콜드 스타트 방지)
      showToast("새로운 AI 레벨 테스트 문제를 실시간 출제 중입니다...");
      const newSet = await generateLevelTestSet();
      newSet.setId = "set_auto_" + Date.now();
      newSet.createdAt = new Date();
      
      // 다음 사람들을 위해 DB에도 즉시 백업 저장
      await setDoc(doc(db, "level_tests", newSet.setId), newSet);
      currentTestSet = newSet;
    }
    
    renderTestQuestion();
  } catch (error) {
    console.error("테스트 시작 중 에러:", error);
    showToast("레벨 테스트 로드 실패. Gemini API 키 설정을 확인해 주세요.", true);
  }
}

// 레벨 테스트 문항 렌더링
function renderTestQuestion() {
  if (!currentTestSet || !currentTestSet.questions || currentTestSet.questions.length === 0) return;
  
  const question = currentTestSet.questions[currentTestIndex];
  
  document.getElementById("test-progress-text").textContent = `${currentTestIndex + 1} / 10`;
  const percent = ((currentTestIndex + 1) / 10) * 100;
  document.getElementById("test-progress-bar").style.width = `${percent}%`;
  
  document.getElementById("test-question-text").textContent = `Q${currentTestIndex + 1}. ${question.questionText}`;
  
  const optionsList = document.getElementById("test-options-list");
  optionsList.innerHTML = "";
  
  question.options.forEach((opt, idx) => {
    const li = document.createElement("li");
    const isSelected = userAnswers[currentTestIndex] === idx;
    
    li.innerHTML = `
      <button class="test-option-btn ${isSelected ? 'selected' : ''}" data-index="${idx}">
        <span class="option-number">${idx + 1}</span>
        <span>${opt}</span>
      </button>
    `;
    optionsList.appendChild(li);
  });
  
  // 버튼 바인딩
  document.querySelectorAll(".test-option-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const selectedIdx = parseInt(e.currentTarget.getAttribute("data-index"));
      userAnswers[currentTestIndex] = selectedIdx;
      
      // 선택 효과 반영
      document.querySelectorAll(".test-option-btn").forEach(b => b.classList.remove("selected"));
      e.currentTarget.classList.add("selected");
    });
  });

  // 이전 버튼 처리
  const prevBtn = document.getElementById("test-prev-btn");
  if (currentTestIndex > 0) {
    prevBtn.style.display = "inline-flex";
  } else {
    prevBtn.style.display = "none";
  }
  
  // 다음 버튼 텍스트 변경
  const nextBtn = document.getElementById("test-next-btn");
  if (currentTestIndex === 9) {
    nextBtn.textContent = "결과 보기";
  } else {
    nextBtn.textContent = "다음";
  }
}

// 레벨 테스트 이전 버튼 이벤트
document.getElementById("test-prev-btn").addEventListener("click", () => {
  if (currentTestIndex > 0) {
    currentTestIndex--;
    renderTestQuestion();
  }
});

// 레벨 테스트 다음 버튼 이벤트 (채점)
document.getElementById("test-next-btn").addEventListener("click", () => {
  if (userAnswers[currentTestIndex] === undefined) {
    showToast("정답을 선택해 주세요.", true);
    return;
  }
  
  if (currentTestIndex < 9) {
    currentTestIndex++;
    renderTestQuestion();
  } else {
    // 테스트 종료 -> 채점 진행
    calculateTestResult();
  }
});

// 테스트 결과 계산
function calculateTestResult() {
  let score = 0;
  currentTestSet.questions.forEach((q, idx) => {
    if (userAnswers[idx] === q.correctAnswer) {
      score++;
    }
  });
  
  let level = "초급";
  if (score >= 5 && score <= 7) {
    level = "중급";
  } else if (score >= 8) {
    level = "고급";
  }
  
  userData.level = level;
  userData.score = score;
  
  document.getElementById("result-score").textContent = `${score} / 10`;
  const engLevel = level === "초급" ? "Beginner" : level === "중급" ? "Intermediate" : "Advanced";
  document.getElementById("result-level").textContent = `${level} (${engLevel})`;
  
  switchView(viewTestResult);
}

// 회원가입 최종 완료 및 DB 저장
document.getElementById("complete-signup-btn").addEventListener("click", async () => {
  const chkTerms = document.getElementById("chk-terms").checked;
  const chkPrivacy = document.getElementById("chk-privacy").checked;
  
  if (!chkTerms || !chkPrivacy) {
    showToast("필수 동의 항목을 모두 체크해 주세요.", true);
    return;
  }
  
  showToast("회원 데이터 등록 중...");
  
  try {
    const userDocRef = doc(db, "users", currentUser.uid);
    await setDoc(userDocRef, userData);
    
    showToast("환영합니다! 회원가입이 성공적으로 완료되었습니다.");
    setupUserProfileUI();
    switchView(viewToday);
    await loadTodaySentences();
  } catch (error) {
    console.error("회원 등록 중 에러:", error);
    showToast("회원 등록에 실패했습니다. 다시 시도해 주세요.", true);
  }
});

// 4. 오늘의 문장 로드
async function loadTodaySentences() {
  const todayStr = getTodayDateString();
  document.getElementById("today-date-badge").textContent = todayStr.replace(/-/g, '. ');
  
  const historyDocId = `${currentUser.uid}_${todayStr}`;
  const historyRef = doc(db, "history", historyDocId);
  
  try {
    const historySnap = await getDoc(historyRef);
    if (historySnap.exists()) {
      todaySentences = historySnap.data().sentences;
      renderTodaySentences();
    } else {
      // 오늘 배운 기록이 없음 -> 새로운 문장 구성
      showToast("오늘의 학습 문장을 구성하고 있습니다...");
      
      // DB의 sentences 중 사용자의 레벨과 맞는 문장 수집
      const sColRef = collection(db, "sentences");
      const q = query(sColRef, where("level", "==", userData.level));
      const sSnap = await getDocs(q);
      
      let allLevelSentences = [];
      sSnap.forEach(doc => {
        allLevelSentences.push(doc.data());
      });
      
      // 사용자가 이전에 배운 문장 텍스트 수집 (중복 배제 목적)
      const hColRef = collection(db, "history");
      const hQuery = query(hColRef, where("uid", "==", currentUser.uid));
      const hSnap = await getDocs(hQuery);
      
      let learnedSentenceTexts = new Set();
      hSnap.forEach(doc => {
        const histData = doc.data();
        if (histData.sentences) {
          histData.sentences.forEach(s => learnedSentenceTexts.add(s.sentence));
        }
      });
      
      // 안 배운 문장 필터링
      let unlearned = allLevelSentences.filter(s => !learnedSentenceTexts.has(s.sentence));
      
      let selectedSentences = [];
      
      if (unlearned.length >= 5) {
        // 안 배운 문장이 충분함 -> 랜덤 5개 추출
        unlearned.sort(() => Math.random() - 0.5);
        selectedSentences = unlearned.slice(0, 5);
      } else {
        // 안 배운 문장이 부족함 -> 부족한 분량 또는 통째로 5개 생성
        showToast("데이터베이스에 새로운 학습 문장이 부족하여 AI가 실시간 생성합니다...");
        try {
          const neededCount = 5 - unlearned.length;
          const aiGenerated = await generateEnglishSentences(userData.level, neededCount);
          
          // AI 생성 문장들을 Firestore 'sentences' 컬렉션에 백업
          for (const s of aiGenerated) {
            s.level = userData.level;
            s.sentenceId = "sent_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
            s.createdAt = new Date();
            await setDoc(doc(db, "sentences", s.sentenceId), s);
            selectedSentences.push(s);
          }
          
          // 기존에 있던 안 배운 문장도 결합
          selectedSentences = selectedSentences.concat(unlearned);
        } catch (aiErr) {
          console.error("AI 문장 생성 실패:", aiErr);
          // AI 실패 시 만약 DB에 기존 문장이 5개 미만이더라도 있는 것만이라도 보여주기 위해 폴백
          selectedSentences = allLevelSentences.slice(0, 5);
          if (selectedSentences.length === 0) {
            throw new Error("학습할 문장이 아예 존재하지 않습니다. 관리자 도구에서 AI 문장 생성을 진행해 주세요.");
          }
        }
      }
      
      // 오늘 학습 내역 저장
      todaySentences = selectedSentences.slice(0, 5);
      await setDoc(historyRef, {
        uid: currentUser.uid,
        date: todayStr,
        sentences: todaySentences,
        level: userData.level
      });
      
      renderTodaySentences();
    }
  } catch (error) {
    console.error("학습 로드 에러:", error);
    showToast(error.message || "오늘의 학습 정보를 불러오지 못했습니다.", true);
  }
}

// 오늘의 문장 렌더링
function renderTodaySentences() {
  const container = document.getElementById("today-card-container");
  const dotsContainer = document.getElementById("slider-dots");
  
  container.innerHTML = "";
  dotsContainer.innerHTML = "";
  activeCardIndex = 0;
  
  todaySentences.forEach((s, idx) => {
    // 카드 추가
    const card = document.createElement("div");
    card.className = "learn-card glass-card";
    
    // 핵심 단어 매핑
    let vocabHTML = "";
    if (s.vocabulary && s.vocabulary.length > 0) {
      vocabHTML = `
        <div class="vocab-tag-list">
          ${s.vocabulary.map(v => `
            <div class="vocab-tag">
              <span class="vocab-word">${v.word}</span>
              <span class="vocab-meaning">${v.meaning}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // 유사 표현 매핑
    let similarHTML = "";
    if (s.similarExpressions && s.similarExpressions.length > 0) {
      similarHTML = `
        <div class="similar-expr-section">
          <h4>유사 표현</h4>
          ${s.similarExpressions.map(ex => `<div class="similar-expr-item">${ex}</div>`).join('')}
        </div>
      `;
    }

    card.innerHTML = `
      <div class="card-header-info">
        <span class="card-index">CARD ${idx + 1} / 5</span>
        <button class="card-tts-btn" data-text="${s.sentence.replace(/"/g, '&quot;')}">🔊</button>
      </div>
      <div class="english-sentence">${s.sentence}</div>
      <div class="korean-translation">${s.translation}</div>
      
      <div class="grammar-section">
        <h4>Grammar Tip</h4>
        <p>${s.grammar}</p>
      </div>

      ${vocabHTML}
      ${similarHTML}
    `;
    container.appendChild(card);

    // 도트 추가
    const dot = document.createElement("div");
    dot.className = `slider-dot ${idx === 0 ? 'active' : ''}`;
    dot.addEventListener("click", () => {
      slideToCard(idx);
    });
    dotsContainer.appendChild(dot);
  });

  // TTS 재생 바인딩
  document.querySelectorAll(".card-tts-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const text = e.currentTarget.getAttribute("data-text");
      playTTS(text);
    });
  });

  slideToCard(0);
}

// 카드 슬라이드 이동
function slideToCard(index) {
  const container = document.getElementById("today-card-container");
  container.style.transform = `translateX(-${index * 100}%)`;
  activeCardIndex = index;
  
  // 도트 상태 변경
  const dots = document.querySelectorAll(".slider-dot");
  dots.forEach((dot, idx) => {
    if (idx === index) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });
}

// 슬라이더 좌우 컨트롤 버튼 이벤트
document.getElementById("slide-prev-btn").addEventListener("click", () => {
  if (activeCardIndex > 0) {
    slideToCard(activeCardIndex - 1);
  }
});
document.getElementById("slide-next-btn").addEventListener("click", () => {
  if (activeCardIndex < todaySentences.length - 1) {
    slideToCard(activeCardIndex + 1);
  }
});

// 5. 학습 기록 조회
document.getElementById("load-history-btn").addEventListener("click", async () => {
  const datePickerValue = document.getElementById("history-date-picker").value;
  if (!datePickerValue) {
    showToast("조회할 날짜를 선택해 주세요.", true);
    return;
  }
  
  const resultBox = document.getElementById("history-result-box");
  resultBox.innerHTML = `
    <div class="glass-card" style="text-align: center; padding: 40px;">
      데이터 로딩 중...
    </div>
  `;
  
  const historyDocId = `${currentUser.uid}_${datePickerValue}`;
  const historyRef = doc(db, "history", historyDocId);
  
  try {
    const docSnap = await getDoc(historyRef);
    if (docSnap.exists()) {
      const histData = docSnap.data();
      const sList = histData.sentences;
      
      resultBox.innerHTML = "";
      sList.forEach((s, idx) => {
        const item = document.createElement("div");
        item.className = "glass-card flex-column gap-16";
        item.style.borderLeft = "4px solid var(--accent-cyan)";
        
        let vocabHTML = "";
        if (s.vocabulary && s.vocabulary.length > 0) {
          vocabHTML = `
            <div class="vocab-tag-list">
              ${s.vocabulary.map(v => `
                <div class="vocab-tag">
                  <span class="vocab-word">${v.word}</span>
                  <span class="vocab-meaning">${v.meaning}</span>
                </div>
              `).join('')}
            </div>
          `;
        }

        item.innerHTML = `
          <div class="flex-between">
            <span class="card-index" style="color: var(--accent-cyan);">문장 ${idx + 1}</span>
            <button class="card-tts-btn" data-text="${s.sentence.replace(/"/g, '&quot;')}">🔊</button>
          </div>
          <div class="english-sentence" style="font-size: 1.5rem;">${s.sentence}</div>
          <div class="korean-translation" style="font-size: 1rem; color: var(--text-muted);">${s.translation}</div>
          <div class="grammar-section" style="border-left-color: var(--accent-cyan);">
            <h4>Grammar Tip</h4>
            <p>${s.grammar}</p>
          </div>
          ${vocabHTML}
        `;
        resultBox.appendChild(item);
      });
      
      // 복습 카드 TTS 재연동
      resultBox.querySelectorAll(".card-tts-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const text = e.currentTarget.getAttribute("data-text");
          playTTS(text);
        });
      });
      
    } else {
      resultBox.innerHTML = `
        <div class="glass-card" style="text-align: center; color: var(--text-muted); padding: 40px; border-color: var(--accent-pink);">
          이 날짜에는 학습한 기록이 없습니다.
        </div>
      `;
    }
  } catch (error) {
    console.error("학습 기록 로딩 에러:", error);
    showToast("학습 기록 로딩 중 실패했습니다.", true);
  }
});

// 드로어 열기 / 닫기
function openDrawer() {
  drawer.classList.add("open");
  drawerOverlay.classList.add("open");
}
function closeDrawer() {
  drawer.classList.remove("open");
  drawerOverlay.classList.remove("open");
}

document.getElementById("drawer-toggle-btn").addEventListener("click", openDrawer);
document.getElementById("drawer-close-btn").addEventListener("click", closeDrawer);
drawerOverlay.addEventListener("click", closeDrawer);

// 메뉴 아이템 클릭 시 화면 분기
document.getElementById("menu-today").addEventListener("click", () => {
  document.querySelectorAll(".drawer-menu-item").forEach(el => el.classList.remove("active"));
  document.getElementById("menu-today").classList.add("active");
  switchView(viewToday);
  loadTodaySentences();
});

document.getElementById("menu-history").addEventListener("click", () => {
  document.querySelectorAll(".drawer-menu-item").forEach(el => el.classList.remove("active"));
  document.getElementById("menu-history").classList.add("active");
  
  // 날짜 선택기를 오늘 날짜로 디폴트 설정
  document.getElementById("history-date-picker").value = getTodayDateString();
  
  switchView(viewHistory);
  document.getElementById("history-result-box").innerHTML = `
    <div class="glass-card" style="text-align: center; color: var(--text-muted); padding: 40px;">
      학습 날짜를 선택한 뒤 조회하기 버튼을 눌러주세요.
    </div>
  `;
});

// 관리자 이동
document.getElementById("menu-admin-link").addEventListener("click", () => {
  window.location.href = "admin.html";
});

// 로그아웃 처리
function handleLogout() {
  signOut(auth).then(() => {
    showToast("성공적으로 로그아웃되었습니다.");
  }).catch((error) => {
    console.error("로그아웃 중 실패:", error);
  });
}
document.getElementById("menu-logout").addEventListener("click", handleLogout);
document.getElementById("blocked-logout-btn").addEventListener("click", handleLogout);

// 회원가입 아바타 선택 미리보기 자동 갱신
document.getElementById("reg-avatar-select").addEventListener("change", (e) => {
  const selectVal = e.target.value;
  const preview = document.getElementById("reg-avatar-preview");
  if (selectVal === "google") {
    preview.src = currentUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
  } else {
    preview.src = selectVal;
  }
});
