import {
  database,
  isFirebaseInitialized,
  firebaseConfig,
  ref,
  set,
  get,
  push,
  remove,
  onValue,
  off,
  update
} from "./firebase-config.js";

// 애플리케이션 상태 관리
const state = {
  keywords: [],
  selectedKeyword: null, // null 이면 '전체 피드'
  news: {}, // { "인공지능": { "id": articleObj, ... }, ... }
  bookmarks: {}, // { "id": articleObj, ... }
  currentTab: "feed", // "feed" 또는 "bookmarks"
  searchQuery: "",
  isCrawling: false
};

// UI 요소 셀렉터
const UI = {
  keywordInput: document.getElementById("keyword-input"),
  btnAddKeyword: document.getElementById("btn-add-keyword"),
  keywordList: document.getElementById("keyword-list"),
  newsGrid: document.getElementById("news-grid"),
  btnSync: document.getElementById("btn-sync"),
  searchBar: document.getElementById("search-bar"),
  crawledTimeText: document.getElementById("crawled-time"),
  statusIndicator: document.getElementById("status-indicator"),
  articleCountText: document.getElementById("article-count"),
  
  // 탭 네비게이션
  tabFeed: document.getElementById("tab-feed"),
  tabBookmarks: document.getElementById("tab-bookmarks"),
  tabConfig: document.getElementById("tab-config"),
  
  // 모달 UI
  configModal: document.getElementById("config-modal"),
  modalClose: document.getElementById("modal-close"),
  btnSaveConfig: document.getElementById("btn-save-config"),
  btnResetConfig: document.getElementById("btn-reset-config"),
  
  // 모달 입력 폼
  inputApiKey: document.getElementById("cfg-api-key"),
  inputAuthDomain: document.getElementById("cfg-auth-domain"),
  inputDbUrl: document.getElementById("cfg-db-url"),
  inputProjectId: document.getElementById("cfg-project-id"),
  inputStorageBucket: document.getElementById("cfg-storage-bucket"),
  inputSenderId: document.getElementById("cfg-sender-id"),
  inputAppId: document.getElementById("cfg-app-id"),
  
  // 토스트
  toast: document.getElementById("toast"),
  toastMessage: document.getElementById("toast-message")
};

// 초기 설정
document.addEventListener("DOMContentLoaded", () => {
  if (!isFirebaseInitialized) {
    showToast("Firebase 연결 설정이 필요합니다.");
    openConfigModal();
    updateLoadingState(false, "연결 대기중");
    return;
  }
  
  initEventListeners();
  bindFirebaseData();
});

/**
 * 토스트 메시지 출력
 */
function showToast(message) {
  UI.toastMessage.textContent = message;
  UI.toast.classList.add("show");
  setTimeout(() => {
    UI.toast.classList.remove("show");
  }, 3000);
}

/**
 * 로딩 인디케이터 및 텍스트 갱신
 */
function updateLoadingState(isLoading, message = "") {
  if (isLoading) {
    UI.statusIndicator.classList.add("loading");
    UI.btnSync.disabled = true;
    UI.btnSync.innerHTML = `<i class="loader" style="width:14px;height:14px;margin:0;border-width:2px;"></i> 크롤링 중...`;
  } else {
    UI.statusIndicator.classList.remove("loading");
    UI.btnSync.disabled = false;
    UI.btnSync.innerHTML = `<i class="ri-refresh-line"></i> 뉴스 동기화`;
  }
  if (message) {
    UI.crawledTimeText.textContent = message;
  }
}

/**
 * 이벤트 리스너 바인딩
 */
function initEventListeners() {
  // 키워드 등록
  UI.btnAddKeyword.addEventListener("click", addKeywordFromInput);
  UI.keywordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addKeywordFromInput();
  });
  
  // 전체 뉴스 동기화 버튼
  UI.btnSync.addEventListener("click", handleManualCrawl);
  
  // 검색어 입력 필터링
  UI.searchBar.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderNews();
  });
  
  // 탭 네비게이션
  UI.tabFeed.addEventListener("click", () => switchTab("feed"));
  UI.tabBookmarks.addEventListener("click", () => switchTab("bookmarks"));
  UI.tabConfig.addEventListener("click", openConfigModal);
  
  // 설정 모달 닫기
  UI.modalClose.addEventListener("click", closeConfigModal);
  UI.configModal.addEventListener("click", (e) => {
    if (e.target === UI.configModal) closeConfigModal();
  });
  
  // 설정 저장 및 리셋
  UI.btnSaveConfig.addEventListener("click", saveFirebaseConfig);
  UI.btnResetConfig.addEventListener("click", resetFirebaseConfig);
}

