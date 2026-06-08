// =============================================================
// 4인 대전 포커 게임 - 게임 두뇌 v2 (js/poker-game.js)
// 규칙: 배팅 없음, 최대 5장, 2라운드(1라: 4장 배포, 2라: +1장), 퇴장 시 자동 Die
// =============================================================
import {
  database, isFirebaseInitialized, firebaseConfig,
  ref, set, get, update, push, remove, onValue, off, onDisconnect
} from "./firebase-config.js";

import { createShuffledDeck, evaluate7CardHand, determineWinner } from "./poker-logic.js";

// -----------------------------------------------
// 게임 규칙 상수 (확정)
// -----------------------------------------------
const SEAT_AVATARS  = ['🤵', '👩‍💼', '🥷', '🧙‍♂️'];
const TURN_SECONDS  = 15;
const ROOM_PATH     = "poker_room";
const MAX_CARDS     = 5;   // 최대 5장
const INITIAL_CARDS = 4;   // 시작 시 4장 배포
const MAX_ROUNDS    = 2;   // 총 2라운드 (라운드 1: 액션, 라운드 2: +1장 후 액션 → 판정)

// -----------------------------------------------
// DOM 요소 취득
// -----------------------------------------------
const connectionWarning    = document.getElementById("connectionWarning");
const bannerSettingsBtn    = document.getElementById("bannerSettingsBtn");
const settingsBtn          = document.getElementById("settingsBtn");
const roomStatusBadge      = document.getElementById("roomStatusBadge");
const roundIndicator       = document.getElementById("roundIndicator");
const gameLogs             = document.getElementById("gameLogs");

// 좌석 관련
const seatEls    = [0,1,2,3].map(i => document.getElementById(`seat-${i}`));
const cardEls    = [0,1,2,3].map(i => document.getElementById(`cards-${i}`));

// 컨트롤
const lobbyControls  = document.getElementById("lobbyControls");
const gameControls   = document.getElementById("gameControls");
const readyBtn       = document.getElementById("readyBtn");
const startBtn       = document.getElementById("startBtn");
const goBtn          = document.getElementById("goBtn");
const dieBtn         = document.getElementById("dieBtn");
const spectatorAlert = document.getElementById("spectatorAlert");

// 타이머
const timerProgress  = document.getElementById("timerProgress");
const timerText      = document.getElementById("timerText");

// 모달
const entranceModal  = document.getElementById("entranceModal");
const pokerNickname  = document.getElementById("pokerNickname");
const enterGameBtn   = document.getElementById("enterGameBtn");
const settingsModal  = document.getElementById("settingsModal");
const cfgApiKey      = document.getElementById("cfgApiKey");
const cfgDbUrl       = document.getElementById("cfgDbUrl");
const cfgProjectId   = document.getElementById("cfgProjectId");
const cfgAuthDomain  = document.getElementById("cfgAuthDomain");
const cfgBucket      = document.getElementById("cfgBucket");
const cfgSenderId    = document.getElementById("cfgSenderId");
const cfgAppId       = document.getElementById("cfgAppId");
const saveSettingsBtn   = document.getElementById("saveSettingsBtn");
const cancelSettingsBtn = document.getElementById("cancelSettingsBtn");
const resetSettingsBtn  = document.getElementById("resetSettingsBtn");

// 결과 오버레이
const resultOverlay  = document.getElementById("resultOverlay");
const winnerName     = document.getElementById("winnerName");
const winnerHand     = document.getElementById("winnerHand");

// -----------------------------------------------
// 상태 변수
// -----------------------------------------------
let mySessionId = null;
let myNickname  = null;
let mySeat      = null;
let isSpectator = false;

let roomState        = null;
let turnTimer        = null;
let turnSecondsLeft  = TURN_SECONDS;
let lastWinnerShown  = null; // 결과창 중복 표시 방지

// -----------------------------------------------
// 세션 ID
// -----------------------------------------------
function getSessionId() {
  let id = sessionStorage.getItem("poker_session_id");
  if (!id) {
    id = "ps_" + Math.random().toString(36).substring(2, 11);
    sessionStorage.setItem("poker_session_id", id);
  }
  return id;
}

