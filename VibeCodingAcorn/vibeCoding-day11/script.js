/**
 * 📈 NYSE 섹터 동향 & AI 마켓 분석 - script.js
 * FMP API 데이터 집계, Chart.js 시각화, Claude API 연동 요약 로직
 */

// 1. DOM 요소 선택
const keyModal = document.getElementById('key-modal');
const keyForm = document.getElementById('key-form');
const fmpKeyInput = document.getElementById('fmp-key-input');
const claudeKeyInput = document.getElementById('claude-key-input');
const btnSkipModal = document.getElementById('btn-skip-modal');
const btnResetKey = document.getElementById('btn-reset-key');

const dataModeBadge = document.getElementById('data-mode-badge');
const totalMarketCapEl = document.getElementById('total-market-cap');
const overallAvgChangeEl = document.getElementById('overall-avg-change');
const topSectorNameEl = document.getElementById('top-sector-name');
const topSectorChangeEl = document.getElementById('top-sector-change');
const worstSectorNameEl = document.getElementById('worst-sector-name');
const worstSectorChangeEl = document.getElementById('worst-sector-change');

const sectorTableBody = document.getElementById('sector-table-body');
const btnRefreshAi = document.getElementById('btn-refresh-ai');
const aiLoadingEl = document.getElementById('ai-loading');
const aiSummaryTextEl = document.getElementById('ai-summary-text');

// 로컬스토리지 저장 키 명칭
const STORAGE_KEYS = {
  FMP: 'fmp_api_key',
  CLAUDE: 'claude_api_key'
};

let bubbleChart = null;
let currentSectorData = []; // 집계된 섹터 데이터 저장 변수
let isMockMode = true;

// 2. 모의 데이터 (Mock Data) 정의
const MOCK_SECTOR_DATA = [
  { sector: 'Technology', avgChange: 1.85, totalCap: 5200, count: 142 },
  { sector: 'Financials', avgChange: 0.65, totalCap: 3800, count: 215 },
  { sector: 'Healthcare', avgChange: -0.42, totalCap: 3100, count: 168 },
  { sector: 'Consumer Cyclical', avgChange: 1.12, totalCap: 2900, count: 114 },
  { sector: 'Industrials', avgChange: -0.15, totalCap: 2400, count: 130 },
  { sector: 'Consumer Defensive', avgChange: 0.32, totalCap: 1850, count: 82 },
  { sector: 'Energy', avgChange: -1.45, totalCap: 1600, count: 95 },
  { sector: 'Utilities', avgChange: 0.88, totalCap: 1150, count: 58 },
  { sector: 'Real Estate', avgChange: -0.92, totalCap: 980, count: 72 },
  { sector: 'Basic Materials', avgChange: 0.22, totalCap: 850, count: 64 },
  { sector: 'Communication Services', avgChange: 2.34, totalCap: 2100, count: 45 }
];

