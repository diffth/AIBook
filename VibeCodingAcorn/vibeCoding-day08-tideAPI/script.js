/**
 * 🌊 조석 & 천문 정보 캘린더 - script.js
 * Stormglass API 연동 및 주간 간조 시간대 분석 로직
 */

// 1. DOM 요소 선택
const keyModal = document.getElementById('key-modal');
const keyForm = document.getElementById('key-form');
const apiKeyInput = document.getElementById('api-key-input');
const btnResetKey = document.getElementById('btn-reset-key');

const loadingEl = document.getElementById('loading');
const introMessageEl = document.getElementById('intro-message');
const calendarContentEl = document.getElementById('calendar-content');
const calendarGridEl = document.getElementById('calendar-grid');

const locationForm = document.getElementById('location-form');
const latInput = document.getElementById('lat-input');
const lngInput = document.getElementById('lng-input');
const currentCoordsText = document.getElementById('current-coords-text');

// 로컬스토리지에 저장될 Stormglass API Key 변수명
const STORAGE_KEY = 'stormglass_api_key';

let map;
let marker;

// 2. 초기 기동 함수
window.addEventListener('DOMContentLoaded', () => {
  // Lucide 아이콘 생성
  lucide.createIcons();
  
  // API Key 검사
  const savedKey = localStorage.getItem(STORAGE_KEY);
  if (!savedKey) {
    keyModal.classList.remove('hidden');
  }

  // Leaflet 지도 초기화 (기본값: 대한민국 중심부)
  initMap(36.5, 127.5, 6);
});

// 3. 지도 초기화 함수
function initMap(lat, lng, zoom) {
  map = L.map('map').setView([lat, lng], zoom);

  // OpenStreetMap 타일 레이어 등록
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // 지도 클릭 이벤트 연동
  map.on('click', (e) => {
    const clickedLat = e.latlng.lat;
    const clickedLng = e.latlng.lng;
    updateCoordinatesInputs(clickedLat, clickedLng);
  });
}

// 4. 위도/경도 입력란 및 마커 업데이트
function updateCoordinatesInputs(lat, lng) {
  const fixedLat = parseFloat(lat.toFixed(4));
  const fixedLng = parseFloat(lng.toFixed(4));
  
  latInput.value = fixedLat;
  lngInput.value = fixedLng;

  // 마커 업데이트
  if (marker) {
    marker.setLatLng([fixedLat, fixedLng]);
  } else {
    marker = L.marker([fixedLat, fixedLng]).addTo(map);
  }
  map.panTo([fixedLat, fixedLng]);
}

// 5. API Key 저장 폼 이벤트 처리
keyForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const inputKey = apiKeyInput.value.trim();
  
  if (inputKey) {
    localStorage.setItem(STORAGE_KEY, inputKey);
    keyModal.classList.add('hidden');
    // 만약 좌표가 입력되어 있다면 바로 조회 진행
    const lat = latInput.value;
    const lng = lngInput.value;
    if (lat && lng) {
      fetchTideAndAstronomy(parseFloat(lat), parseFloat(lng), inputKey);
    }
  }
});

// 6. API Key 재설정 버튼 이벤트
btnResetKey.addEventListener('click', () => {
  if (confirm('API Key를 재설정하시겠습니까?\n기존 키는 로컬스토리지에서 삭제됩니다.')) {
    localStorage.removeItem(STORAGE_KEY);
    apiKeyInput.value = '';
    
    // UI 초기화
    calendarContentEl.classList.add('hidden');
    introMessageEl.classList.remove('hidden');
    document.body.className = 'dark-theme';
    keyModal.classList.remove('hidden');
  }
});

// 7. 위치 입력 제출 이벤트
locationForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const apiKey = localStorage.getItem(STORAGE_KEY);
  if (!apiKey) {
    keyModal.classList.remove('hidden');
    return;
  }

  const lat = parseFloat(latInput.value);
  const lng = parseFloat(lngInput.value);

  if (!isNaN(lat) && !isNaN(lng)) {
    fetchTideAndAstronomy(lat, lng, apiKey);
  }
});

