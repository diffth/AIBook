# 🃏 실시간 멀티플레이어 포커 게임 (0402_mypocker)

Firebase Realtime Database를 활용한 실시간 4인 포커 게임입니다. 
고급 카지노 스타일의 딥 그린 및 골드 톤 UI를 적용하여 프리미엄한 게임 환경을 제공합니다.

## 🎮 게임 규칙 (Game Rules)

1. **배팅 없음**: 칩이나 배팅 시스템 없이, 순수한 패 경쟁으로 승부를 겨룹니다.
2. **5장 카드 제한**: 각 플레이어는 최대 5장의 카드만 받습니다.
3. **2라운드 진행**:
   - **1라운드**: 각 플레이어가 카드를 4장씩 받고 시작합니다. 순서대로 **Go** 또는 **Die**를 선택합니다.
   - **2라운드**: Go를 선택하여 생존한 플레이어들에게 카드가 1장씩 더 지급됩니다(총 5장). 다시 순서대로 **Go** 또는 **Die**를 선택합니다.
   - **최종 판정**: 끝까지 Go를 외친 플레이어들 간에 족보를 비교하여 최종 승자를 가립니다.
4. **자동 기권 (Auto-Die)**: 게임 도중 플레이어가 방을 나가거나 연결이 끊기면(`disconnected`), 해당 플레이어의 다음 턴에 자동으로 기권(Die) 처리됩니다.

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend**: Vanilla HTML5, CSS3 (Custom Grid/Flexbox Layout, Glassmorphism, Micro-animations)
- **Backend/Database**: Firebase Realtime Database (실시간 상태 동기화 및 접속 감지)
- **Logic**: Custom Poker Hand Evaluator (족보 판정 엔진)

## 📁 프로젝트 구조 (Project Structure)

- `index.html`: 게임 화면 레이아웃
- `css/style.css`: 카지노 스타일 테마 및 애니메이션 CSS
- `js/firebase-config.js`: Firebase 초기화 및 설정
- `js/poker-logic.js`: 5장 카드 포커 족보 계산 및 판정 알고리즘
- `js/test-poker.mjs`: 족보 판정 엔진 검증용 유닛 테스트 (11개 테스트 통과)
- `js/poker-game.js`: 게임 방 생성, 참여, 라운드 진행, 턴 관리 및 실시간 동기화 코어 로직