const MOCK_AI_REPORT = `### 🚀 오늘 주목해야 할 NYSE 섹터 TOP 3 분석 리포트

금일 뉴욕증권거래소(NYSE) 상장 종목들의 동향을 요약 분석한 결과, 아래와 같은 핵심적인 시장 흐름이 포착되었습니다.

---

### 1. 📡 통신 서비스 (Communication Services) - **상승률 1위 (+2.34%)**
- **시장 주도 요인**: 빅테크 기업들의 인프라 수요와 콘텐츠 스트리밍 구독 모델 성장세가 뚜렷합니다. 미디어 거대 공룡 및 소셜 미디어 플랫폼 종목으로의 강력한 자금 유입이 섹터의 상승을 강하게 견인하고 있습니다.
- **투자 시사점**: 시장 심리가 완연히 회복 국면에 접어들면서, 성장 가치와 안정성을 겸비한 대형 기술기반 통신 서비스 업종의 매수세가 한층 더 공고해질 것으로 전망됩니다.

### 2. 💻 정보기술 (Technology) - **시가총액 최대 ($5.20T) & 강세 (+1.85%)**
- **시장 주도 요인**: AI 가속기 칩셋 시장의 견조한 실적 발표와 반도체 장비 수요가 폭발적으로 중첩되며 테크 대형주 위주로 매매가 집중되었습니다. 
- **투자 시사점**: 총 시가총액 **$5.20조**에 달하는 초대형 섹터가 하루 만에 **1.85%** 상승한 것은 기관 투자자들의 포트폴리오 비중 확대 신호로 해석됩니다. 조정 시 분할 매수 기회로 삼을 만합니다.

### 3. ⚡ 유틸리티 (Utilities) - **방어적 강세 (+0.88%)**
- **시장 주도 요인**: 다른 경기 민감주(에너지, 금융 등)가 변동성을 보이는 가운데, 채권 금리 안정화에 발맞춰 배당 매력도가 높은 유틸리티 섹터로 방어적 성격의 헤지(Hedge)성 자금이 유입되었습니다.
- **투자 시사점**: 금리 인하 기대감이 잔존하는 환경에서 테크 섹터의 급등에 피로감을 느낀 자금의 훌륭한 대피처 역할을 톡톡히 하고 있습니다.

---

### 📉 오늘의 위험 관찰 섹터: **에너지 (Energy, -1.45%)**
글로벌 원유 재고 증가 소식과 지정학적 긴장 일시 완화로 인해 국제 유가가 하락세를 그리며 에너지 기업들의 이익 실현 매물이 쏟아졌습니다. 단기 지지선 확인이 필요합니다.`;

// 3. 초기 기동 함수
window.addEventListener('DOMContentLoaded', () => {
  // Lucide 아이콘 초기화
  lucide.createIcons();
  
  // API Key 검사
  const savedFmpKey = localStorage.getItem(STORAGE_KEYS.FMP);
  const savedClaudeKey = localStorage.getItem(STORAGE_KEYS.CLAUDE);
  
  if (savedFmpKey) {
    fmpKeyInput.value = savedFmpKey;
    isMockMode = false;
  }
  if (savedClaudeKey) {
    claudeKeyInput.value = savedClaudeKey;
  }

  if (isMockMode) {
    // 키가 없으면 모달을 띄움
    keyModal.classList.remove('hidden');
    // 모의 데이터 로드
    loadMockMode();
  } else {
    // 키가 있으면 바로 실시간 데이터 조회
    loadLiveMode(savedFmpKey);
  }
});

// 4. 이벤트 리스너 바인딩
keyForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const fmpKey = fmpKeyInput.value.trim();
  const claudeKey = claudeKeyInput.value.trim();

  if (fmpKey) {
    localStorage.setItem(STORAGE_KEYS.FMP, fmpKey);
    isMockMode = false;
  } else {
    localStorage.removeItem(STORAGE_KEYS.FMP);
    isMockMode = true;
  }

  if (claudeKey) {
    localStorage.setItem(STORAGE_KEYS.CLAUDE, claudeKey);
  } else {
    localStorage.removeItem(STORAGE_KEYS.CLAUDE);
  }

  keyModal.classList.add('hidden');

  if (isMockMode) {
    loadMockMode();
  } else {
    loadLiveMode(fmpKey);
  }
});

// 모달 건너뛰기
btnSkipModal.addEventListener('click', () => {
  keyModal.classList.add('hidden');
  isMockMode = true;
  loadMockMode();
});

// 설정 버튼 클릭 시 모달 열기
btnResetKey.addEventListener('click', () => {
  keyModal.classList.remove('hidden');
});

// AI 요약 버튼 클릭
btnRefreshAi.addEventListener('click', () => {
  generateAiSummary();
});

// 5. 모의 데이터 모드 가동
function loadMockMode() {
  isMockMode = true;
  dataModeBadge.textContent = '모의 데이터 모드';
  dataModeBadge.className = 'mode-badge mock-mode';
  
  currentSectorData = [...MOCK_SECTOR_DATA];
  updateDashboard(currentSectorData);
}