/**
 * Firebase Realtime Database 바인딩 및 실시간 리스너 작동
 */
function bindFirebaseData() {
  // 1. 키워드 목록 리스너
  const keywordsRef = ref(database, "keywords");
  onValue(keywordsRef, (snapshot) => {
    const data = snapshot.val();
    state.keywords = [];
    
    if (data) {
      if (typeof data === "object") {
        state.keywords = Object.entries(data).map(([key, val]) => ({ key, value: val }));
      }
    }
    
    renderKeywords();
    
    // 키워드가 생기면 뉴스 리스너 동적 연결
    bindNewsData();
  });

  // 2. 북마크 목록 리스너
  const bookmarksRef = ref(database, "bookmarks");
  onValue(bookmarksRef, (snapshot) => {
    state.bookmarks = snapshot.val() || {};
    if (state.currentTab === "bookmarks") {
      renderNews();
    }
  });

  // 3. 마지막 동기화 일시 리스너
  const crawledAtRef = ref(database, "config/crawledAt");
  onValue(crawledAtRef, (snapshot) => {
    const val = snapshot.val();
    if (val) {
      const date = new Date(val);
      UI.crawledTimeText.textContent = `최근 동기화: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    } else {
      UI.crawledTimeText.textContent = "최근 동기화: 기록 없음 (수동 동기화 필요)";
    }
  });
}

/**
 * 등록된 모든 키워드에 대해 뉴스 기사 실시간 리스너 연결
 */
let activeNewsRefs = [];
function bindNewsData() {
  // 이전 리스너들 해제
  activeNewsRefs.forEach(({ refObj, callback }) => off(refObj, "value", callback));
  activeNewsRefs = [];
  state.news = {};

  if (state.keywords.length === 0) {
    renderNews();
    return;
  }

  state.keywords.forEach(({ value }) => {
    const sanitized = sanitizeKey(value);
    const newsRef = ref(database, `news/${sanitized}`);
    
    const callback = (snapshot) => {
      state.news[value] = snapshot.val() || {};
      renderNews();
    };
    
    onValue(newsRef, callback);
    activeNewsRefs.push({ refObj: newsRef, callback });
  });
}

/**
 * Firebase 안전한 키 이름으로 치환
 */
function sanitizeKey(key) {
  return key.replace(/[\.\#\$\[\]\/]/g, "_");
}

/**
 * 기사 중복 방지용 고유 ID 생성 (URL 기반 해싱)
 */
function generateArticleId(link) {
  let hash = 0;
  for (let i = 0; i < link.length; i++) {
    hash = (hash << 5) - hash + link.charCodeAt(i);
    hash |= 0;
  }
  return "art_" + Math.abs(hash);
}

/**
 * 키워드 리스트 UI 렌더링
 */
function renderKeywords() {
  UI.keywordList.innerHTML = "";
  
  // '전체 피드' 칩 추가
  const allChip = document.createElement("div");
  allChip.className = `keyword-chip ${state.selectedKeyword === null ? "selected" : ""}`;
  allChip.innerHTML = `<span>전체 피드</span>`;
  allChip.addEventListener("click", () => selectKeyword(null));
  UI.keywordList.appendChild(allChip);

  state.keywords.forEach(({ key, value }) => {
    const chip = document.createElement("div");
    chip.className = `keyword-chip ${state.selectedKeyword === value ? "selected" : ""}`;
    
    const label = document.createElement("span");
    label.textContent = `#${value}`;
    label.addEventListener("click", () => selectKeyword(value));
    
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.innerHTML = `<i class="ri-close-line"></i>`;
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteKeyword(key, value);
    });

    chip.appendChild(label);
    chip.appendChild(removeBtn);
    UI.keywordList.appendChild(chip);
  });
}

