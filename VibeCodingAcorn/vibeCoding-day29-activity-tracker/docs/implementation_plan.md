# 습관 추적기 (Habit Tracker) 구현 계획서

`vibeCoding-day29-activity-tracker` 폴더에 HTML, CSS, JavaScript만을 사용하여 반응형이고 화려한 프리미엄 디자인의 습관 추적기 웹 애플리케이션을 제작합니다.

## User Review Required

> [!IMPORTANT]
> **크롬 완벽 호환 파일 다운로드 규칙 적용**
> - 파일 내보내기(Export) 기능을 구현할 때, Chrome 86 이상에서 제공하는 `window.showSaveFilePicker()` API를 최우선으로 사용하여 "다른 이름으로 저장" 창을 표시합니다.
> - 미지원 브라우저 대응을 위해 일반 Blob 다운로드를 수행하는 경우, `URL.createObjectURL(blob)` 실행 후 `revokeObjectURL`을 최소 30초 이상 지연시켜 해시/UUID 파일명 저장 오류를 방지합니다.

> [!NOTE]
> **디자인 에스테틱 및 사용자 경험**
> - 현대적이고 세련된 다크 모드와 글래스모피즘(Glassmorphism) 스타일을 적용합니다.
> - 네온 색상 테마(블루, 핑크, 에메랄드, 퍼플, 골드)를 제공하고, 습관별 테마에 맞추어 7x5 그리드가 네온 발광 효과(Glow Effect)를 냅니다.
> - 아이콘은 직관적이고 깔끔한 이모지와 SVG 아이콘 선택기를 제공합니다.

## Open Questions

질문이나 불명확한 점이 있으시면 언제든지 알려주세요. 현재 계획은 다음과 같이 설정되어 있습니다:
- **7x5 레이아웃의 기준일**: 1일부터 35일까지 차례대로 채워나가는 형태이며, 오늘 날짜를 기준으로 매핑하기보다 사용자가 자유롭게 습관을 시작한 날부터 35일간의 도전 기간으로 시각화합니다. (기본값: Day 1 ~ Day 35)
- **연속 달성일(Current Streak) 계산 방식**: 최신 완료일에서부터 끊기지 않고 거꾸로 연속된 완료 일수를 계산합니다.

## Proposed Changes

### [Component Name] Habit Tracker Frontend

#### [NEW] [index.html](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day29-activity-tracker/index.html)
- 웹앱의 전체 구조를 정의합니다.
- Lucide Icons 및 Google Fonts(Outfit) 라이브러리를 로드합니다.
- 상단 헤더: 서비스 타이틀, 전체 리셋, 내보내기(Export) 및 가져오기(Import) 버튼.
- 중앙 영역: 습관 목록 (각 습관 카드에는 습관 정보, 통계, 7x5 그리드, 삭제 버튼 포함).
- 우측/하단 영역 또는 플로팅 버튼: 새 습관 추가 모달/카드 폼.

#### [NEW] [style.css](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day29-activity-tracker/style.css)
- CSS 변수를 활용해 고급스러운 다크 테마 컬러 팔레트 구축.
- 글래스모피즘 효과 (`backdrop-filter: blur()`, 반투명 경계선, 부드러운 그림자).
- 7x5 그리드 레이아웃: Grid Auto-fit 설정. 각 그리드 셀은 마우스 호버 시 스케일 업 및 네온 섀도우 효과 제공.
- 습관 개별 테마 색상(변수 혹은 인라인 스타일 대응)에 따른 네온 글로우 스타일 정의.
- 반응형 웹 디자인 지원 (모바일 화면에서도 그리드가 깨지지 않고 유연하게 배치됨).

#### [NEW] [app.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day29-activity-tracker/app.js)
- `localStorage` 데이터 관리 모듈: `habits` 로드, 저장, 개별 습관 수정/삭제 및 전체 초기화.
- 습관 추가 기능: 유효성 검사, 고유 ID 생성, 35일 배열 초기화.
- 상태 토글 기능: 35일 그리드의 특정 날짜를 클릭하면 완료/취소 상태로 전환하고 실시간 통계 재계산.
- 실시간 통계 계산 알고리즘:
  - **Total Progress**: `(완료일 수 / 35) * 100` (%)
  - **Current Streak**: 35일 배열의 마지막 체크된 날(혹은 현재 시점의 가장 최근 완료일)부터 역순으로 끊기지 않고 연속된 완료일 수 계산.
- 데이터 내보내기/가져오기 기능:
  - `window.showSaveFilePicker()`를 사용해 유저가 파일 이름과 위치를 지정할 수 있게 함.
  - 지원하지 않는 브라우저에서는 `setTimeout`으로 `revokeObjectURL`을 35초 지연 실행.
  - JSON 형식 검증 후 가져오기(Import) 처리.

---

## Verification Plan

### Automated Tests
- 없음 (순수 프론트엔드 정적 웹앱)

### Manual Verification
1. 브라우저로 `index.html`을 오픈하여 초기 화면 렌더링 검증.
2. 새 습관 추가 모달을 띄워 습관 이름, 설명, 아이콘, 색상 테마를 입력해 추가 기능 검증.
3. 생성된 카드의 7x5 그리드를 클릭하여 완료(Done) 상태로 토글 및 네온 발광 효과 검증.
4. 완료 상태 토글 시 **Current Streak**과 **Total Progress**가 올바르게 갱신되는지 확인.
5. **Export** 버튼을 눌러 JSON 백업 파일 저장 창이 정상적으로 뜨는지 크롬 브라우저에서 검증.
6. **Reset** 버튼으로 데이터가 모두 초기화되는지 확인.
7. 저장된 JSON 파일을 **Import**하여 기존 데이터가 그대로 복구되는지 검증.
