# 🌤️ Vibe Coding Challenge - Day 07: Weather Web App

이 폴더는 OpenWeather API와 브라우저 Geolocation API를 연동하여 사용자의 위치 기반 날씨를 보여주는 **감성 날씨 웹앱** 프로젝트 공간입니다. 

AI 코딩 어시스턴트(Antigravity 등)를 활용하여 한 번에 완벽한 결과물을 얻을 수 있도록 정교하게 설계된 **바이브 코딩용 프롬프트**를 아래에 제공합니다. 

이 프롬프트 블록을 그대로 복사하여 AI 어시스턴트에게 전달해 보세요! 🚀

---

## 📝 AI 어시스턴트 전달용 프롬프트 (Copy & Paste)

```markdown
VibeCodingAcorn/vibeCoding-day07-weather 폴더에 HTML, CSS, JavaScript로 작동하는 위치 기반 '감성 날씨 웹앱'을 만들어줘. 
바이브 코딩 및 API 공부를 시작하는 입문자들도 쉽게 소스코드를 읽고 흐름을 이해할 수 있도록 주석을 친절하게 달아주고 정돈된 구조로 작성해줘.

세부 구현 요구사항은 다음과 같아:

1. 🔑 API Key 입력 및 보안 처리
   - 웹앱이 실행될 때 OpenWeather API Key가 로컬 스토리지(localStorage)에 저장되어 있는지 확인해줘.
   - 저장되어 있지 않다면, 화면 중앙에 깔끔하고 세련된 디자인의 'API Key 입력 모달(Modal) 폼'을 띄워 사용자에게 키 입력을 유도하게 해줘. (브라우저 prompt() 대신 예쁜 UI 모달을 활용해줘)
   - 입력받은 API Key는 localStorage에 안전하게 보관하여 재접속 시에는 다시 묻지 않게 처리해주고, 화면 하단 구석에 'API Key 초기화/재설정(Reset)' 버튼을 만들어 키를 잘못 입력했을 때 쉽게 바꿀 수 있게 해줘.

2. 📍 Geolocation 위치 감지 및 API 연동
   - HTML5 Geolocation API (`navigator.geolocation.getCurrentPosition`)를 활용하여 사용자의 현재 위도(latitude)와 경도(longitude)를 감지해줘.
   - 위치 획득 성공 시, OpenWeather Current Weather Data API를 호출해줘.
     * 호출 URL 예시: `https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric&lang=kr`
     * (섭씨 온도로 표시하기 위해 `units=metric` 옵션과 한국어 번역을 위해 `lang=kr` 옵션을 반드시 포함해줘)
   - 만약 사용자가 위치 권한을 거부했거나 오류가 발생했을 경우, 디폴트 도시(예: 서울, 'Seoul')의 날씨 데이터를 호출하도록 예외 처리를 꼼꼼하게 해줘.

3. 🎨 프리미엄 글래스모피즘 디자인 & 날씨 배경 최적화
   - 카드 레이아웃은 반투명하고 맑은 느낌의 글래스모피즘(Glassmorphism) 스타일을 적용해줘.
   - 화면에 표시할 필수 정보: 도시명(지역명), 현재 온도(소수점 첫째 자리까지 표시), 날씨 설명(예: "맑음", "튼구름"), 그리고 날씨 상태를 직관적으로 나타내는 날씨 아이콘.
   - 배경 색상은 고정된 단색이 아닌, API로부터 응답받은 날씨 상태(Weather ID 또는 Main 상태 - Clear, Clouds, Rain, Snow, Thunderstorm 등)에 맞춰 감성적인 그라데이션 컬러로 최적화하여 0.8초간 부드럽게 전환되도록 해줘.
     * 예: 맑음(Clear) -> 화창하고 따뜻한 스카이 블루/옐로우 그라데이션
     * 예: 비(Rain) -> 차분하고 차가운 블루/다크 그레이 그라데이션
     * 예: 눈(Snow) -> 부드러운 화이트/라벤더 그라데이션

4. 🛠️ 파일 구조
   - index.html: 반응형 레이아웃 및 폰트 설정(Google Fonts 'Outfit' & 'Noto Sans KR' 권장)
   - style.css: 모던하고 감성적인 CSS 스타일 및 트랜지션 애니메이션
   - script.js: 주석이 상세히 포함된 위치 획득, API Fetch 및 DOM 렌더링 로직
```