// -----------------------------------------------
// 로그 출력
// -----------------------------------------------
function addLog(msg, type = "") {
  const el = document.createElement("div");
  el.className = `log-item ${type}`;
  el.textContent = msg;
  gameLogs.appendChild(el);
  gameLogs.scrollTop = gameLogs.scrollHeight;
  while (gameLogs.children.length > 50) gameLogs.removeChild(gameLogs.firstChild);
}

// -----------------------------------------------
// 카드 렌더링
// -----------------------------------------------
const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED_SUITS    = new Set(['H', 'D']);

function renderCard(cardCode, hidden = false) {
  const el = document.createElement("div");
  el.className = "poker-card";
  if (hidden || !cardCode) {
    el.classList.add("hidden");
    return el;
  }
  const suit  = cardCode[0];
  const value = cardCode.substring(1);
  el.classList.add(RED_SUITS.has(suit) ? "red" : "black");
  el.innerHTML = `<span class="card-value">${value}</span><span class="card-suit">${SUIT_SYMBOLS[suit] || suit}</span>`;
  return el;
}

// -----------------------------------------------
// 좌석 UI 업데이트
// -----------------------------------------------
function updateSeatUI(seat, participant, sId, currentTurn) {
  const seatEl    = seatEls[seat];
  const cardArea  = cardEls[seat];
  const emptyTxt  = seatEl.querySelector(".seat-empty-text");
  const profile   = seatEl.querySelector(".player-profile");
  const readyBdg  = seatEl.querySelector(".ready-badge");
  const nameEl    = seatEl.querySelector(".player-name");
  const statusBar = seatEl.querySelector(".player-status-bar");
  const avatarEl  = seatEl.querySelector(".player-avatar");

  if (!participant) {
    emptyTxt.style.display = "";
    profile.style.display  = "none";
    cardArea.innerHTML     = "";
    return;
  }

  emptyTxt.style.display = "none";
  profile.style.display  = "";
  nameEl.textContent     = participant.nickname;
  avatarEl.textContent   = SEAT_AVATARS[seat] || '🃏';

  profile.classList.toggle("is-host", sId === roomState?.host);

  // Ready 뱃지
  readyBdg.classList.toggle("visible", !!participant.isReady);

  // 생사 상태
  const isDead         = participant.status === "die";
  const isDisconnected = participant.status === "disconnected";
  profile.classList.toggle("is-dead", isDead || isDisconnected);

  // 현재 턴 강조
  const isTurnNow = sId === currentTurn;
  profile.classList.toggle("my-turn", isTurnNow && !isDead && !isDisconnected);

  // 턴 인디케이터
  profile.querySelector(".turn-indicator")?.remove();
  if (isTurnNow && !isDead && !isDisconnected) {
    const ind = document.createElement("div");
    ind.className   = "turn-indicator";
    ind.textContent = sId === mySessionId ? "내 차례!" : `${participant.nickname}의 차례`;
    profile.appendChild(ind);
  }

  // 상태바 텍스트
  if (participant.status === "spectating")       statusBar.textContent = "관전 중";
  else if (isDisconnected)                       statusBar.textContent = "연결 끊김 ⚡";
  else if (isDead)                               statusBar.textContent = "Die 🪦";
  else if (participant.isReady)                  statusBar.textContent = "준비 완료!";
  else                                           statusBar.textContent = "대기 중";

  // 카드 렌더링
  // 5장 룰 기준: 내 카드 전부 공개 / 상대방 4장까지 히든, 5번째(마지막) 공개
  cardArea.innerHTML = "";
  const cards = participant.cards || [];
  const isMe  = sId === mySessionId;
  cards.forEach((card, idx) => {
    // 상대방 카드: 처음 4장은 히든, 5번째는 공개 (2라운드 결과 비교용)
    const shouldHide = !isMe && idx < 4;
    cardArea.appendChild(renderCard(card, shouldHide));
  });
}