// 6. 실시간 데이터 모드 가동
async function loadLiveMode(fmpKey) {
  isMockMode = false;
  dataModeBadge.textContent = '실시간 데이터 모드';
  dataModeBadge.className = 'mode-badge live-mode';
  
  loadingEl = document.createElement('div'); // 임시 로딩창 효과 부여
  
  const cacheKey = 'fmp_sector_data_cache';
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    const age = (Date.now() - parsed.timestamp) / (1000 * 60); // 분 단위
    if (age < 60) {
      console.log('1시간 이내의 로컬 캐시 데이터를 사용합니다.');
      currentSectorData = parsed.sectors;
      updateDashboard(currentSectorData);
      return;
    }
  }

  // 로딩바 띄우기
  document.getElementById('total-market-cap').textContent = '로딩 중...';
  document.getElementById('overall-avg-change').textContent = '로딩 중...';

  try {
    // 1단계: FMP Stock Screener로 NYSE 종목-섹터 매핑 수집 (최대 1000개)
    const screenerUrl = `https://financialmodelingprep.com/api/v3/stock-screener?exchange=NYSE&limit=1000&apikey=${fmpKey}`;
    const screenerResponse = await fetch(screenerUrl);
    if (!screenerResponse.ok) throw new Error('FMP Screener API 호출 실패');
    const screenerData = await screenerResponse.json();

    // 2단계: FMP Quotes API로 NYSE 상장 종목 전체 실시간 가격/변동률/시가총액 수집
    const quotesUrl = `https://financialmodelingprep.com/api/v3/quotes/nyse?apikey=${fmpKey}`;
    const quotesResponse = await fetch(quotesUrl);
    if (!quotesResponse.ok) throw new Error('FMP Quotes API 호출 실패');
    const quotesData = await quotesResponse.json();

    // 3단계: 종목 매핑 조인 및 섹터별 데이터 집계
    const symbolToSectorMap = {};
    screenerData.forEach(item => {
      if (item.symbol && item.sector) {
        symbolToSectorMap[item.symbol] = item.sector;
      }
    });

    const sectorAggregates = {};
    quotesData.forEach(quote => {
      const sector = symbolToSectorMap[quote.symbol];
      // 매칭되는 섹터가 있고 시가총액과 변동률이 올바르게 존재하는 경우에만 집계
      if (sector && quote.marketCap && quote.changesPercentage !== null && quote.changesPercentage !== undefined) {
        if (!sectorAggregates[sector]) {
          sectorAggregates[sector] = {
            sector: sector,
            totalCap: 0,
            sumChange: 0,
            count: 0
          };
        }
        sectorAggregates[sector].totalCap += quote.marketCap;
        sectorAggregates[sector].sumChange += quote.changesPercentage;
        sectorAggregates[sector].count += 1;
      }
    });

    // 배열로 가공 및 시가총액 단위 Trillion/Billion 환산 처리
    const processedSectors = Object.values(sectorAggregates).map(item => {
      return {
        sector: item.sector,
        avgChange: parseFloat((item.sumChange / item.count).toFixed(2)),
        // 달러($) 단위를 시각화 및 계산 편의를 위해 10억 달러($B) 단위로 스케일링
        totalCap: parseFloat((item.totalCap / 1000000000).toFixed(2)),
        count: item.count
      };
    });

    if (processedSectors.length === 0) {
      throw new Error('집계된 섹터 데이터가 없습니다. API Key 한도 초과 또는 NYSE 미영업시간 여부를 확인하세요.');
    }

    currentSectorData = processedSectors;

    // 캐시에 저장
    localStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      sectors: currentSectorData
    }));

    updateDashboard(currentSectorData);

  } catch (error) {
    alert(error.message);
    loadMockMode();
  }
}

