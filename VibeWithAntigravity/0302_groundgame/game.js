// ==========================================
// 🎵 레트로 사운드 이펙트 (Web Audio API)
// ==========================================
class SoundEffects {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playTone(freq, type, duration, delay = 0) {
    this.init();
    if (!this.ctx) return;

    // 사용자 상호작용 후 AudioContext 재개
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
    
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime + delay);
    osc.stop(this.ctx.currentTime + delay + duration);
  }

  playCoinSound(isPlayer) {
    // 튕기는 듯한 두 개의 연속된 음 재생
    const baseFreq = isPlayer ? 523.25 : 329.63; // C5(도) 또는 E4(미)
    this.playTone(baseFreq, 'sine', 0.1);
    this.playTone(baseFreq * 1.5, 'sine', 0.15, 0.08);
  }

  playClaimSound() {
    this.playTone(880, 'triangle', 0.08);
  }

  playWinSound() {
    // 신나는 아르페지오 팡파르
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, index) => {
      this.playTone(freq, 'square', 0.15, index * 0.08);
    });
  }

  playLoseSound() {
    // 무겁고 가라앉는 사운드
    const notes = [220.00, 196.00, 164.81, 130.81];
    notes.forEach((freq, index) => {
      this.playTone(freq, 'sawtooth', 0.25, index * 0.15);
    });
  }

  playClick() {
    this.playTone(600, 'sine', 0.05);
  }
}

const sounds = new SoundEffects();

// ==========================================
// 🕹️ 게임 엔진 (Coin Clash)
// ==========================================
const BOARD_SIZE = 6;
const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE;

// 셀의 상태 정의
const STATE_EMPTY = 0;
const STATE_PLAYER_COIN = 1;
const STATE_PC_COIN = 2;
const STATE_PLAYER_TERRITORY = 3;
const STATE_PC_TERRITORY = 4;

let boardState = Array(TOTAL_CELLS).fill(STATE_EMPTY);
let currentTurn = 'player'; // 'player' | 'pc'
let isGameOver = false;

// DOM 요소 캐싱
const screenIntro = document.getElementById('screen-intro');
const screenGame = document.getElementById('screen-game');
const screenResult = document.getElementById('screen-result');

const btnStart = document.getElementById('btn-start');
const btnGiveup = document.getElementById('btn-giveup');
const btnRestart = document.getElementById('btn-restart');

const gameBoard = document.getElementById('game-board');
const playerLabel = document.getElementById('player-score');
const pcLabel = document.getElementById('pc-score');
const turnIndicator = document.getElementById('turn-indicator');

const resultTitle = document.getElementById('result-title');
const finalPlayerScore = document.getElementById('final-player-score');
const finalPcScore = document.getElementById('final-pc-score');
const resultDesc = document.getElementById('result-desc');

// ==========================================
// 🧭 그리드 인덱스 도우미 함수
// ==========================================
// 1차원 인덱스를 2차원 좌표로 변환
function indexToCoords(index) {
  return {
    row: Math.floor(index / BOARD_SIZE),
    col: index % BOARD_SIZE
  };
}

// 2차원 좌표를 1차원 인덱스로 변환
function coordsToIndex(row, col) {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return -1;
  return row * BOARD_SIZE + col;
}

// 특정 셀의 인접한 상하좌우(4방향) 인덱스 리스트 반환
function getAdjacents(index) {
  const { row, col } = indexToCoords(index);
  const directions = [
    { r: -1, c: 0 }, // 상
    { r: 1, c: 0 },  // 하
    { r: 0, c: -1 }, // 좌
    { r: 0, c: 1 }   // 우
  ];
  
  return directions
    .map(d => coordsToIndex(row + d.r, col + d.c))
    .filter(idx => idx !== -1); // 유효한 격자 범위 내 인덱스만 필터링
}

// ==========================================
// 🔄 화면 전환 (Screen Navigation)
// ==========================================
function switchScreen(toScreen) {
  [screenIntro, screenGame, screenResult].forEach(scr => {
    scr.classList.remove('active');
  });
  toScreen.classList.add('active');
}

// ==========================================
// 🎨 UI 렌더링 동기화
// ==========================================
function renderBoard() {
  gameBoard.innerHTML = '';
  
  for (let i = 0; i < TOTAL_CELLS; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.index = i;
    
    // 상태별 CSS 클래스 추가
    switch (boardState[i]) {
      case STATE_EMPTY:
        cell.classList.add('empty');
        break;
      case STATE_PLAYER_COIN:
        cell.classList.add('player-coin');
        const pCoin = document.createElement('div');
        pCoin.classList.add('coin-token');
        cell.appendChild(pCoin);
        break;
      case STATE_PC_COIN:
        cell.classList.add('pc-coin');
        const cCoin = document.createElement('div');
        cCoin.classList.add('coin-token');
        cell.appendChild(cCoin);
        break;
      case STATE_PLAYER_TERRITORY:
        cell.classList.add('player-territory');
        break;
      case STATE_PC_TERRITORY:
        cell.classList.add('pc-territory');
        break;
    }
    
    // 플레이어 턴일 때만 빈 셀 클릭 가능
    if (boardState[i] === STATE_EMPTY && currentTurn === 'player' && !isGameOver) {
      cell.addEventListener('click', () => handleCellClick(i));
    }
    
    gameBoard.appendChild(cell);
  }
  
  updateScores();
}