// -----------------------------------------------
// 전체 방 상태 렌더링
// -----------------------------------------------
function renderRoomState(state) {
  if (!state) return;
  roomState = state;

  const participants = state.participants || {};
  const currentTurn  = state.currentTurn;
  const isPlaying    = state.status === "playing";

  // 상태 배지 & 라운드 표시
  roomStatusBadge.textContent = isPlaying ? "게임 중" : "대기 중";
  roomStatusBadge.className   = `status-badge ${isPlaying ? "playing" : "waiting"}`;

  if (isPlaying) {
    const round = state.round || 1;
    roundIndicator.textContent = round === 1
      ? "🃏 라운드 1 — Go/Die 선택"
      : "🃏 라운드 2 — 최후의 선택 (카드 +1장)";
  } else {
    roundIndicator.textContent = "대기 상태";
  }

  // 좌석 UI
  for (let seat = 0; seat < 4; seat++) {
    const entry = Object.entries(participants).find(([, p]) => p.seat === seat);
    entry ? updateSeatUI(seat, entry[1], entry[0], currentTurn)
          : updateSeatUI(seat, null, null, currentTurn);
  }

  // 관전자
  if (isSpectator) {
    spectatorAlert.style.display = "";
    lobbyControls.style.display  = "none";
    gameControls.style.display   = "none";
    return;
  }

  spectatorAlert.style.display = "none";

  if (!isPlaying) {
    lobbyControls.style.display = "";
    gameControls.style.display  = "none";

    const me = participants[mySessionId];
    readyBtn.classList.toggle("ready-active", !!me?.isReady);
    readyBtn.textContent = me?.isReady ? "✅ 준비 완료!" : "✨ 준비 완료";

    // 방장 + 2명 이상 + 모두 레디일 때 시작 버튼 활성
    const isHost       = mySessionId === state.host;
    const activePlayers = Object.values(participants).filter(p => p.status !== "spectating");
    const allReady     = activePlayers.length >= 2 && activePlayers.every(p => p.isReady);
    startBtn.disabled  = !(isHost && allReady);

    stopTurnTimer();
  } else {
    lobbyControls.style.display = "none";
    gameControls.style.display  = "";

    const isMyTurn = currentTurn === mySessionId;
    const me       = participants[mySessionId];
    const isDead   = me?.status === "die" || me?.status === "disconnected";

    goBtn.disabled  = !isMyTurn || isDead;
    dieBtn.disabled = !isMyTurn || isDead;

    if (isMyTurn && !isDead) {
      // 내 턴: disconnected 상태라면 자동 Die (다른 탭에서 끊긴 경우 감지)
      if (me?.status === "disconnected") {
        stopTurnTimer();
        addLog(`⚡ ${myNickname}: 연결 끊김 - 자동 Die 처리`, "action-die");
        performAction("die");
      } else {
        startTurnTimer();
      }
    } else {
      stopTurnTimer();
      // 현재 턴 플레이어의 disconnected 자동 Die 처리 (방장이 대신 처리)
      if (currentTurn && participants[currentTurn]?.status === "disconnected" && mySessionId === state.host) {
        handleDisconnectedPlayerTurn(currentTurn, participants);
      }

      const turnPlayer = currentTurn ? participants[currentTurn] : null;
      if (turnPlayer && turnPlayer.status !== "disconnected") {
        timerText.textContent = `${turnPlayer.nickname}의 차례`;
      }
      timerProgress.style.setProperty("--timer-pct", "100%");
      timerProgress.classList.remove("urgent");
    }

    // 승자 정보 표시 (중복 방지)
    if (state.winner && state.winner.sessionId !== lastWinnerShown) {
      lastWinnerShown = state.winner.sessionId;
      showResult(state.winner);
    }
  }
}

