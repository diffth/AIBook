import React, { useState, useEffect } from "react";
import Parser from "rss-parser";
import {
  database,
  isFirebaseInitialized,
  firebaseConfig,
  ref,
  set,
  get,
  remove,
  onValue,
  off
} from "./firebase";
import Sidebar from "./components/Sidebar";
import TabList from "./components/TabList";
import NewsGrid from "./components/NewsGrid";
import ConfigModal from "./components/ConfigModal";
import { PREDEFINED_CATEGORIES } from "./components/CategorySelector";

/**
 * MyNews 애플리케이션의 핵심 메인 상태(State) 컨트롤러 및 레이아웃 루트 컴포넌트
 * 
 * 주요 상태:
 * - selectedCategories: 사용자가 체크하여 구독 등록한 관심 주제 목록
 * - categoryOrder: Firebase에 보존되고 있는 탭 배열 순서 정보
 * - activeTab: 현재 뉴스 영역에서 보여줄 카테고리 필터 명칭 (null일 시 전체 피드)
 * - news: Firebase Realtime Database로부터 실시간 동기화되는 기사 목록
 * - bookmarks: 사용자가 나중에 읽기로 보관한 뉴스 카드 목록
 */
export default function App() {
  // 상태 선언
  const [selectedCategories, setSelectedCategories] = useState([]); // 구독 중인 카테고리 목록
  const [categoryOrder, setCategoryOrder] = useState([]); // DB에 기록된 탭 순서
  const [activeTab, setActiveTab] = useState(null); // null 이면 '전체 피드'
  const [news, setNews] = useState({});
  const [bookmarks, setBookmarks] = useState({});
  const [currentTab, setCurrentTab] = useState("feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawledAt, setCrawledAt] = useState(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // 토스트 피드백
  const [toast, setToast] = useState({ show: false, message: "" });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: "" });
    }, 3000);
  };

  // 1. Firebase 미설정 시 자동 모달 오픈
  useEffect(() => {
    if (!isFirebaseInitialized) {
      showToast("Firebase 연결 설정이 필요합니다.");
      setIsConfigOpen(true);
    }
  }, []);

  // 2. 카테고리 구독 상태(/keywords) 실시간 바인딩
  useEffect(() => {
    if (!isFirebaseInitialized) return;
    const keywordsRef = ref(database, "keywords");
    const unsubscribe = onValue(keywordsRef, (snapshot) => {
      const data = snapshot.val() || {};
      let list = [];
      if (typeof data === "object") {
        list = Object.values(data).filter((v) => typeof v === "string" && PREDEFINED_CATEGORIES.includes(v));
      } else if (Array.isArray(data)) {
        list = data.filter((item) => typeof item === "string" && PREDEFINED_CATEGORIES.includes(item));
      }
      setSelectedCategories(list);
    });
    return () => unsubscribe();
  }, []);

  // 3. 탭 순서(/categoryOrder) 실시간 바인딩
  useEffect(() => {
    if (!isFirebaseInitialized) return;
    const orderRef = ref(database, "categoryOrder");
    const unsubscribe = onValue(orderRef, (snapshot) => {
      setCategoryOrder(snapshot.val() || []);
    });
    return () => unsubscribe();
  }, []);

  // 4. 북마크 목록 바인딩
  useEffect(() => {
    if (!isFirebaseInitialized) return;
    const bookmarksRef = ref(database, "bookmarks");
    const unsubscribe = onValue(bookmarksRef, (snapshot) => {
      setBookmarks(snapshot.val() || {});
    });
    return () => unsubscribe();
  }, []);

  // 5. 최근 동기화 시각 바인딩
  useEffect(() => {
    if (!isFirebaseInitialized) return;
    const crawledAtRef = ref(database, "config/crawledAt");
    const unsubscribe = onValue(crawledAtRef, (snapshot) => {
      setCrawledAt(snapshot.val());
    });
    return () => unsubscribe();
  }, []);

  // 6. 구독 중인 카테고리가 변하면 개별 뉴스 리스너 동적 연결
  useEffect(() => {
    if (!isFirebaseInitialized || selectedCategories.length === 0) {
      setNews({});
      return;
    }

    const activeSubscriptions = [];

    selectedCategories.forEach((cat) => {
      const sanitized = cat.replace(/[\.\#\$\[\]\/]/g, "_");
      const newsRef = ref(database, `news/${sanitized}`);
      
      const callback = onValue(newsRef, (snapshot) => {
        setNews((prev) => ({
          ...prev,
          [cat]: snapshot.val() || {}
        }));
      });

      activeSubscriptions.push({ refObj: newsRef, callback });
    });

    return () => {
      activeSubscriptions.forEach(({ refObj, callback }) => {
        off(refObj, "value", callback);
      });
    };
  }, [selectedCategories]);

  // 7. 구독 리스트와 탭 배치 순서 자동 동기화 (구독 추가/취소 반영)
  useEffect(() => {
    if (!isFirebaseInitialized) return;
    
    // 현재 구독 상태인 카테고리만 정렬 순서에서 선별
    const ordered = categoryOrder.filter((cat) => selectedCategories.includes(cat));
    // 정렬 순서 목록에 누락된 새로운 구독 카테고리는 맨 뒤에 배치
    const missing = selectedCategories.filter((cat) => !categoryOrder.includes(cat));
    const syncedOrder = [...ordered, ...missing];

    // 현재 저장된 순서 조합과 달라졌다면 DB 업데이트
    if (JSON.stringify(syncedOrder) !== JSON.stringify(categoryOrder)) {
      set(ref(database, "categoryOrder"), syncedOrder);
    }
  }, [selectedCategories, categoryOrder]);

  // 카테고리 체크박스 토글 처리
  const handleToggleCategory = (category) => {
    const isSubscribed = selectedCategories.includes(category);
    const sanitized = category.replace(/[\.\#\$\[\]\/]/g, "_");
    const categoryRef = ref(database, `keywords/${sanitized}`);

    if (isSubscribed) {
      // 구독 해제
      remove(categoryRef)
        .then(() => {
          showToast(`"${category}" 카테고리 구독을 해제했습니다.`);
          if (activeTab === category) {
            setActiveTab(null);
          }
        })
        .catch((err) => console.error(err));
    } else {
      // 구독 추가
      set(categoryRef, category)
        .then(() => {
          showToast(`"${category}" 카테고리를 구독했습니다.`);
          // 추가 즉시 브라우저에서 동기화 호출
          crawlKeywordClient(category);
        })
        .catch((err) => console.error(err));
    }
  };

  // 탭 순서 재정렬 처리 (드래그앤드롭 콜백)
  const handleReorderTabs = (dragIndex, dropIndex) => {
    const newOrder = [...finalOrderedTabs];
    const [draggedItem] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);
    
    set(ref(database, "categoryOrder"), newOrder)
      .then(() => showToast("탭 표시 순서가 변경되었습니다."))
      .catch((err) => console.error(err));
  };

  // 북마크 토글 처리
  const handleBookmarkToggle = (article) => {
    const isBookmarked = !!bookmarks[article.id];
    const bookmarkRef = ref(database, `bookmarks/${article.id}`);

    if (isBookmarked) {
      remove(bookmarkRef)
        .then(() => showToast("북마크가 해제되었습니다."))
        .catch((err) => console.error(err));
    } else {
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
  };

  // 개별 카테고리 기사 스크랩 (CORS 프록시 & rss-parser)
  const crawlKeywordClient = async (category) => {
    console.log(`[Client Scraper] Scrapping "${category}"...`);
    const encoded = encodeURIComponent(category);
    const targetUrl = `https://news.google.com/rss/search?q=${encoded}&hl=ko&gl=KR&ceid=KR:ko`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

    try {
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error("CORS Proxy Network Response Error");
      
      const xml = await res.text();
      const parser = new Parser();
      const feed = await parser.parseString(xml);
      
      const topItems = (feed.items || []).slice(0, 20);
      const sanitized = category.replace(/[\.\#\$\[\]\/]/g, "_");

      for (const item of topItems) {
        if (!item.title || !item.link) continue;

        let hash = 0;
        for (let i = 0; i < item.link.length; i++) {
          hash = (hash << 5) - hash + item.link.charCodeAt(i);
          hash |= 0;
        }
        const articleId = "art_" + Math.abs(hash);
        
        const sourceName = item.source && typeof item.source === "object" ? item.source.text : (item.source || "Google 뉴스");

        const article = {
          title: item.title,
          link: item.link,
          pubDate: item.pubDate || "",
          source: sourceName,
          timestamp: new Date(item.pubDate).getTime() || Date.now(),
          crawledAt: Date.now()
        };

        await set(ref(database, `news/${sanitized}/${articleId}`), article);
      }
    } catch (e) {
      console.error(`Error scraping "${category}":`, e);
    }
  };

  // 전체 선택 카테고리 수동 크롤링
  const handleManualSync = async () => {
    if (selectedCategories.length === 0) {
      showToast("구독 중인 카테고리가 없습니다.");
      return;
    }
    if (isCrawling) return;

    setIsCrawling(true);
    showToast("뉴스 동기화를 진행 중입니다...");

    let successCount = 0;
    for (const cat of selectedCategories) {
      try {
        await crawlKeywordClient(cat);
        successCount++;
      } catch (err) {
        console.error(err);
      }
    }

    const now = Date.now();
    await set(ref(database, "config/crawledAt"), now);

    setIsCrawling(false);
    showToast(`${successCount}개 카테고리 뉴스 동기화 완료!`);
  };

  // 설정 모달 저장
  const handleConfigSave = (formValues) => {
    localStorage.setItem("firebase_news_config", JSON.stringify(formValues));
    alert("설정이 저장되었습니다. 페이지를 새로고침하여 적용합니다.");
    window.location.reload();
  };

  // 설정 모달 초기화
  const handleConfigReset = () => {
    if (confirm("Firebase 설정을 기본값으로 리셋하시겠습니까?")) {
      localStorage.removeItem("firebase_news_config");
      alert("설정이 초기화되었습니다. 새로고침합니다.");
      window.location.reload();
    }
  };

  // 현재 구독 정보와 DB 순서 배열을 병합 정렬하여 최종 화면에 노출될 탭 목록 산출
  const orderedTabs = categoryOrder.filter((cat) => selectedCategories.includes(cat));
  const missingFromOrder = selectedCategories.filter((cat) => !categoryOrder.includes(cat));
  const finalOrderedTabs = [...orderedTabs, ...missingFromOrder];

  // 뉴스 기사 필터링 가공
  let filteredArticles = [];
  if (currentTab === "feed") {
    if (activeTab) {
      // 선택한 카테고리 뉴스 피드만 필터
      const keywordNews = news[activeTab] || {};
      filteredArticles = Object.entries(keywordNews).map(([id, val]) => ({
        id,
        keyword: activeTab,
        ...val
      }));
    } else {
      // 전체 피드 (모든 구독 카테고리 취합)
      finalOrderedTabs.forEach((cat) => {
        const keywordNews = news[cat] || {};
        Object.entries(keywordNews).forEach(([id, val]) => {
          if (!filteredArticles.some((a) => a.id === id)) {
            filteredArticles.push({
              id,
              keyword: cat,
              ...val
            });
          }
        });
      });
    }
  } else {
    // 북마크 탭
    filteredArticles = Object.entries(bookmarks).map(([id, val]) => ({
      id,
      ...val
    }));
  }

  // 검색 필터링
  if (searchQuery) {
    filteredArticles = filteredArticles.filter((art) => 
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.source && art.source.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (art.keyword && art.keyword.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }

  // 최신 기사순 정렬
  filteredArticles.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const getCrawledTimeLabel = () => {
    if (isCrawling) return "뉴스 크롤링 진행 중...";
    if (crawledAt) {
      const d = new Date(crawledAt);
      return `최근 동기화: ${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
    }
    return "최근 동기화: 기록 없음 (수동 동기화 필요)";
  };

  return (
    <div className="app-container">
      {/* 1. 사이드바 */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setActiveTab(null);
        }}
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggleCategory}
        onOpenConfig={() => setIsConfigOpen(true)}
      />

      {/* 2. 메인 컨텐츠 */}
      <main className="main-content">
        <header className="app-header">
          <div className="header-title-area">
            <h1>{currentTab === "feed" ? "Daily News Feed" : "Bookmarked Articles"}</h1>
            <p>
              {currentTab === "feed" 
                ? "관심 카테고리를 선택하고 드래그하여 순서를 커스텀 배치해보세요." 
                : "나중에 읽기 위해 보관한 기사 목록입니다."}
            </p>
          </div>
          
          <div className="header-actions">
            <div className="search-box">
              <i className="ri-search-line"></i>
              <input 
                type="text" 
                placeholder="기사 제목 또는 언론사 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <button 
              className="btn-primary" 
              onClick={handleManualSync}
              disabled={isCrawling || !isFirebaseInitialized}
            >
              <i className="ri-refresh-line"></i>
              뉴스 동기화
            </button>
          </div>
        </header>

        {/* 탭 리스트 (Drag & Drop 지원) */}
        {currentTab === "feed" && (
          <TabList
            tabs={finalOrderedTabs}
            activeTab={activeTab}
            onTabSelect={setActiveTab}
            onReorderTabs={handleReorderTabs}
          />
        )}

        {/* 상태 패널 */}
        <section className="status-bar">
          <div className="status-info">
            <div className="status-item">
              <span className={`status-indicator ${isCrawling ? "loading" : ""}`}></span>
              <span>{getCrawledTimeLabel()}</span>
            </div>
            <div className="status-item">
              <i className="ri-list-check-2"></i>
              <span>조회된 뉴스 개수: </span>
              <span className="highlight">총 {filteredArticles.length}개</span>
            </div>
          </div>
          <div className="status-meta">
            <span>Google News RSS 기반</span>
          </div>
        </section>

        {/* 뉴스 그리드 */}
        <NewsGrid
          articles={filteredArticles}
          bookmarks={bookmarks}
          onBookmarkToggle={handleBookmarkToggle}
          currentTab={currentTab}
        />
      </main>

      {/* Firebase 연동 모달 */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        currentConfig={firebaseConfig}
        onSave={handleConfigSave}
        onReset={handleConfigReset}
      />

      {/* 토스트 알림 */}
      <div className={`toast ${toast.show ? "show" : ""}`}>
        <i className="ri-information-line"></i>
        <span>{toast.message}</span>
      </div>
    </div>
  );
}