/**
 * 키워드 선택 필터 적용
 */
function selectKeyword(keyword) {
  state.selectedKeyword = keyword;
  renderKeywords();
  renderNews();
}

/**
 * 키워드 추가
 */
function addKeywordFromInput() {
  const value = UI.keywordInput.value.trim();
  if (!value) return;
  
  if (state.keywords.some(kw => kw.value.toLowerCase() === value.toLowerCase())) {
    showToast("이미 등록된 키워드입니다.");
    return;
  }
  
  const keywordsRef = ref(database, "keywords");
  push(keywordsRef, value)
    .then(() => {
      UI.keywordInput.value = "";
      showToast(`"${value}" 키워드가 추가되었습니다.`);
      // 새로 추가된 키워드는 즉시 크롤링 시도
      crawlKeywordClientSide(value);
    })
    .catch((err) => {
      console.error(err);
      showToast("키워드 추가 실패");
    });
}

/**
 * 키워드 삭제
 */
function deleteKeyword(key, value) {
  if (confirm(`"${value}" 키워드를 삭제하시겠습니까? 관련 기사 데이터는 보존됩니다.`)) {
    const keywordRef = ref(database, `keywords/${key}`);
    remove(keywordRef)
      .then(() => {
        if (state.selectedKeyword === value) {
          state.selectedKeyword = null;
        }
        showToast(`"${value}" 키워드가 삭제되었습니다.`);
      })
      .catch((err) => {
        console.error(err);
        showToast("키워드 삭제 실패");
      });
  }
}

/**
 * 탭 스위칭 (뉴스피드 <-> 북마크)
 */
function switchTab(tab) {
  state.currentTab = tab;
  
  if (tab === "feed") {
    UI.tabFeed.classList.add("active");
    UI.tabBookmarks.classList.remove("active");
    document.querySelector(".header-title-area h1").textContent = "Daily News Feed";
    document.querySelector(".header-title-area p").textContent = "관심 주제의 뉴스 기사를 매일 만나보세요.";
    UI.keywordList.style.display = "flex";
  } else if (tab === "bookmarks") {
    UI.tabFeed.classList.remove("active");
    UI.tabBookmarks.classList.add("active");
    document.querySelector(".header-title-area h1").textContent = "Bookmarked Articles";
    document.querySelector(".header-title-area p").textContent = "나중에 읽기 위해 보관한 기사 목록입니다.";
    UI.keywordList.style.display = "none";
  }
  renderNews();
}

/**
 * 뉴스 리스트 렌더링
 */