// -----------------------------------------------
// 연결 끊긴 플레이어 자동 Die (방장이 대신 실행)
// -----------------------------------------------
async function handleDisconnectedPlayerTurn(disconnectedSid, participants) {
  const state = roomState;
  if (!state || state.currentTurn !== disconnectedSid) return;

  addLog(`⚡ ${participants[disconnectedSid]?.nickname || "플레이어"}: 연결 끊김 - 자동 Die`, "action-die");

  const updates = {};
  updates[`${ROOM_PATH}/participants/${disconnectedSid}/status`] = "die";

  // 다음 턴 계산
  const { nextTurnSid, newRound, isGameOver } = calcNextTurn(
    disconnectedSid, "die", participants, state
  );

  if (isGameOver) {
    await update(ref(database), updates);
    await endGame();
    return;
  }

  if (newRound !== null) {
    updates[`${ROOM_PATH}/round`]       = newRound;
    updates[`${ROOM_PATH}/actionCount`] = 0;
    addLog(`▶️ 라운드 ${newRound} 시작!`, "system");

    if (newRound > MAX_ROUNDS) {
      await update(ref(database), updates);
      await endGame();
      return;
    }

    // 라운드 2 전환 시 생존자에게 카드 +1장 배포
    if (newRound === 2) {
      await distributeRound2Cards(updates, participants, disconnectedSid, "die");
      return;
    }
  }

  updates[`${ROOM_PATH}/currentTurn`]  = nextTurnSid;
  updates[`${ROOM_PATH}/actionCount`]  = newRound !== null ? 0 : (state.actionCount || 0) + 1;
  await update(ref(database), updates);
}

// -----------------------------------------------
// 타이머
// -----------------------------------------------
function startTurnTimer() {
  stopTurnTimer();
  turnSecondsLeft = TURN_SECONDS;
  timerText.textContent = `내 차례: ${turnSecondsLeft}s`;
  timerProgress.style.setProperty("--timer-pct", "100%");
  timerProgress.classList.remove("urgent");

  turnTimer = setInterval(() => {
    turnSecondsLeft--;
    const pct = Math.max(0, (turnSecondsLeft / TURN_SECONDS) * 100);
    timerProgress.style.setProperty("--timer-pct", `${pct}%`);
    timerText.textContent = `내 차례: ${turnSecondsLeft}s`;
    if (turnSecondsLeft <= 5) timerProgress.classList.add("urgent");
    if (turnSecondsLeft <= 0) {
      stopTurnTimer();
      addLog(`⏰ ${myNickname}: 시간 초과 - 자동 Die`, "action-die");
      performAction("die");
    }
  }, 1000);
}

function stopTurnTimer() {
  if (turnTimer) { clearInterval(turnTimer); turnTimer = null; }
}

// -----------------------------------------------
// 입장 처리
// -----------------------------------------------
async function joinRoom(nickname) {
  myNickname  = nickname;
  mySessionId = getSessionId();

  const snapshot = await get(ref(database, ROOM_PATH));
  const state    = snapshot.val();
  const participants   = state?.participants || {};
  const existingSeats  = Object.values(participants).map(p => p.seat);

  // 기존 세션 재접속 처리
  if (participants[mySessionId]) {
    const me = participants[mySessionId];
    mySeat      = me.seat;
    isSpectator = me.status === "spectating";
    // 게임 중 재접속: disconnected → active 복원
    if (me.status === "disconnected") {
      await update(ref(database, `${ROOM_PATH}/participants/${mySessionId}`), { status: "active" });
      addLog(`🔌 ${nickname} 님이 재접속했습니다.`, "system");
    } else {
      addLog(`✅ ${nickname} 님, 이전 세션으로 재접속했습니다.`, "system");
    }
    setupOnDisconnect();
    listenToRoom();
    return;
  }

  const activePlayers = Object.values(participants).filter(p => p.status !== "spectating");
  const isGamePlaying = state?.status === "playing";
  const freeSeats     = [0, 1, 2, 3].filter(s => !existingSeats.includes(s));
  const canJoin       = freeSeats.length > 0 && !isGamePlaying;

  const updates = {};

  if (canJoin) {
    mySeat      = freeSeats[0];
    isSpectator = false;
    updates[`${ROOM_PATH}/participants/${mySessionId}`] = {
      nickname, isReady: false, cards: [], status: "active", seat: mySeat
    };
    if (activePlayers.length === 0 || !state?.host) {
      updates[`${ROOM_PATH}/status`] = "waiting";
      updates[`${ROOM_PATH}/host`]   = mySessionId;
    }
    await update(ref(database), updates);
    addLog(`🎉 ${nickname} 님이 좌석 ${mySeat + 1}번에 입장했습니다.`, "system");
  } else {
    mySeat      = null;
    isSpectator = true;
    updates[`${ROOM_PATH}/participants/${mySessionId}`] = {
      nickname, isReady: false, cards: [], status: "spectating", seat: -1
    };
    await update(ref(database), updates);
    addLog(`👁️ ${nickname} 님이 관전 모드로 입장했습니다.`, "system");
  }

  setupOnDisconnect();
  listenToRoom();
}

