/**
 * Day 07: 감성 날씨 웹앱 - script.js
 * Geolocation API 및 OpenWeather API 연동 소스코드
 */

// 1. DOM 요소 선택
const keyModal = document.getElementById('key-modal');
const keyForm = document.getElementById('key-form');
const apiKeyInput = document.getElementById('api-key-input');
const btnResetKey = document.getElementById('btn-reset-key');

const loadingEl = document.getElementById('loading');
const weatherContentEl = document.getElementById('weather-content');

const cityNameEl = document.getElementById('city-name');
const tempEl = document.getElementById('temp');
const weatherIconEl = document.getElementById('weather-icon');
const weatherDescEl = document.getElementById('weather-desc');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');

// 로컬스토리지에 저장될 API Key 변수명
const STORAGE_KEY = 'openweather_api_key';

// 2. 초기 기동 함수
window.addEventListener('DOMContentLoaded', () => {
  // Lucide 아이콘 생성
  lucide.createIcons();
  
  // API Key 검사
  const savedKey = localStorage.getItem(STORAGE_KEY);
  if (savedKey) {
    // 저장된 키가 있다면 바로 날씨 탐색 시작
    initWeatherSearch(savedKey);
  } else {
    // 키가 없다면 모달창 표시
    keyModal.classList.remove('hidden');
  }
});

// 3. API Key 저장 폼 이벤트 처리
keyForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const inputKey = apiKeyInput.value.trim();
  
  if (inputKey) {
    localStorage.setItem(STORAGE_KEY, inputKey);
    keyModal.classList.add('hidden');
    initWeatherSearch(inputKey);
  }
});

// 4. API Key 재설정 버튼 이벤트
btnResetKey.addEventListener('click', () => {
  if (confirm('API Key를 재설정하시겠습니까?\n기존 키는 로컬스토리지에서 삭제됩니다.')) {
    localStorage.removeItem(STORAGE_KEY);
    apiKeyInput.value = '';
    // 날씨 정보 가리고 로딩창으로 복귀 후 모달 띄우기
    weatherContentEl.classList.add('hidden');
    loadingEl.classList.remove('hidden');
    // 기본 테마 복귀
    document.body.className = 'theme-default';
    keyModal.classList.remove('hidden');
  }
});

// 5. 날씨 탐색 진입 함수
function initWeatherSearch(apiKey) {
  // 로딩 화면 표시 및 날씨 콘텐츠 가리기
  loadingEl.classList.remove('hidden');
  weatherContentEl.classList.add('hidden');

  // 브라우저 Geolocation 기능 지원 여부 검사
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      // 위치 조회 성공 시
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        fetchWeatherByCoords(lat, lon, apiKey);
      },
      // 위치 조회 실패 시 (권한 거부 등) 디폴트 도시(서울) 조회
      (error) => {
        console.warn('위치 정보를 획득하는 데 실패했습니다. 디폴트 도시(서울)로 날씨를 조회합니다.', error);
        fetchWeatherByCity('Seoul', apiKey);
      },
      { timeout: 7000 } // 7초 내로 응답 없을 시 타임아웃
    );
  } else {
    console.warn('이 브라우저는 Geolocation 기능을 지원하지 않습니다. 디폴트 도시(서울)로 날씨를 조회합니다.');
    fetchWeatherByCity('Seoul', apiKey);
  }
}

// 6. 좌표(위도/경도) 기반 날씨 API 호출
async function fetchWeatherByCoords(lat, lon, apiKey) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=kr`;
  await requestWeatherData(url, apiKey);
}

// 7. 특정 도시(City Name) 기반 날씨 API 호출
async function fetchWeatherByCity(city, apiKey) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=kr`;
  await requestWeatherData(url, apiKey);
}

// 8. 공통 데이터 패치 및 렌더링 함수
async function requestWeatherData(url, apiKey) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('유효하지 않은 API Key입니다. 키를 재확인하고 다시 설정해주세요.');
      }
      throw new Error('날씨 데이터를 가져오는 중 서버 에러가 발생했습니다.');
    }
    const data = await response.json();
    renderWeather(data);
  } catch (error) {
    alert(error.message);
    // API 에러 시 키가 유효하지 않을 확률이 높으므로 키 리셋 처리 후 모달 띄우기
    localStorage.removeItem(STORAGE_KEY);
    keyModal.classList.remove('hidden');
  }
}

// 9. 화면 렌더링 및 동적 테마 매핑 함수
function renderWeather(data) {
  // 도시명과 국가코드 맵핑
  cityNameEl.textContent = `${data.name}, ${data.sys.country}`;
  // 온도 설정 (소수점 첫째 자리까지)
  tempEl.textContent = data.main.temp.toFixed(1);
  // 날씨 설명
  weatherDescEl.textContent = data.weather[0].description;
  // 습도 및 풍속
  humidityEl.textContent = `${data.main.humidity}%`;
  windSpeedEl.textContent = `${data.wind.speed} m/s`;

  // 날씨 아이콘 연동 (OpenWeather 공식 2x 아이콘)
  const iconCode = data.weather[0].icon;
  weatherIconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  weatherIconEl.alt = data.weather[0].main;

  // 날씨 상태 그룹 코드(Weather ID) 획득
  const weatherId = data.weather[0].id;
  updateTheme(weatherId);

  // 로딩 가리고 날씨 결과 노출
  loadingEl.classList.add('hidden');
  weatherContentEl.classList.remove('hidden');
  
  // Lucide 아이콘 재생성 (새롭게 표시된 아이콘 리렌더링)
  lucide.createIcons();
}

// 10. 날씨 코드에 따른 동적 테마(CSS class) 업데이트
function updateTheme(weatherId) {
  let themeClass = 'theme-default';

  if (weatherId >= 200 && weatherId < 300) {
    themeClass = 'theme-thunder'; // Thunderstorm
  } else if (weatherId >= 300 && weatherId < 400) {
    themeClass = 'theme-drizzle'; // Drizzle
  } else if (weatherId >= 500 && weatherId < 600) {
    themeClass = 'theme-rain'; // Rain
  } else if (weatherId >= 600 && weatherId < 700) {
    themeClass = 'theme-snow'; // Snow
  } else if (weatherId >= 700 && weatherId < 800) {
    themeClass = 'theme-atmosphere'; // Mist, Smoke, Haze, Fog 등
  } else if (weatherId === 800) {
    themeClass = 'theme-clear'; // Clear (맑음)
  } else if (weatherId > 800 && weatherId < 900) {
    themeClass = 'theme-clouds'; // Clouds (흐림)
  }

  // body의 클래스명을 해당 날씨 클래스로 완전 교체하여 그라데이션 전환 트리거
  document.body.className = themeClass;
}