// 7. 대시보드 UI 카드 및 테이블 동기화
function updateDashboard(sectorData) {
  // 최고/최악 섹터 식별을 위해 정렬
  const sortedByChange = [...sectorData].sort((a, b) => b.avgChange - a.avgChange);
  
  const topSector = sortedByChange[0];
  const worstSector = sortedByChange[sortedByChange.length - 1];

  // 총 시가총액 계산 ($B 단위 누적액 -> $T 단위 환산)
  const totalBillionCap = sectorData.reduce((acc, cur) => acc + cur.totalCap, 0);
  const totalTrillionCap = (totalBillionCap / 1000).toFixed(2);
  totalMarketCapEl.textContent = `$${totalTrillionCap}T`;

  // 시장 전체 평균 변동률 계산 (종목 수 가중 평균)
  const totalStocks = sectorData.reduce((acc, cur) => acc + cur.count, 0);
  const sumStockChange = sectorData.reduce((acc, cur) => acc + (cur.avgChange * cur.count), 0);
  const overallAvgChange = (sumStockChange / totalStocks).toFixed(2);
  
  overallAvgChangeEl.textContent = `${overallAvgChange}%`;
  overallAvgChangeEl.className = `card-value ${overallAvgChange >= 0 ? 'up-value' : 'down-value'}`;

  // 최고 상승 섹터 매핑
  topSectorNameEl.textContent = translateSectorKR(topSector.sector);
  topSectorChangeEl.textContent = `+${topSector.avgChange}%`;
  topSectorChangeEl.className = 'card-sub-value up-value';

  // 최고 하락 섹터 매핑
  worstSectorNameEl.textContent = translateSectorKR(worstSector.sector);
  worstSectorChangeEl.textContent = `${worstSector.avgChange}%`;
  worstSectorChangeEl.className = 'card-sub-value down-value';

  // 상세 테이블 빌드
  renderTable(sectorData);

  // 버블 차트 빌드
  renderBubbleChart(sectorData);
  
  // AI 요약 안내 문구 리셋
  aiSummaryTextEl.innerHTML = `<p class="ai-placeholder">금융 데이터 로드가 완료되었습니다. 우상단의 '요약 생성' 버튼을 누르면 Claude AI 시장 요약을 시작합니다.</p>`;
}

// 8. 상세 테이블 렌더링
function renderTable(sectorData) {
  sectorTableBody.innerHTML = '';
  // 정렬 순서: 시가총액 내림차순
  const sortedByCap = [...sectorData].sort((a, b) => b.totalCap - a.totalCap);

  sortedByCap.forEach(item => {
    const row = document.createElement('tr');
    const displayCap = item.totalCap >= 1000 
      ? `$${(item.totalCap / 100).toFixed(2)}T` 
      : `$${item.totalCap.toLocaleString()}B`;

    const changeClass = item.avgChange >= 0 ? 'up-value' : 'down-value';
    const changeSign = item.avgChange >= 0 ? '+' : '';

    row.innerHTML = `
      <td class="sector-name">${translateSectorKR(item.sector)} <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-en); font-weight: 400;">(${item.sector})</span></td>
      <td class="text-right num-value ${changeClass}" style="font-weight: 600;">${changeSign}${item.avgChange}%</td>
      <td class="text-right num-value" style="color: #fff; font-weight: 500;">${displayCap}</td>
      <td class="text-center num-value" style="color: var(--text-sub);">${item.count}</td>
    `;
    sectorTableBody.appendChild(row);
  });
}