// -----------------------------------------------
// onDisconnect 설정 (연결 끊김 시 자동 처리)
// -----------------------------------------------
function setupOnDisconnect() {
  // 연결 끊기면 내 상태를 "disconnected"로 바꿔 다른 클라이언트가 감지할 수 있게 함
  // (완전 삭제 대신 disconnected 상태로 남겨서 자동 Die 로직이 작동하도록 설계)
  onDisconnect(ref(database, `${ROOM_PATH}/participants/${mySessionId}/status`))
    .set("disconnected");
}

function getNextHost() {
  if (!roomState) return null;
  return Object.keys(roomState.participants || {})
    .find(id => id !== mySessionId && roomState.participants[id].status !== "spectating") || null;
}

// -----------------------------------------------
// Firebase 실시간 구독
// -----------------------------------------------
function listenToRoom() {
  onValue(ref(database, ROOM_PATH), async (snapshot) => {
    const state = snapshot.val();
    if (!state) {
      addLog("🔄 게임룸이 초기화되었습니다.", "system");
      roomState = null;
      return;
    }
    // 내 세션이 DB에 없으면 재입장
    if (state.participants && !state.participants[mySessionId] && myNickname) {
      await joinRoom(myNickname);
      return;
    }
    renderRoomState(state);
  });
}

// -----------------------------------------------
// 레디 토글
// -----------------------------------------------
async function toggleReady() {
  if (!roomState) return;
  const me = roomState.participants?.[mySessionId];
  if (!me) return;
  const newReady = !me.isReady;
  await update(ref(database, `${ROOM_PATH}/participants/${mySessionId}`), { isReady: newReady });
  addLog(`${myNickname}: ${newReady ? "준비 완료!" : "준비 취소"}`, "system");
}

// -----------------------------------------------
// 게임 시작 (방장 전용)
// -----------------------------------------------
async function startGame() {
  if (mySessionId !== roomState?.host) return;
  const participants = roomState.participants || {};
  const activePlayers = Object.entries(participants)
    .filter(([, p]) => p.status !== "spectating")
    .sort(([, a], [, b]) => a.seat - b.seat);

  if (activePlayers.length < 2) { alert("최소 2명 이상이어야 게임을 시작할 수 있습니다."); return; }
  if (!activePlayers.every(([, p]) => p.isReady)) { alert("모든 플레이어가 준비 완료해야 시작할 수 있습니다."); return; }

  addLog("🎮 게임 시작! 카드 4장씩 배분합니다...", "system");

  const deck     = createShuffledDeck();
  let deckIdx    = 0;
  const updates  = {};
  const turnOrder = [];

  // 라운드 1: 각자 INITIAL_CARDS(4)장 배포
  activePlayers.forEach(([sid]) => {
    const cards = [];
    for (let i = 0; i < INITIAL_CARDS; i++) cards.push(deck[deckIdx++]);
    updates[`${ROOM_PATH}/participants/${sid}/cards`]   = cards;
    updates[`${ROOM_PATH}/participants/${sid}/isReady`] = false;
    updates[`${ROOM_PATH}/participants/${sid}/status`]  = "active";
    turnOrder.push(sid);
  });

  const remainingDeck = deck.slice(deckIdx);

  updates[`${ROOM_PATH}/status`]      = "playing";
  updates[`${ROOM_PATH}/deck`]        = remainingDeck;
  updates[`${ROOM_PATH}/turnOrder`]   = turnOrder;
  updates[`${ROOM_PATH}/currentTurn`] = turnOrder[0];
  updates[`${ROOM_PATH}/round`]       = 1;
  updates[`${ROOM_PATH}/actionCount`] = 0;
  updates[`${ROOM_PATH}/winner`]      = null;

  await update(ref(database), updates);
  addLog(`▶️ 라운드 1 시작 - ${participants[turnOrder[0]].nickname}부터 시작! (각자 4장 보유)`, "system");
}

