/**
 * 📈 NYSE 섹터 동향 & AI 마켓 분석 - script.js (Commit 3)
 * FMP API 데이터 집계 및 모의 데이터 가동 로직
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
let currentSectorData = [];
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

// 3. 초기 기동 함수
window.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  
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
    keyModal.classList.remove('hidden');
    loadMockMode();
  } else {
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

btnSkipModal.addEventListener('click', () => {
  keyModal.classList.add('hidden');
  isMockMode = true;
  loadMockMode();
});

btnResetKey.addEventListener('click', () => {
  keyModal.classList.remove('hidden');
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
  
  const cacheKey = 'fmp_sector_data_cache';
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    const age = (Date.now() - parsed.timestamp) / (1000 * 60);
    if (age < 60) {
      currentSectorData = parsed.sectors;
      updateDashboard(currentSectorData);
      return;
    }
  }

  document.getElementById('total-market-cap').textContent = '로딩 중...';
  document.getElementById('overall-avg-change').textContent = '로딩 중...';

  try {
    const screenerUrl = `https://financialmodelingprep.com/api/v3/stock-screener?exchange=NYSE&limit=1000&apikey=${fmpKey}`;
    const screenerResponse = await fetch(screenerUrl);
    if (!screenerResponse.ok) throw new Error('FMP Screener API 호출 실패');
    const screenerData = await screenerResponse.json();

    const quotesUrl = `https://financialmodelingprep.com/api/v3/quotes/nyse?apikey=${fmpKey}`;
    const quotesResponse = await fetch(quotesUrl);
    if (!quotesResponse.ok) throw new Error('FMP Quotes API 호출 실패');
    const quotesData = await quotesResponse.json();

    const symbolToSectorMap = {};
    screenerData.forEach(item => {
      if (item.symbol && item.sector) {
        symbolToSectorMap[item.symbol] = item.sector;
      }
    });

    const sectorAggregates = {};
    quotesData.forEach(quote => {
      const sector = symbolToSectorMap[quote.symbol];
      if (sector && quote.marketCap && quote.changesPercentage !== null) {
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

    const processedSectors = Object.values(sectorAggregates).map(item => {
      return {
        sector: item.sector,
        avgChange: parseFloat((item.sumChange / item.count).toFixed(2)),
        totalCap: parseFloat((item.totalCap / 1000000000).toFixed(2)),
        count: item.count
      };
    });

    if (processedSectors.length === 0) {
      throw new Error('집계된 데이터가 없습니다.');
    }

    currentSectorData = processedSectors;

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
  const sortedByChange = [...sectorData].sort((a, b) => b.avgChange - a.avgChange);
  const topSector = sortedByChange[0];
  const worstSector = sortedByChange[sortedByChange.length - 1];

  const totalBillionCap = sectorData.reduce((acc, cur) => acc + cur.totalCap, 0);
  const totalTrillionCap = (totalBillionCap / 1000).toFixed(2);
  totalMarketCapEl.textContent = `$${totalTrillionCap}T`;

  const totalStocks = sectorData.reduce((acc, cur) => acc + cur.count, 0);
  const sumStockChange = sectorData.reduce((acc, cur) => acc + (cur.avgChange * cur.count), 0);
  const overallAvgChange = (sumStockChange / totalStocks).toFixed(2);
  
  overallAvgChangeEl.textContent = `${overallAvgChange}%`;
  overallAvgChangeEl.className = `card-value ${overallAvgChange >= 0 ? 'up-value' : 'down-value'}`;

  topSectorNameEl.textContent = translateSectorKR(topSector.sector);
  topSectorChangeEl.textContent = `+${topSector.avgChange}%`;
  topSectorChangeEl.className = 'card-sub-value up-value';

  worstSectorNameEl.textContent = translateSectorKR(worstSector.sector);
  worstSectorChangeEl.textContent = `${worstSector.avgChange}%`;
  worstSectorChangeEl.className = 'card-sub-value down-value';

  renderTable(sectorData);
}

// 8. 상세 테이블 렌더링
function renderTable(sectorData) {
  sectorTableBody.innerHTML = '';
  const sortedByCap = [...sectorData].sort((a, b) => b.totalCap - a.totalCap);

  sortedByCap.forEach(item => {
    const row = document.createElement('tr');
    const displayCap = item.totalCap >= 1000 
      ? `$${(item.totalCap / 1000).toFixed(2)}T` 
      : `$${item.totalCap.toLocaleString()}B`;

    const changeClass = item.avgChange >= 0 ? 'up-value' : 'down-value';
    const changeSign = item.avgChange >= 0 ? '+' : '';

    row.innerHTML = `
      <td class="sector-name">${translateSectorKR(item.sector)}</td>
      <td class="text-right num-value ${changeClass}">${changeSign}${item.avgChange}%</td>
      <td class="text-right num-value">${displayCap}</td>
      <td class="text-center num-value">${item.count}</td>
    `;
    sectorTableBody.appendChild(row);
  });
}

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