// 8. Stormglass 데이터 패치 및 캘린더 생성 진입
async function fetchTideAndAstronomy(lat, lng, apiKey) {
  // 로딩 시작
  loadingEl.classList.remove('hidden');
  introMessageEl.classList.add('hidden');
  calendarContentEl.classList.add('hidden');

  // 날짜 계산 (오늘 기준 향후 7일)
  const startDay = new Date();
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(startDay.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000);

  const startIso = startDay.toISOString();
  const endIso = endDay.toISOString();

  // 캐시 키 정의 (좌표 소수점 4째자리 + 시작날짜 기준 일 단위 매칭)
  const dateStr = startDay.toISOString().split('T')[0];
  const cacheKey = `tide_cache_${lat.toFixed(4)}_${lng.toFixed(4)}_${dateStr}`;
  const cachedData = sessionStorage.getItem(cacheKey);

  if (cachedData) {
    console.log('세션 스토리지 캐시로부터 데이터를 복원합니다.');
    const parsed = JSON.parse(cachedData);
    loadingEl.classList.add('hidden');
    renderCalendar(parsed.tides, parsed.astronomy, lat, lng);
    return;
  }

  // API 엔드포인트 URL 구성
  const tideUrl = `https://api.stormglass.io/v2/tide/extremes/point?lat=${lat}&lng=${lng}&start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
  const astroUrl = `https://api.stormglass.io/v2/astronomy/point?lat=${lat}&lng=${lng}&start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;

  try {
    const [tideResponse, astroResponse] = await Promise.all([
      fetch(tideUrl, { headers: { 'Authorization': apiKey } }),
      fetch(astroUrl, { headers: { 'Authorization': apiKey } })
    ]);

    if (tideResponse.status === 401 || astroResponse.status === 401 || tideResponse.status === 403 || astroResponse.status === 403) {
      throw new Error('유효하지 않거나 만료된 API Key입니다. 키 설정을 재확인해주세요.');
    }

    if (!tideResponse.ok || !astroResponse.ok) {
      throw new Error('Stormglass API 호출 오류. 위경도가 해안가(바다) 근처가 아닐 경우 조석 데이터를 불러올 수 없을 수 있습니다.');
    }

    const tideJson = await tideResponse.json();
    const astroJson = await astroResponse.json();

    // 정상 데이터 세션 스토리지에 캐싱
    const cachePayload = { tides: tideJson.data, astronomy: astroJson.data };
    sessionStorage.setItem(cacheKey, JSON.stringify(cachePayload));

    loadingEl.classList.add('hidden');
    renderCalendar(tideJson.data, astroJson.data, lat, lng);

  } catch (error) {
    loadingEl.classList.add('hidden');
    alert(error.message);
    // API 에러 시 키 삭제 후 입력 유도
    localStorage.removeItem(STORAGE_KEY);
    keyModal.classList.remove('hidden');
  }
}