// -----------------------------------------------
// 다음 턴 계산 헬퍼
// -----------------------------------------------
function calcNextTurn(actorSid, action, participants, state) {
  const turnOrder = state.turnOrder || [];

  // 이번 액션 후 생존자 목록
  const survivors = Object.entries(participants).filter(([sid, p]) => {
    if (sid === actorSid) return action !== "die";
    return p.status === "active";
  });

  // 1명 이하 생존 → 게임 종료
  if (survivors.length <= 1) {
    return { nextTurnSid: null, newRound: null, isGameOver: true };
  }

  const actionCount  = (state.actionCount || 0) + 1;
  // 이번 라운드에서 액션해야 하는 인원 (현재 active인 사람)
  const activeCount  = Object.values(participants).filter(p => p.status === "active").length;

  if (actionCount >= activeCount) {
    // 라운드 종료
    const newRound = (state.round || 1) + 1;
    return { nextTurnSid: null, newRound, isGameOver: newRound > MAX_ROUNDS };
  }

  // 라운드 내 다음 턴
  const curIdx = turnOrder.indexOf(actorSid);
  let nextIdx  = (curIdx + 1) % turnOrder.length;
  let nextSid  = null;
  for (let i = 0; i < turnOrder.length; i++) {
    const sid = turnOrder[nextIdx];
    const p   = participants[sid];
    const alive = (sid === actorSid) ? action !== "die" : p?.status === "active";
    if (alive) { nextSid = sid; break; }
    nextIdx = (nextIdx + 1) % turnOrder.length;
  }

  return { nextTurnSid: nextSid, newRound: null, isGameOver: false };
}

// -----------------------------------------------
// 라운드 2 카드 배포 헬퍼 (생존자에게 +1장씩)
// -----------------------------------------------
async function distributeRound2Cards(baseUpdates, participants, actorSid, action) {
  const deck     = [...(roomState.deck || [])];
  const turnOrder = roomState.turnOrder || [];
  const updates  = { ...baseUpdates };

  const survivors = turnOrder.filter(sid => {
    if (sid === actorSid) return action !== "die";
    return participants[sid]?.status === "active";
  });

  // 각 생존자에게 카드 1장 추가
  survivors.forEach(sid => {
    if (deck.length > 0) {
      const newCard = deck.shift();
      const curCards = [...(participants[sid]?.cards || [])];
      curCards.push(newCard);
      updates[`${ROOM_PATH}/participants/${sid}/cards`] = curCards;
    }
  });

  updates[`${ROOM_PATH}/deck`]        = deck;
  updates[`${ROOM_PATH}/round`]       = 2;
  updates[`${ROOM_PATH}/actionCount`] = 0;
  // 라운드 2 첫 턴: 생존자 중 턴 순서상 첫 번째
  const firstSid = turnOrder.find(sid => survivors.includes(sid));
  updates[`${ROOM_PATH}/currentTurn`] = firstSid || null;

  await update(ref(database), updates);
  addLog(`▶️ 라운드 2 시작! 생존자에게 카드 1장 추가 배포 완료 🃏`, "system");
}