// 9. Chart.js 버블 차트 렌더링
function renderBubbleChart(sectorData) {
  const ctx = document.getElementById('bubbleChart').getContext('2d');
  
  // 기존 차트 객체 제거 파괴
  if (bubbleChart) {
    bubbleChart.destroy();
  }

  // 버블 데이터셋 구성
  const datasets = sectorData.map(item => {
    const isPositive = item.avgChange >= 0;
    // 버블 크기 스케일링: 시가총액 제곱근 기반 시각 비율 밸런싱
    const radius = Math.max(8, Math.min(48, Math.sqrt(item.totalCap) * 0.75));

    return {
      label: translateSectorKR(item.sector),
      data: [{
        x: item.avgChange,
        y: item.totalCap,
        r: radius
      }],
      backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.7)' : 'rgba(244, 63, 94, 0.7)',
      borderColor: isPositive ? 'rgba(16, 185, 129, 1)' : 'rgba(244, 63, 94, 1)',
      borderWidth: 1.5,
      hoverBackgroundColor: isPositive ? 'rgba(16, 185, 129, 0.95)' : 'rgba(244, 63, 94, 0.95)',
      hoverBorderColor: '#fff',
      hoverBorderWidth: 2,
      rawInfo: item // 툴팁 커스텀용 오리지널 객체 저장
    };
  });

  // 차트 생성
  bubbleChart = new Chart(ctx, {
    type: 'bubble',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: '평균 등락률 (%)',
            color: '#9ca3af',
            font: { size: 12, weight: 600, family: 'Noto Sans KR' }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#6b7280',
            callback: function(value) { return value + '%'; }
          }
        },
        y: {
          title: {
            display: true,
            text: '총 시가총액 (단위: $Billion)',
            color: '#9ca3af',
            font: { size: 12, weight: 600, family: 'Noto Sans KR' }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#6b7280',
            callback: function(value) { return '$' + value.toLocaleString() + 'B'; }
          }
        }
      },
      plugins: {
        legend: {
          display: false // 개별 라벨 범례는 노출하지 않고 툴팁으로 대체
        },
        tooltip: {
          backgroundColor: 'rgba(10, 16, 28, 0.95)',
          titleColor: '#fff',
          titleFont: { size: 13, weight: 700, family: 'Noto Sans KR' },
          bodyColor: '#e5e7eb',
          bodyFont: { size: 12, family: 'Outfit' },
          borderColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            title: function(context) {
              const dataset = context[0].dataset;
              return dataset.label + ` (${dataset.rawInfo.sector})`;
            },
            label: function(context) {
              const info = context.dataset.rawInfo;
              const displayCap = info.totalCap >= 1000 
                ? `$${(info.totalCap / 100).toFixed(2)}T` 
                : `$${info.totalCap.toLocaleString()}B`;

              return [
                `평균 등락률: ${info.avgChange >= 0 ? '+' : ''}${info.avgChange}%`,
                `총 시가총액: ${displayCap}`,
                `상장 종목수: ${info.count}개`
              ];
            }
          }
        }
      }
    }
  });
}