// 점수 실시간 합산 및 UI 반영
function updateScores() {
  let playerScore = 0;
  let pcScore = 0;
  
  boardState.forEach(state => {
    if (state === STATE_PLAYER_COIN || state === STATE_PLAYER_TERRITORY) {
      playerScore++;
    } else if (state === STATE_PC_COIN || state === STATE_PC_TERRITORY) {
      pcScore++;
    }
  });
  
  playerLabel.textContent = playerScore;
  pcLabel.textContent = pcScore;
}

// ==========================================
// ⚔️ 코인 배치 및 영토 갱신 핵심 로직
// ==========================================
function placeCoin(index, isPlayer) {
  const coinState = isPlayer ? STATE_PLAYER_COIN : STATE_PC_COIN;
  const territoryState = isPlayer ? STATE_PLAYER_TERRITORY : STATE_PC_TERRITORY;
  const flashClass = isPlayer ? 'flash-red' : 'flash-blue';
  
  // 1. 코인 배치
  boardState[index] = coinState;
  
  // 2. 인접 영역(상하좌우) 스캔 및 영토화
  const adjacents = getAdjacents(index);
  const affectedCells = [];
  
  adjacents.forEach(adjIdx => {
    const currentCellState = boardState[adjIdx];
    
    // 이미 코인(돌)이 놓여 있는 칸은 뺏을 수 없음
    if (currentCellState !== STATE_PLAYER_COIN && currentCellState !== STATE_PC_COIN) {
      // 빈칸이거나 상대방 영토일 경우 내 영토로 소유권 변경
      if (currentCellState !== territoryState) {
        boardState[adjIdx] = territoryState;
        affectedCells.push(adjIdx);
      }
    }
  });
  
  // 3. UI 리렌더링 및 점령 애니메이션 효과 부여
  renderBoard();
  sounds.playCoinSound(isPlayer);
  
  // 새로 획득되거나 변경된 칸에 플래시 효과 주기
  affectedCells.forEach(idx => {
    const cellEl = gameBoard.querySelector(`.cell[data-index="${idx}"]`);
    if (cellEl) {
      cellEl.classList.add(flashClass);
      // 애니메이션 종료 후 클래스 자동 제거
      cellEl.addEventListener('animationend', () => {
        cellEl.classList.remove(flashClass);
      }, { once: true });
    }
  });
  
  if (affectedCells.length > 0) {
    sounds.playClaimSound();
  }
}

// ==========================================
// 🤖 똑똑한 컴퓨터 AI 로직 (Simulated Greedy AI)
// ==========================================
function getBestMoveForPC() {
  const emptyIndices = [];
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (boardState[i] === STATE_EMPTY) {
      emptyIndices.push(i);
    }
  }
  
  // 빈 칸이 없으면 움직일 수 없음
  if (emptyIndices.length === 0) return -1;
  
  let bestScore = -100; // 음수 기본값으로 시작
  let bestMoves = [];
  
  emptyIndices.forEach(idx => {
    let score = 0;
    
    // 규칙 시뮬레이션: 이 칸에 PC 코인을 놓았을 때 획득/전환할 수 있는 칸 수 평가
    const adjacents = getAdjacents(idx);
    
    // 1. 기본 획득: 돌을 두는 칸 자체 (+1점)
    score += 1;
    
    adjacents.forEach(adjIdx => {
      const state = boardState[adjIdx];
      if (state === STATE_EMPTY) {
        // 빈칸을 내 땅으로 만들 때 (+1점)
        score += 1;
      } else if (state === STATE_PLAYER_TERRITORY) {
        // 플레이어의 땅을 빼앗아올 때 (+2점: 내 땅 늘고 상대 땅 줄어듦)
        score += 2;
      } else if (state === STATE_PC_TERRITORY) {
        // 이미 자기 땅인 곳은 큰 의미 없음 (+0점)
        score += 0;
      }
    });
    
    // 2. 가중치 보정 (외곽보다 중심부가 더 넓은 영향력을 가지므로 추가 가중치 부여)
    // 6x6 격자에서 중심부 4칸(row 2,3 & col 2,3)은 사방이 트여있어 기회가 큼
    const { row, col } = indexToCoords(idx);
    if ((row === 2 || row === 3) && (col === 2 || col === 3)) {
      score += 0.2; // 미세한 중심부 가중치
    } else if (row === 0 || row === 5 || col === 0 || col === 5) {
      score -= 0.1; // 구석 모서리 가중치 페널티
    }
    
    // 최고 점수 갱신
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [idx];
    } else if (score === bestScore) {
      bestMoves.push(idx);
    }
  });
  
  // 최고 후보군 중 무작위 선택하여 복잡도 감소 및 자연스러운 난이도 연출
  const randomIndex = Math.floor(Math.random() * bestMoves.length);
  return bestMoves[randomIndex];
}