// -----------------------------------------------
// 액션 처리 (Go / Die)
// -----------------------------------------------
async function performAction(action) {
  if (!roomState || roomState.currentTurn !== mySessionId) return;
  if (isSpectator) return;

  const participants = roomState.participants || {};
  const me = participants[mySessionId];
  if (!me || me.status === "die" || me.status === "disconnected") return;

  stopTurnTimer();

  const updates = {};

  if (action === "die") {
    updates[`${ROOM_PATH}/participants/${mySessionId}/status`] = "die";
    addLog(`${myNickname}: Die 🪦`, "action-die");
  } else {
    // Go: 라운드 1에서는 추가 카드 없음 (4장 고정), 라운드 2에서는 이미 분배 완료됨
    addLog(`${myNickname}: Go ✅`, "action-go");
  }

  const { nextTurnSid, newRound, isGameOver } = calcNextTurn(mySessionId, action, participants, roomState);

  if (isGameOver) {
    await update(ref(database), updates);
    await endGame();
    return;
  }

  if (newRound !== null) {
    if (newRound > MAX_ROUNDS) {
      // 모든 라운드 완료 → 판정
      updates[`${ROOM_PATH}/round`]       = newRound;
      updates[`${ROOM_PATH}/actionCount`] = 0;
      await update(ref(database), updates);
      await endGame();
      return;
    }

    // 라운드 2로 전환 → 생존자에게 카드 1장씩 배포 후 첫 턴 시작
    await distributeRound2Cards(updates, participants, mySessionId, action);
    return;
  }

  updates[`${ROOM_PATH}/currentTurn`]  = nextTurnSid;
  updates[`${ROOM_PATH}/actionCount`]  = (roomState.actionCount || 0) + 1;
  await update(ref(database), updates);
}

// -----------------------------------------------
// 게임 종료 및 승자 판정 (방장 전용)
// -----------------------------------------------
async function endGame() {
  if (mySessionId !== roomState?.host) return;

  const participants = roomState.participants || {};
  const playerList = Object.entries(participants)
    .filter(([, p]) => p.status === "active" || p.status === "die")
    .map(([sid, p]) => ({
      sessionId: sid, nickname: p.nickname,
      cards: p.cards || [], status: p.status
    }));

  const result  = determineWinner(playerList);
  const updates = {};
  updates[`${ROOM_PATH}/winner`]      = result;
  updates[`${ROOM_PATH}/status`]      = "waiting";
  updates[`${ROOM_PATH}/currentTurn`] = null;

  // 모든 참가자 초기화
  Object.entries(participants).forEach(([sid, p]) => {
    if (p.status !== "spectating") {
      updates[`${ROOM_PATH}/participants/${sid}/isReady`] = false;
      updates[`${ROOM_PATH}/participants/${sid}/cards`]   = [];
      updates[`${ROOM_PATH}/participants/${sid}/status`]  = "active";
    }
  });

  await update(ref(database), updates);

  if (result) addLog(`🏆 ${result.nickname} 승리! (${result.rankName})`, "win");
}

// -----------------------------------------------
// 결과 오버레이
// -----------------------------------------------
function showResult(result) {
  if (!result) return;
  winnerName.textContent    = `🎉 ${result.nickname}`;
  winnerHand.textContent    = result.rankName;
  resultOverlay.style.display = "flex";
  setTimeout(() => { resultOverlay.style.display = "none"; }, 6000);
}

// -----------------------------------------------
// 퇴장 클린업
// -----------------------------------------------
async function cleanupOnLeave() {
  if (!roomState || !mySessionId) return;
  const participants = roomState.participants || {};
  const updates      = {};

  // 게임 중이면 삭제 대신 disconnected 상태로 남겨 자동 Die 처리
  const isPlaying = roomState.status === "playing";
  if (isPlaying && participants[mySessionId]?.status === "active") {
    updates[`${ROOM_PATH}/participants/${mySessionId}/status`] = "disconnected";
  } else {
    updates[`${ROOM_PATH}/participants/${mySessionId}`] = null;
  }

  // 방장 이탈 시 인계
  if (roomState.host === mySessionId) {
    const nextHost = Object.keys(participants).find(
      sid => sid !== mySessionId && participants[sid].status !== "spectating"
    );
    updates[`${ROOM_PATH}/host`] = nextHost || null;
  }

  const remaining = Object.keys(participants).filter(sid => sid !== mySessionId).length;
  if (remaining === 0) {
    await remove(ref(database, ROOM_PATH));
    return;
  }

  await update(ref(database), updates);
}