// 9. 달력 렌더링 함수
function renderCalendar(tideData, astroData, lat, lng) {
  calendarGridEl.innerHTML = '';
  currentCoordsText.textContent = `위도 (Latitude): ${lat.toFixed(4)}° / 경도 (Longitude): ${lng.toFixed(4)}°`;
  calendarContentEl.classList.remove('hidden');

  // 오늘 기준 향후 7일 리스트 생성
  const dates = [];
  const startDay = new Date();
  startDay.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDay.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push(d);
  }

  // 일자별 데이터 분석 및 렌더링 루프
  dates.forEach(date => {
    const localDateStr = formatDateString(date); // YYYY-MM-DD 포맷
    const dayOfWeek = getDayOfWeekKR(date);       // 요일명

    // 1) 해당 일자의 Astronomy(일출, 일몰) 매칭
    const dayAstro = astroData.find(item => {
      const itemDate = new Date(item.time);
      return formatDateString(itemDate) === localDateStr;
    });

    let sunriseDate = null;
    let sunsetDate = null;
    let sunriseText = '--:--';
    let sunsetText = '--:--';

    if (dayAstro) {
      if (dayAstro.sunrise) {
        sunriseDate = new Date(dayAstro.sunrise);
        sunriseText = formatTime(sunriseDate);
      }
      if (dayAstro.sunset) {
        sunsetDate = new Date(dayAstro.sunset);
        sunsetText = formatTime(sunsetDate);
      }
    }

    // 2) 해당 일자의 조석(Tide) Extremes 데이터 매칭
    const dayTides = tideData.filter(item => {
      const itemDate = new Date(item.time);
      return formatDateString(itemDate) === localDateStr;
    });

    // 3) 주간 간조(Daylight Low Tide) 검사
    let hasDaylightLowTide = false;
    const processedTides = dayTides.map(tide => {
      const tideDate = new Date(tide.time);
      const isLow = tide.type === 'low';
      let isDaylight = false;

      if (isLow && sunriseDate && sunsetDate) {
        // 간조 시간이 일출과 일몰 사이에 일치하는지 비교
        if (tideDate >= sunriseDate && tideDate <= sunsetDate) {
          isDaylight = true;
          hasDaylightLowTide = true;
        }
      }

      return {
        ...tide,
        localTime: formatTime(tideDate),
        dateObj: tideDate,
        isLow: isLow,
        isDaylight: isDaylight
      };
    });

    // 4) 타임라인 바 배경 그라데이션 비율 계산
    let timelineBg = 'linear-gradient(to right, #111b2d 0%, #111b2d 100%)';
    let sunrisePercent = 0;
    let sunsetPercent = 100;

    if (sunriseDate && sunsetDate) {
      sunrisePercent = getDayMinutePercent(sunriseDate);
      sunsetPercent = getDayMinutePercent(sunsetDate);
      // 일출 이전(밤) -> 일출~일몰(낮, 샐먼/골드) -> 일몰 이후(밤) 그라데이션 생성
      timelineBg = `linear-gradient(to right, 
        #0c1424 0%, 
        #0c1424 ${sunrisePercent}%, 
        rgba(245, 158, 11, 0.2) ${sunrisePercent}%, 
        rgba(245, 158, 11, 0.2) ${sunsetPercent}%, 
        #0c1424 ${sunsetPercent}%, 
        #0c1424 100%)`;
    }

    // 5) 카드 엘리먼트 생성
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card glass-card';
    if (hasDaylightLowTide) {
      dayCard.classList.add('highlight-card');
    }

    // 주간 간조 배지
    const badgeHtml = hasDaylightLowTide 
      ? `<div class="golden-badge">
           <i data-lucide="sun"></i>
           <span>주간 간조 골든타임</span>
         </div>`
      : '';

    // 조석 칩 리스트 빌드
    let chipsHtml = '';
    processedTides.forEach(tide => {
      const lowClass = tide.isLow ? 'is-low' : 'is-high';
      const daylightClass = tide.isDaylight ? 'is-daylight' : '';
      const icon = tide.isLow ? 'arrow-down-circle' : 'arrow-up-circle';
      const label = tide.isLow ? '간조(썰물)' : '만조(밀물)';

      chipsHtml += `
        <div class="tide-info-chip ${lowClass} ${daylightClass}">
          <i data-lucide="${icon}" class="chip-icon"></i>
          <span><strong>${label}</strong></span>
          <span class="chip-time">${tide.localTime}</span>
          <span class="chip-height">(${tide.height.toFixed(2)}m)</span>
        </div>
      `;
    });

    if (processedTides.length === 0) {
      chipsHtml = `<div class="tide-info-chip">일치하는 조석 정보가 없습니다.</div>`;
    }

    // 타임라인 내 도트 렌더링
    let dotsHtml = '';
    processedTides.forEach(tide => {
      if (tide.isLow) {
        const tidePercent = getDayMinutePercent(tide.dateObj);
        const icon = 'waves';
        
        dotsHtml += `
          <div class="tide-dot" style="left: ${tidePercent}%;" title="간조: ${tide.localTime} (${tide.height.toFixed(2)}m)">
            <i data-lucide="${icon}"></i>
            <div class="tide-tooltip">${tide.localTime} (${tide.height.toFixed(2)}m)</div>
          </div>
        `;
      }
    });

    dayCard.innerHTML = `
      ${badgeHtml}
      
      <!-- 날짜 및 일출/일몰 메타 영역 -->
      <div class="day-meta">
        <div class="date-text">
          <h3>${formatDateKR(date)}</h3>
          <p>${dayOfWeek}</p>
        </div>
        <div class="sun-times">
          <div class="sun-item" title="일출 시간">
            <i data-lucide="sunrise"></i>
            <span>일출 <strong>${sunriseText}</strong></span>
          </div>
          <div class="sun-item" title="일몰 시간">
            <i data-lucide="sunset"></i>
            <span>일몰 <strong>${sunsetText}</strong></span>
          </div>
        </div>
      </div>

      <!-- 시각화 영역 (24H 타임라인 & 상세 칩 리스트) -->
      <div class="day-visuals">
        <div class="timeline-bar-wrapper">
          <div class="timeline-labels">
            <span>00:00 (자정)</span>
            <span>12:00 (정오)</span>
            <span>24:00 (자정)</span>
          </div>
          <div class="timeline-bar" style="background: ${timelineBg};">
            ${dotsHtml}
          </div>
        </div>

        <div class="tide-details-list">
          ${chipsHtml}
        </div>
      </div>
    `;

    calendarGridEl.appendChild(dayCard);
  });

  // 아이콘 렌더링
  lucide.createIcons();
}

// --- 유틸리티 헬퍼 함수 정의 ---

// Date 객체를 YYYY-MM-DD 형태의 지역 스트링으로 변환
function formatDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 한국어 날짜 표시 포맷 (MM월 DD일)
function formatDateKR(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}월 ${d}일`;
}

// 요일 구하기
function getDayOfWeekKR(date) {
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return days[date.getDay()];
}

// 시간 문자열 포맷팅 (HH:MM)
function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// 하루 24시간 중 경과 비율 계산 (0 ~ 100%)
function getDayMinutePercent(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = (hours * 60) + minutes;
  const dayMinutes = 24 * 60;
  return (totalMinutes / dayMinutes) * 100;
}
