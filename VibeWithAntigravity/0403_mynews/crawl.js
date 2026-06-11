import Parser from 'rss-parser';
import fs from 'fs';
import path from 'path';

const parser = new Parser();

// 기본 Firebase Realtime Database URL
const defaultDatabaseURL = "https://chatsample-378492-default-rtdb.firebaseio.com/";

// 로컬 환경 설정 파일(firebase-config.json)이 있으면 읽어오고, 없으면 기본값 사용
let databaseURL = defaultDatabaseURL;
try {
  const configPath = path.resolve('firebase-config.json');
  if (fs.existsSync(configPath)) {
    const localConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (localConfig.databaseURL) {
      databaseURL = localConfig.databaseURL;
      console.log(`[Crawler] 로컬 설정 파일에서 Database URL을 로드했습니다: ${databaseURL}`);
    }
  }
} catch (e) {
  console.log("[Crawler] 로컬 설정 파일을 읽는 중 오류 발생, 기본 URL을 사용합니다.");
}

// URL 끝에 '/' 추가 처리
if (!databaseURL.endsWith('/')) {
  databaseURL += '/';
}

/**
 * Firebase Realtime Database REST API 호출 헬퍼
 */
async function firebaseRequest(endpoint, method = 'GET', data = null) {
  const url = `${databaseURL}${endpoint}.json`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  if (data !== null) {
    options.body = JSON.stringify(data);
  }
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Firebase REST API 에러 (${res.status}): ${res.statusText}`);
  }
  return res.json();
}

/**
 * Firebase 키 이름으로 사용할 수 없는 문자열 치환
 */
function sanitizeKey(key) {
  return key.replace(/[\.\#\$\[\]\/]/g, '_');
}

/**
 * 기사 고유 링크(URL)를 바탕으로 중복 방지용 고유 ID 생성
 */
function generateArticleId(link) {
  let hash = 0;
  for (let i = 0; i < link.length; i++) {
    hash = (hash << 5) - hash + link.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return 'art_' + Math.abs(hash);
}

/**
 * 크롤러 메인 실행 함수
 */
const PREDEFINED_CATEGORIES = ['정치', '경제', '사회', 'IT/과학', '스포츠', '연예', '세계', '게임'];

async function runCrawler() {
  console.log(`\n==========================================`);
  console.log(`[Crawler] 뉴스 크롤링 작업을 시작합니다.`);
  console.log(`[Crawler] 타겟 DB: ${databaseURL}`);
  console.log(`==========================================`);

  try {
    // 1. 등록된 관심 카테고리 가져오기
    let keywordsObj = await firebaseRequest('keywords');
    let keywords = [];
    
    if (keywordsObj) {
      if (typeof keywordsObj === 'object') {
        keywords = Object.values(keywordsObj).filter(v => typeof v === 'string' && PREDEFINED_CATEGORIES.includes(v));
      } else if (Array.isArray(keywordsObj)) {
        keywords = keywordsObj.filter(k => typeof k === 'string' && PREDEFINED_CATEGORIES.includes(k));
      }
      console.log(`[Crawler] DB에서 구독 중인 카테고리 ${keywords.length}개를 가져왔습니다: ${keywords.join(', ')}`);
    } else {
      console.log(`[Crawler] DB에 구독 카테고리가 없습니다. 기본 카테고리로 초기화합니다...`);
      const defaultCategories = ['정치', '경제', 'IT/과학'];
      
      for (const cat of defaultCategories) {
        const sanitized = sanitizeKey(cat);
        await firebaseRequest(`keywords/${sanitized}`, 'PUT', cat);
      }
      keywords = defaultCategories;
      console.log(`[Crawler] 기본 카테고리 등록 완료: ${keywords.join(', ')}`);
    }

    // 2. 키워드별 Google 뉴스 RSS 크롤링
    for (const keyword of keywords) {
      if (!keyword || typeof keyword !== 'string') continue;
      
      console.log(`\n[Crawler] "${keyword}" 키워드 크롤링 중...`);
      const encodedKeyword = encodeURIComponent(keyword);
      const rssUrl = `https://news.google.com/rss/search?q=${encodedKeyword}&hl=ko&gl=KR&ceid=KR:ko`;

      try {
        const feed = await parser.parseURL(rssUrl);
        console.log(`[Crawler] Google RSS 수신 완료: 총 ${feed.items.length}개의 기사 검색됨.`);

        const topArticles = feed.items.slice(0, 20);
        let saveCount = 0;

        for (const item of topArticles) {
          if (!item.title || !item.link) continue;
          
          const articleId = generateArticleId(item.link);
          const sourceName = item.source && typeof item.source === 'object' ? item.source._ : (item.source || 'Google 뉴스');

          const article = {
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            source: sourceName,
            timestamp: new Date(item.pubDate).getTime() || Date.now(),
            crawledAt: Date.now()
          };

          const escapedKeyword = sanitizeKey(keyword);
          await firebaseRequest(`news/${escapedKeyword}/${articleId}`, 'PUT', article);
          saveCount++;
        }
        console.log(`[Crawler] "${keyword}" 관련 기사 ${saveCount}개 저장 완료.`);
      } catch (err) {
        console.error(`[Crawler] "${keyword}" 크롤링 중 오류 발생:`, err.message);
      }
    }

    // 3. 마지막 동기화 일시 기록
    await firebaseRequest('config/crawledAt', 'PUT', Date.now());
    console.log(`\n==========================================`);
    console.log(`[Crawler] 모든 뉴스 크롤링 완료!`);
    console.log(`==========================================\n`);

  } catch (error) {
    console.error(`[Crawler] 크롤링 도중 치명적인 오류가 발생했습니다:`, error.message);
  }
}

runCrawler();