// -----------------------------------------------
// 설정 모달
// -----------------------------------------------
settingsBtn.addEventListener("click", () => {
  cfgApiKey.value     = firebaseConfig.apiKey || "";
  cfgDbUrl.value      = firebaseConfig.databaseURL || "";
  cfgProjectId.value  = firebaseConfig.projectId || "";
  cfgAuthDomain.value = firebaseConfig.authDomain || "";
  cfgBucket.value     = firebaseConfig.storageBucket || "";
  cfgSenderId.value   = firebaseConfig.messagingSenderId || "";
  cfgAppId.value      = firebaseConfig.appId || "";
  settingsModal.classList.add("active");
});
bannerSettingsBtn?.addEventListener("click", () => settingsModal.classList.add("active"));
cancelSettingsBtn.addEventListener("click", () => settingsModal.classList.remove("active"));

saveSettingsBtn.addEventListener("click", () => {
  localStorage.setItem("firebase_poker_config", JSON.stringify({
    apiKey: cfgApiKey.value.trim(), databaseURL: cfgDbUrl.value.trim(),
    projectId: cfgProjectId.value.trim(), authDomain: cfgAuthDomain.value.trim(),
    storageBucket: cfgBucket.value.trim(), messagingSenderId: cfgSenderId.value.trim(),
    appId: cfgAppId.value.trim()
  }));
  alert("설정이 저장되었습니다! 페이지를 새로고침하여 적용합니다.");
  window.location.reload();
});

resetSettingsBtn.addEventListener("click", () => {
  if (confirm("설정을 기본값으로 초기화하시겠습니까?")) {
    localStorage.removeItem("firebase_poker_config");
    alert("초기화되었습니다. 새로고침합니다.");
    window.location.reload();
  }
});

// -----------------------------------------------
// 버튼 이벤트 바인딩
// -----------------------------------------------
readyBtn.addEventListener("click", toggleReady);
startBtn.addEventListener("click", startGame);
goBtn.addEventListener("click", () => performAction("go"));
dieBtn.addEventListener("click", () => performAction("die"));

enterGameBtn.addEventListener("click", async () => {
  const nick = pokerNickname.value.trim();
  if (!nick) { alert("닉네임을 입력해 주세요."); pokerNickname.focus(); return; }
  if (!isFirebaseInitialized) {
    connectionWarning.style.display = "flex";
    alert("Firebase 연결 설정이 필요합니다. 상단 설정 버튼을 눌러주세요.");
    return;
  }
  enterGameBtn.textContent = "입장 중...";
  enterGameBtn.disabled    = true;
  try {
    await joinRoom(nick);
    sessionStorage.setItem("poker_nickname", nick);
    entranceModal.classList.remove("active");
  } catch (err) {
    console.error("입장 오류:", err);
    alert("게임 입장에 실패했습니다. Firebase 설정을 확인해 주세요.");
    enterGameBtn.textContent = "포커룸 입장";
    enterGameBtn.disabled    = false;
  }
});

pokerNickname.addEventListener("keydown", e => { if (e.key === "Enter") enterGameBtn.click(); });

window.addEventListener("beforeunload", () => { cleanupOnLeave(); });

// -----------------------------------------------
// 초기 Firebase 연결 상태 확인
// -----------------------------------------------
if (!isFirebaseInitialized) {
  connectionWarning.style.display = "flex";
  addLog("⚠️ Firebase 연결이 설정되지 않았습니다. 설정 버튼을 눌러주세요.", "system");
} else {
  addLog("🔌 Firebase 연결 완료! 닉네임을 입력하여 포커룸에 입장하세요.", "system");
}
