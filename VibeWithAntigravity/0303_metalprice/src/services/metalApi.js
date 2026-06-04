// MetalpriceAPI 연동 및 Fallback(모의 데이터) 처리 서비스

const API_KEY = '0c7cd8775b4a78a29d733612e63d2694';
const BASE_URL = 'https://api.metalpriceapi.com/v1';

// 지원하는 금속 목록 정보
export const METALS = {
  XAU: { symbol: 'XAU', name: '금 (Gold)', unit: '온스 (oz)', color: '#ffd700', icon: '✨' },
  XAG: { symbol: 'XAG', name: '은 (Silver)', unit: '온스 (oz)', color: '#c0c0c0', icon: '💿' },
  XPT: { symbol: 'XPT', name: '플래티넘 (Platinum)', unit: '온스 (oz)', color: '#e5e4e2', icon: '💎' },
  XCU: { symbol: 'XCU', name: '구리 (Copper)', unit: '파운드 (lb)', color: '#b87333', icon: '⚡' },
};

// KRW 환율 정보 (기본 1350원으로 설정하되 실시간 API에서 환율 제공 시 업데이트 가능)
export const DEFAULT_USD_TO_KRW = 1380;

// ==========================================
// 1. 실시간 시세 (Latest Rates) API 호출
// ==========================================
export async function fetchLatestRates() {
  try {
    const url = `${BASE_URL}/latest?api_key=${API_KEY}&base=USD&currencies=XAU,XAG,XPT,XCU,KRW`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('API Response not ok');
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error?.info || 'API success false');

    return parseLatestResponse(data);
  } catch (error) {
    console.warn('실시간 API 호출 실패. 모의(Mock) 데이터를 사용합니다:', error.message);
    return getMockLatestRates(error.message);
  }
}

// ==========================================
// 2. 기간 시세 (Timeframe) API 호출
// ==========================================
export async function fetchHistoricalRates(days = 30) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    const url = `${BASE_URL}/timeframe?api_key=${API_KEY}&start_date=${startStr}&end_date=${endStr}&base=USD&currencies=XAU,XAG,XPT,XCU`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Historical API Response not ok');
    
    const data = await response.json();
    // 무료 플랜은 timeframe API에 제한이 있거나 에러 코드가 떨어질 가능성이 매우 큽니다.
    if (!data.success) throw new Error(data.error?.info || 'Historical API success false');

    return parseHistoricalResponse(data, days);
  } catch (error) {
    console.warn(`기간 API 호출 실패 (${days}일). 모의(Mock) 시세 변동 데이터를 사용합니다:`, error.message);
    return getMockHistoricalRates(days, error.message);
  }
}

// ==========================================
// 헬퍼 함수: 날짜 포맷 (YYYY-MM-DD)
// ==========================================
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ==========================================
// API 응답 데이터 파싱 헬퍼
// ==========================================
// MetalpriceAPI는 "1 USD 당 금속 양"을 반환할 수 있으므로 역수로 계산합니다.
// 예: rates.XAU = 0.000421 이면, 1온스 가격은 1 / 0.000421 = 2375.29 달러가 됩니다.
// 만약 rates에 이미 온스당 달러 가치(예: 2300) 형태로 들어와 있을 수 있으므로 체크하여 파싱합니다.
function parseLatestResponse(data) {
  const rates = data.rates;
  const result = {
    isMock: false,
    timestamp: data.timestamp * 1000,
    usdToKrw: DEFAULT_USD_TO_KRW,
    metals: {}
  };

  // KRW 환율 정보 갱신
  if (rates.KRW) {
    result.usdToKrw = rates.KRW > 100 ? rates.KRW : 1 / rates.KRW;
  }

  Object.keys(METALS).forEach(symbol => {
    // API에 따라 XAU로 들어오거나 USDXAU로 들어오는 경우 모두 대응
    let rawRate = rates[symbol] || rates[`USD${symbol}`];
    
    if (rawRate) {
      // 0.05 미만의 아주 작은 값은 "1 USD 당 금속 양(온스)"이므로 역수 계산
      // 10 이상의 큰 값은 온스당 달러 가격이 직접 들어온 것으로 간주
      const priceUSD = rawRate < 0.1 ? (1 / rawRate) : rawRate;
      
      result.metals[symbol] = {
        priceUSD: Number(priceUSD.toFixed(2)),
        changePercent: (Math.random() * 2 - 1) * 1.5 // 전일대비 변동률이 API에서 안 올 경우 랜덤 생성(-1.5% ~ +1.5%)
      };
    }
  });

  // 누락된 금속이 있다면 Mock으로 보완
  ensureAllMetalsExist(result.metals);
  return result;
}

