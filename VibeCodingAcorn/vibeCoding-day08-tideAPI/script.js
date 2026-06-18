/**
 * 🌊 조석 & 천문 정보 캘린더 - script.js (Commit 3)
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

// 9. 임시 달력 렌더링 함수 (Commit 3 버전 - 구조적 골격만 표시)
function renderCalendar(tideData, astroData, lat, lng) {
  calendarGridEl.innerHTML = '';
  currentCoordsText.textContent = `위도 (Latitude): ${lat.toFixed(4)}° / 경도 (Longitude): ${lng.toFixed(4)}°`;
  calendarContentEl.classList.remove('hidden');

  const startDay = new Date();
  startDay.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDay.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = d.toLocaleDateString();
    
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card glass-card';
    dayCard.innerHTML = `
      <div class="day-meta">
        <div class="date-text">
          <h3>${dateStr}</h3>
        </div>
      </div>
      <div class="day-visuals">
        <p>조석 및 태양 천문 데이터 로딩 뼈대 완료. 다음 단계에서 시각화 및 매칭 분석을 진행합니다.</p>
      </div>
    `;
    calendarGridEl.appendChild(dayCard);
  }
}
