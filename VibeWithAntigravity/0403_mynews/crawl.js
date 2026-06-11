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
 * HTML 특수문자 디코딩
 */
function decodeHtmlEntities(str) {
  return str.replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
}

/**
 * 구글 뉴스 리다이렉트 URL을 원본 언론사 URL로 복원 (batchexecute 프로토콜 사용)
 */
async function getRealUrl(googleUrl) {
  try {
    const response = await fetch(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(4000)
    });
    if (!response.ok) return googleUrl;
    
    const html = await response.text();
    const dataPMatch = html.match(/<c-wiz[^>]*data-p=["']([^"']+)["']/i);
    if (!dataPMatch) return googleUrl;
    
    const rawDataP = decodeHtmlEntities(dataPMatch[1]);
    const obj = JSON.parse(rawDataP.replace('%.@.', '["garturlreq",'));
    const requestArr = [...obj.slice(0, -6), ...obj.slice(-2)];
    
    const payload = new URLSearchParams({
      'f.req': JSON.stringify([[["Fbv4je", JSON.stringify(requestArr), 'null', 'generic']]])
    });
    
    const postResponse = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: payload.toString(),
      signal: AbortSignal.timeout(4000)
    });
    
    if (!postResponse.ok) return googleUrl;
    
    const postText = await postResponse.text();
    const cleanJsonText = postText.replace(/^\)\]\}'\n/, "");
    const resArray = JSON.parse(cleanJsonText);
    const arrayString = resArray[0][2];
    return JSON.parse(arrayString)[1] || googleUrl;
  } catch (e) {
    return googleUrl;
  }
}

/**
 * 원본 기사 URL을 조회하여 og:image 및 og:description 크롤링
 */
async function fetchOgData(realUrl) {
  if (!realUrl || realUrl.includes('google.com')) {
    return { image: null, description: null };
  }
  
  try {
    const response = await fetch(realUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(4000)
    });
    if (!response.ok) return { image: null, description: null };
    
    const html = await response.text();
    
    // og:image 파싱
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || 
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    const image = ogImageMatch ? ogImageMatch[1] : null;
    
    // og:description 파싱
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i) ||
                        html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    let description = ogDescMatch ? decodeHtmlEntities(ogDescMatch[1]).trim() : null;

    // 너무 긴 설명글은 120자 제한 처리
    if (description && description.length > 120) {
      description = description.slice(0, 120) + "...";
    }
    
    return { image, description };
  } catch (e) {
    return { image: null, description: null };
  }
}

/**
 * 크롤러 메인 실행 함수
 */
const PREDEFINED_CATEGORIES = ['정치', '경제', '사회', 'IT/과학', '스포츠', '연예', '세계', '게임'];

async function runCrawler() {
  console.log(`\n==========================================`);
  console.log(`[Crawler] 뉴스 및 이미지 크롤링 작업을 시작합니다.`);
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

    // 2. 키워드별 Google 뉴스 RSS 크롤링 및 이미지 추출
    for (const keyword of keywords) {
      if (!keyword || typeof keyword !== 'string') continue;
      
      console.log(`\n[Crawler] "${keyword}" 카테고리 뉴스 분석 중...`);
      const encodedKeyword = encodeURIComponent(keyword);
      const rssUrl = `https://news.google.com/rss/search?q=${encodedKeyword}&hl=ko&gl=KR&ceid=KR:ko`;

      try {
        const feed = await parser.parseURL(rssUrl);
        console.log(`[Crawler] Google RSS 수집 성공: ${feed.items.length}개 검색됨.`);

        // 상위 12개 뉴스만 정밀 분석 (속도 및 성능 최적화)
        const topArticles = feed.items.slice(0, 12);
        
        console.log(`[Crawler] 상위 12개 기사에 대한 원본 미디어 복원 및 이미지 추출 시작...`);

        // 병렬 처리를 위한 동시 실행 수 제한 (5개씩 배치 처리)
        const batchSize = 4;
        let saveCount = 0;

        for (let i = 0; i < topArticles.length; i += batchSize) {
          const batch = topArticles.slice(i, i + batchSize);
          
          await Promise.all(batch.map(async (item) => {
            if (!item.title || !item.link) return;
            
            try {
              // 1. 원본 언론사 URL 디코딩
              const realUrl = await getRealUrl(item.link);
              
              // 2. 원본 기사의 og 이미지 및 요약 설명 수집
              const { image, description } = await fetchOgData(realUrl);
              
              const articleId = generateArticleId(item.link);
              const sourceName = item.source && typeof item.source === 'object' ? item.source._ : (item.source || 'Google 뉴스');

              const article = {
                title: item.title,
                link: realUrl, // 구글뉴스 경유 대신 원본 URL 바로연결
                pubDate: item.pubDate,
                source: sourceName,
                timestamp: new Date(item.pubDate).getTime() || Date.now(),
                crawledAt: Date.now(),
                image: image,
                description: description
              };

              const escapedKeyword = sanitizeKey(keyword);
              await firebaseRequest(`news/${escapedKeyword}/${articleId}`, 'PUT', article);
              saveCount++;
              console.log(`[Crawler] 완료: [${sourceName}] ${item.title.slice(0, 20)}... (이미지: ${image ? 'O' : 'X'})`);
            } catch (err) {
              console.error(`[Crawler] 개별 기사 처리 실패:`, err.message);
            }
          }));
        }

        console.log(`[Crawler] "${keyword}" 카테고리 기사 ${saveCount}개 분석 및 저장 완료.`);
      } catch (err) {
        console.error(`[Crawler] "${keyword}" 크롤링 중 오류 발생:`, err.message);
      }
    }

    // 3. 마지막 동기화 일시 기록
    await firebaseRequest('config/crawledAt', 'PUT', Date.now());
    console.log(`\n==========================================`);
    console.log(`[Crawler] 모든 뉴스 및 이미지 크롤링 완료!`);
    console.log(`==========================================\n`);

  } catch (error) {
    console.error(`[Crawler] 크롤링 도중 치명적인 오류가 발생했습니다:`, error.message);
  }
}

runCrawler();