// 10. Claude AI 요약 보고서 생성 로직
async function generateAiSummary() {
  const claudeKey = localStorage.getItem(STORAGE_KEYS.CLAUDE);
  
  aiLoadingEl.classList.remove('hidden');
  aiSummaryTextEl.innerHTML = '';

  if (isMockMode || !claudeKey) {
    // API 키가 없거나 모의 데이터 모드인 경우 모의 레포트 타이핑 애니메이션 실행
    setTimeout(() => {
      aiLoadingEl.classList.add('hidden');
      startTypingEffect(MOCK_AI_REPORT);
    }, 1500); // 로딩 효과 1.5초
    return;
  }

  // 1) 분석용 섹터 데이터 텍스트 가공
  let dataSummaryText = '오늘의 NYSE 섹터별 마켓 실적 데이터:\n';
  currentSectorData.forEach(item => {
    dataSummaryText += `- 섹터: ${item.sector} (한국어명: ${translateSectorKR(item.sector)}), 평균 변동률: ${item.avgChange}%, 시가총액: $${item.totalCap} Billion, 상장 종목수: ${item.count}개\n`;
  });

  // 2) Claude API 요청 본문 및 프롬프트 정의
  const prompt = `${dataSummaryText}
  
위의 데이터를 바탕으로, 금융 분석가로서 투자자가 오늘 유의 깊게 관찰해야 할 "오늘 주목할 섹터 TOP 3" 마켓 분석 요약 리포트를 격식 있고 통찰력 넘치는 한국어로 작성해줘.
리포트는 다음 규칙을 철저히 따라 작성해줘:
1. 마크다운(Markdown) 포맷을 활용할 것. 소제목은 '###', 강조는 '**', 목록은 '-' 등을 조화롭게 사용해줘.
2. 각 섹터의 시가총액 비중(예: 정보기술 등의 메가 캡 지배력)과 평균 상승/하락률의 의미를 거시경제 관점에서 분석에 포함할 것.
3. 상승 섹터뿐만 아니라 하락세가 거세 조심해야 할 섹터(리스크 섹터)도 추가로 분석해줄 것.
4. 요약문은 한눈에 읽기 쉽게 간결하되 깊이 있게 작성해줘.`;

  // CORS 우회 프록시 서버 연동
  const proxyUrl = 'https://corsproxy.io/?';
  const claudeUrl = 'https://api.anthropic.com/v1/messages';

  try {
    const response = await fetch(proxyUrl + encodeURIComponent(claudeUrl), {
      method: 'POST',
      headers: {
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API 연동 에러 (상태코드: ${response.status}). 키 권한 또는 크레딧 한도를 확인하세요.`);
    }

    const json = await response.json();
    const aiText = json.content[0].text;

    aiLoadingEl.classList.add('hidden');
    startTypingEffect(aiText);

  } catch (error) {
    aiLoadingEl.classList.add('hidden');
    alert(error.message);
    // 폴백으로 모의 요약 출력
    startTypingEffect(MOCK_AI_REPORT + `\n\n*(주의: Claude API 통신 에러로 인하여 모의 리포트로 폴백 출력되었습니다.)*`);
  }
}

// 11. 텍스트 타이핑 렌더링 효과 함수
function startTypingEffect(text) {
  let index = 0;
  aiSummaryTextEl.innerHTML = '';
  
  // 단순 마크다운 변환 파서 적용
  const htmlContent = parseMarkdownToHtml(text);
  
  // 타이핑 느낌을 주기 위해 글자를 누적해서 추가하되 HTML 구조가 깨지지 않도록
  // 간단하게 임시 디브에 담고 innerHTML을 글자 길이에 맞춰 노출
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // 모든 텍스트 요소를 순회하여 단계적으로 노출
  // 보다 심플하고 부드러운 효과를 위해 투명도 전환으로 렌더링
  aiSummaryTextEl.style.opacity = 0;
  aiSummaryTextEl.innerHTML = htmlContent;
  
  let opacity = 0;
  const fadeInTimer = setInterval(() => {
    opacity += 0.05;
    aiSummaryTextEl.style.opacity = opacity;
    if (opacity >= 1) {
      clearInterval(fadeInTimer);
    }
  }, 20);
}

// 12. 미니 마크다운 파서 구현
function parseMarkdownToHtml(markdown) {
  let html = markdown;

  // 1) 가로 구분선 변환
  html = html.replace(/---/g, '<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 15px 0;">');

  // 2) 헤더 변환 (###)
  html = html.replace(/### (.*?)\n/g, '<h3>$1</h3>');

  // 3) 강조 변환 (**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 4) 리스트 변환 (- 또는 * 시작 목록)
  html = html.replace(/^- (.*?)\n/gm, '<li>$1</li>');
  html = html.replace(/^\* (.*?)\n/gm, '<li>$1</li>');
  
  // 연속된 <li> 태그들을 <ul>로 감싸기
  html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');

  // 5) 줄바꿈을 <br>로 처리 (단, HTML 태그 근처는 생략하여 레이아웃 붕괴 방지)
  html = html.replace(/\n/g, '<br>');

  return html;
}

// 13. 섹터명 한글 번역 사전
function translateSectorKR(sector) {
  const dictionary = {
    'Technology': '정보기술 (Tech)',
    'Financials': '금융 (Financials)',
    'Healthcare': '헬스케어 (Healthcare)',
    'Consumer Cyclical': '임의소비재 (Cyclical)',
    'Industrials': '산업재 (Industrials)',
    'Consumer Defensive': '필수소비재 (Defensive)',
    'Energy': '에너지 (Energy)',
    'Utilities': '유틸리티 (Utilities)',
    'Real Estate': '부동산 (Real Estate)',
    'Basic Materials': '기초소재 (Materials)',
    'Communication Services': '통신 서비스 (Telecom)'
  };
  return dictionary[sector] || sector;
}