// PC의 턴 실행 프로세스
function runPCTurn() {
  currentTurn = 'pc';
  turnIndicator.textContent = 'PC THINKING...';
  turnIndicator.className = 'turn-badge pc-turn';
  
  // 클릭 비활성화를 위해 임시 리렌더링
  renderBoard();
  
  // 컴퓨터가 생각하는 느낌의 딜레이 연출 (1초)
  setTimeout(() => {
    if (isGameOver) return;
    
    const bestMove = getBestMoveForPC();
    
    if (bestMove !== -1) {
      placeCoin(bestMove, false);
    }
    
    // 게임 종료 여부 검사
    if (checkGameOver()) {
      endGame();
    } else {
      // 다시 플레이어 턴으로 변경
      currentTurn = 'player';
      turnIndicator.textContent = 'YOUR TURN';
      turnIndicator.className = 'turn-badge player-turn';
      renderBoard();
    }
  }, 1000);
}

// ==========================================
// 🖱️ 플레이어 인터랙션
// ==========================================
function handleCellClick(index) {
  if (isGameOver || currentTurn !== 'player') return;
  if (boardState[index] !== STATE_EMPTY) return;
  
  // 플레이어 코인 두기
  placeCoin(index, true);
  
  // 게임 종료 여부 검사
  if (checkGameOver()) {
    endGame();
  } else {
    // 컴퓨터의 턴으로 전환
    runPCTurn();
  }
}

// 기권하기
btnGiveup.addEventListener('click', () => {
  sounds.playClick();
  if (confirm('정말로 기권하고 게임을 종료하시겠습니까?')) {
    isGameOver = true;
    endGame(true); // PC 강제 승리
  }
});

// ==========================================
// 🏁 게임 종료 및 결과 처리
// ==========================================
function checkGameOver() {
  // 빈 칸이 단 하나라도 남아있는지 판별
  return !boardState.includes(STATE_EMPTY);
}

function endGame(forceGiveUp = false) {
  isGameOver = true;
  
  let playerScore = 0;
  let pcScore = 0;
  
  if (forceGiveUp) {
    playerScore = 0;
    pcScore = TOTAL_CELLS;
  } else {
    boardState.forEach(state => {
      if (state === STATE_PLAYER_COIN || state === STATE_PLAYER_TERRITORY) {
        playerScore++;
      } else if (state === STATE_PC_COIN || state === STATE_PC_TERRITORY) {
        pcScore++;
      }
    });
  }
  
  // 최종 결과 텍스트 바인딩
  finalPlayerScore.textContent = playerScore;
  finalPcScore.textContent = pcScore;
  
  if (playerScore > pcScore) {
    resultTitle.textContent = 'YOU WIN';
    resultTitle.className = 'result-banner win';
    resultDesc.textContent = '🏆 축하합니다! 완벽한 전략으로 컴퓨터를 꺾고 영토를 지배했습니다!';
    sounds.playWinSound();
  } else if (playerScore < pcScore) {
    resultTitle.textContent = 'YOU LOSE';
    resultTitle.className = 'result-banner lose';
    resultDesc.textContent = '🤖 컴퓨터의 영리한 수에 영토를 모두 빼앗겼습니다. 다시 시도해 보세요!';
    sounds.playLoseSound();
  } else {
    resultTitle.textContent = 'DRAW';
    resultTitle.className = 'result-banner draw';
    resultDesc.textContent = '⚖️ 팽팽한 대결 끝에 승부를 가리지 못했습니다. 한 판 더 붙어볼까요?';
    sounds.playWinSound(); // 무승부도 팡파르 재생
  }
  
  setTimeout(() => {
    switchScreen(screenResult);
  }, 1200);
}

// ==========================================
// 🚀 게임 리셋 및 초기화
// ==========================================
function initGame() {
  boardState = Array(TOTAL_CELLS).fill(STATE_EMPTY);
  currentTurn = 'player';
  isGameOver = false;
  
  // 스크린 초기화 및 보드 생성
  turnIndicator.textContent = 'YOUR TURN';
  turnIndicator.className = 'turn-badge player-turn';
  
  renderBoard();
}

// ==========================================
// 🔗 이벤트 리스너 바인딩
// ==========================================
btnStart.addEventListener('click', () => {
  sounds.playClick();
  initGame();
  switchScreen(screenGame);
});

btnRestart.addEventListener('click', () => {
  sounds.playClick();
  initGame();
  switchScreen(screenGame);
});