function renderNews() {
  UI.newsGrid.innerHTML = "";
  let articles = [];

  if (state.currentTab === "feed") {
    // 뉴스 피드 탭
    if (state.selectedKeyword) {
      // 특정 키워드 뉴스만 추출
      const keywordNews = state.news[state.selectedKeyword] || {};
      articles = Object.entries(keywordNews).map(([id, val]) => ({
        id,
        keyword: state.selectedKeyword,
        ...val
      }));
    } else {
      // 전체 피드 (모든 키워드 뉴스 병합)
      Object.entries(state.news).forEach(([kw, kwNews]) => {
        Object.entries(kwNews).map(([id, val]) => {
          // 중복 기사 제거 (여러 키워드에 중복되는 기사가 있을 때)
          if (!articles.some(a => a.id === id)) {
            articles.push({
              id,
              keyword: kw,
              ...val
            });
          }
        });
      });
    }
  } else {
    // 북마크 탭
    articles = Object.entries(state.bookmarks).map(([id, val]) => ({
      id,
      ...val
    }));
  }

  // 검색어 필터링
  if (state.searchQuery) {
    articles = articles.filter(art => 
      art.title.toLowerCase().includes(state.searchQuery) ||
      (art.source && art.source.toLowerCase().includes(state.searchQuery)) ||
      (art.keyword && art.keyword.toLowerCase().includes(state.searchQuery))
    );
  }

  // 최신순 정렬 (발행일 타임스탬프 내림차순)
  articles.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  
  // 카운트 표시
  UI.articleCountText.textContent = `총 ${articles.length}개`;

  if (articles.length === 0) {
    renderEmptyState();
    return;
  }

  articles.forEach(art => {
    const isBookmarked = !!state.bookmarks[art.id];
    
    // 날짜 포맷
    let dateStr = "";
    if (art.pubDate) {
      const d = new Date(art.pubDate);
      dateStr = isNaN(d.getTime()) ? art.pubDate : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    }

    const card = document.createElement("div");
    card.className = "news-card";
    card.addEventListener("click", () => {
      window.open(art.link, "_blank");
    });

    card.innerHTML = `
      <div class="card-header">
        <div class="news-card-tags">
          <span class="news-source">${escapeHtml(art.source)}</span>
          ${art.keyword ? `<span class="news-keyword-tag">#${escapeHtml(art.keyword)}</span>` : ""}
        </div>
        <button class="btn-bookmark ${isBookmarked ? "active" : ""}" title="${isBookmarked ? '북마크 해제' : '북마크 추가'}">
          <i class="${isBookmarked ? 'ri-bookmark-fill' : 'ri-bookmark-line'}"></i>
        </button>
      </div>
      <div class="card-body">
        <h3 class="news-title">${escapeHtml(art.title)}</h3>
      </div>
      <div class="card-footer">
        <span class="news-date"><i class="ri-time-line"></i> ${dateStr}</span>
        <span class="view-link">원문 읽기 <i class="ri-arrow-right-up-line"></i></span>
      </div>
    `;

    // 북마크 클릭 이벤트
    const bookmarkBtn = card.querySelector(".btn-bookmark");
    bookmarkBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // 카드 자체 클릭 이벤트(새창열기) 방지
      toggleBookmark(art);
    });

    UI.newsGrid.appendChild(card);
  });
}

/**
 * 기사가 없을 때 빈 화면 렌더링
 */
function renderEmptyState() {
  UI.newsGrid.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon"><i class="ri-newspaper-line"></i></div>
      <h3>표시할 뉴스 기사가 없습니다.</h3>
      <p>
        ${state.currentTab === "feed" 
          ? "좌측 사이드바에 키워드를 추가하고 우측 상단의 '뉴스 동기화'를 눌러 실시간 크롤링을 진행해 보세요." 
          : "보관하고 싶은 기사 카드 우측 상단의 북마크 아이콘을 클릭하여 보관해 보세요."}
      </p>
    </div>
  `;
}

/**
 * 북마크 추가/해제 토글
 */
function toggleBookmark(article) {
  const isBookmarked = !!state.bookmarks[article.id];
  const bookmarkRef = ref(database, `bookmarks/${article.id}`);

  if (isBookmarked) {
    remove(bookmarkRef)
      .then(() => showToast("북마크가 해제되었습니다."))
      .catch((err) => console.error(err));
  } else {
    // 북마크용 데이터 클린업
    const bookmarkData = {
      title: article.title,
      link: article.link,
      pubDate: article.pubDate || "",
      source: article.source || "Google 뉴스",
      timestamp: article.timestamp || Date.now(),
      keyword: article.keyword || ""
    };
    set(bookmarkRef, bookmarkData)
      .then(() => showToast("북마크에 저장되었습니다."))
      .catch((err) => console.error(err));
  }
}

/**
 * HTML 이스케이프 유틸リティ
 */
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * 수동 크롤링 실행 핸들러 (전체 키워드 동기화)
 */
async function handleManualCrawl() {
  if (state.keywords.length === 0) {
    showToast("먼저 키워드를 1개 이상 추가해 주세요.");
    return;
  }
  
  if (state.isCrawling) return;
  
  state.isCrawling = true;
  updateLoadingState(true, "뉴스 크롤링 진행 중...");
  
  let successCount = 0;
  for (const kw of state.keywords) {
    try {
      await crawlKeywordClientSide(kw.value);
      successCount++;
    } catch (e) {
      console.error(`[Manual Crawl] Error fetching keyword "${kw.value}":`, e);
    }
  }

  // 동기화 시각 업데이트
  const now = Date.now();
  await set(ref(database, "config/crawledAt"), now);
  
  state.isCrawling = false;
  updateLoadingState(false);
  showToast(`${successCount}개 주제에 대한 뉴스 동기화 완료!`);
}

/**
 * 클라이언트 사이드에서 CORS 프록시를 이용해 특정 키워드 뉴스 크롤링 수행
 */
async function crawlKeywordClientSide(keyword) {
  console.log(`[Crawl Client] Crawling "${keyword}" via CORS proxy...`);
  const encodedKeyword = encodeURIComponent(keyword);
  const targetRssUrl = `https://news.google.com/rss/search?q=${encodedKeyword}&hl=ko&gl=KR&ceid=KR:ko`;
  
  // allorigins.win의 /raw API 엔드포인트는 대상 리소스를 JSON 래핑 없이 원본 그대로 반환합니다.
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetRssUrl)}`;

  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`CORS 프록시 요청 실패: ${response.status}`);
  }
  
  const xmlText = await response.text();
  
  // DOMParser를 이용해 XML 파싱
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  
  // XML 파싱 에러 검출
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    throw new Error("XML 파싱에 실패했습니다.");
  }
  
  const items = xmlDoc.querySelectorAll("item");
  console.log(`[Crawl Client] "${keyword}" 검색 결과 기사 ${items.length}개 파싱 완료.`);
  
  // 상위 20개 뉴스만 추출
  const topItems = Array.from(items).slice(0, 20);
  
  for (const item of topItems) {
    const title = item.querySelector("title")?.textContent || "";
    const link = item.querySelector("link")?.textContent || "";
    const pubDate = item.querySelector("pubDate")?.textContent || "";
    const sourceNode = item.querySelector("source");
    const source = sourceNode?.textContent || "Google 뉴스";
    
    if (!title || !link) continue;
    
    const articleId = generateArticleId(link);
    const article = {
      title,
      link,
      pubDate,
      source,
      timestamp: new Date(pubDate).getTime() || Date.now(),
      crawledAt: Date.now()
    };
    
    const sanitized = sanitizeKey(keyword);
    // Firebase Database 업로드
    await set(ref(database, `news/${sanitized}/${articleId}`), article);
  }
}

/**
 * 설정 모달 열기
 */
function openConfigModal() {
  UI.inputApiKey.value = firebaseConfig.apiKey || "";
  UI.inputAuthDomain.value = firebaseConfig.authDomain || "";
  UI.inputDbUrl.value = firebaseConfig.databaseURL || "";
  UI.inputProjectId.value = firebaseConfig.projectId || "";
  UI.inputStorageBucket.value = firebaseConfig.storageBucket || "";
  UI.inputSenderId.value = firebaseConfig.messagingSenderId || "";
  UI.inputAppId.value = firebaseConfig.appId || "";
  
  UI.configModal.classList.add("active");
}

/**
 * 설정 모달 닫기
 */
function closeConfigModal() {
  if (!isFirebaseInitialized) {
    alert("Firebase 초기화가 필요합니다. 설정을 완료해 주세요.");
    return;
  }
  UI.configModal.classList.remove("active");
}

/**
 * 설정 저장
 */
function saveFirebaseConfig() {
  const newConfig = {
    apiKey: UI.inputApiKey.value.trim(),
    authDomain: UI.inputAuthDomain.value.trim(),
    databaseURL: UI.inputDbUrl.value.trim(),
    projectId: UI.inputProjectId.value.trim(),
    storageBucket: UI.inputStorageBucket.value.trim(),
    messagingSenderId: UI.inputSenderId.value.trim(),
    appId: UI.inputAppId.value.trim()
  };
  
  if (!newConfig.databaseURL) {
    alert("Database URL은 필수 입력 항목입니다.");
    return;
  }
  
  localStorage.setItem("firebase_news_config", JSON.stringify(newConfig));
  
  // 로컬 크롤러Node.js에서도 읽을 수 있게 파일 형태로 저장 처리 요청을 돕기 위해 
  // json 설정 문자열을 동기화합니다. (로컬 호스트 연동성 극대화)
  alert("설정이 저장되었습니다. 데이터 정합성을 위해 새로고침합니다.");
  window.location.reload();
}

/**
 * 설정 리셋
 */
function resetFirebaseConfig() {
  if (confirm("Firebase 설정을 기본값으로 리셋하시겠습니까?")) {
    localStorage.removeItem("firebase_news_config");
    alert("설정이 리셋되었습니다. 새로고침합니다.");
    window.location.reload();
  }
}