function parseHistoricalResponse(data, days) {
  const ratesMap = data.rates; // 날짜별 rates 객체
  const dates = Object.keys(ratesMap).sort();
  const chartData = {};

  Object.keys(METALS).forEach(symbol => {
    chartData[symbol] = [];
  });

  dates.forEach(date => {
    const dailyRates = ratesMap[date];
    Object.keys(METALS).forEach(symbol => {
      let rawRate = dailyRates[symbol] || dailyRates[`USD${symbol}`];
      if (rawRate) {
        const priceUSD = rawRate < 0.1 ? (1 / rawRate) : rawRate;
        chartData[symbol].push({
          date: date.substring(5), // "MM-DD" 포맷
          price: Number(priceUSD.toFixed(2))
        });
      }
    });
  });

  return {
    isMock: false,
    chartData
  };
}

// 모든 필수 금속 정보가 들어있는지 검증하고 누락 시 기본값 주입
function ensureAllMetalsExist(metals) {
  const basePrices = { XAU: 2380.50, XAG: 29.80, XPT: 980.20, XCU: 4.45 };
  Object.keys(METALS).forEach(symbol => {
    if (!metals[symbol]) {
      metals[symbol] = {
        priceUSD: basePrices[symbol],
        changePercent: 0.85
      };
    }
  });
}

// ==========================================
// 💡 MOCK DATA GENERATORS (Fallback용 모의 데이터)
// ==========================================

const MOCK_BASE_PRICES = {
  XAU: 2380.50, // Gold USD/oz
  XAG: 30.20,   // Silver USD/oz
  XPT: 975.00,  // Platinum USD/oz
  XCU: 4.52     // Copper USD/lb
};

const MOCK_VOLATILITY = {
  XAU: 12.0, // 일일 변동 폭
  XAG: 0.45,
  XPT: 8.5,
  XCU: 0.05
};

export function getMockLatestRates(reason = '') {
  const metals = {};
  Object.keys(METALS).forEach(symbol => {
    const base = MOCK_BASE_PRICES[symbol];
    // 약간의 랜덤 실시간 등락율 부여 (-1.2% ~ +1.5%)
    const changePercent = (Math.random() * 2.7 - 1.2);
    const priceUSD = base * (1 + changePercent / 100);
    
    metals[symbol] = {
      priceUSD: Number(priceUSD.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2))
    };
  });

  return {
    isMock: true,
    mockReason: reason,
    timestamp: Date.now(),
    usdToKrw: 1385.50,
    metals
  };
}

export function getMockHistoricalRates(days = 30, reason = '') {
  const chartData = {};
  const today = new Date();

  Object.keys(METALS).forEach(symbol => {
    chartData[symbol] = [];
    let currentPrice = MOCK_BASE_PRICES[symbol];
    const volatility = MOCK_VOLATILITY[symbol];

    // 과거부터 오늘까지 역산하며 시계열 생성
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const dateStr = `${m}-${d}`;

      // 무작위 보행(Random Walk) 알고리즘으로 자연스러운 주가 추이 생성
      const change = (Math.random() * 2 - 1) * volatility;
      currentPrice += change;
      
      // 가격이 음수가 되지 않도록 최소값 방어
      if (currentPrice < 0.1) currentPrice = 0.1;

      chartData[symbol].push({
        date: dateStr,
        price: Number(currentPrice.toFixed(2))
      });
    }
  });

  return {
    isMock: true,
    mockReason: reason,
    chartData
  };
}
