import {
  database,
  isFirebaseInitialized,
  firebaseConfig,
  ref,
  set,
  get,
  child,
  update,
  push,
  onValue
} from "./firebase-config.js";

// DOM 요소 취득
const connectionWarning = document.getElementById("connectionWarning");
const settingsBtn = document.getElementById("settingsBtn");
const openCreateModalBtn = document.getElementById("openCreateModalBtn");
const roomListContainer = document.getElementById("roomList");
const roomSearchInput = document.getElementById("roomSearchInput");

// 모달 및 모달 내부 요소들
const createRoomModal = document.getElementById("createRoomModal");
const createUsernameInput = document.getElementById("createUsername");
const roomTitleInput = document.getElementById("roomTitle");
const cancelCreateBtn = document.getElementById("cancelCreateBtn");
const confirmCreateBtn = document.getElementById("confirmCreateBtn");

const joinRoomModal = document.getElementById("joinRoomModal");
const joinUsernameInput = document.getElementById("joinUsername");
const cancelJoinBtn = document.getElementById("cancelJoinBtn");
const confirmJoinBtn = document.getElementById("confirmJoinBtn");

const settingsModal = document.getElementById("settingsModal");
const cfgApiKey = document.getElementById("cfgApiKey");
const cfgDbUrl = document.getElementById("cfgDbUrl");
const cfgProjectId = document.getElementById("cfgProjectId");
const cfgAuthDomain = document.getElementById("cfgAuthDomain");
const cfgBucket = document.getElementById("cfgBucket");
const cfgSenderId = document.getElementById("cfgSenderId");
const cfgAppId = document.getElementById("cfgAppId");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const cancelSettingsBtn = document.getElementById("cancelSettingsBtn");
const resetSettingsBtn = document.getElementById("resetSettingsBtn");

// 상태 변수
let activeRooms = {}; // 전체 방 데이터 캐시
let selectedRoomIdForJoin = null; // 참여 대기 중인 방 ID

// 고유 세션 ID 생성 또는 조회 (브라우저 세션 생명주기 동안 유지)
function getSessionId() {
  let sessionId = sessionStorage.getItem("chat_session_id");
  if (!sessionId) {
    sessionId = "user_" + Math.random().toString(36).substring(2, 11);
    sessionStorage.setItem("chat_session_id", sessionId);
  }
  return sessionId;
}

// 1. Firebase 연결 확인 및 UI 반영
function checkConnection() {
  if (!isFirebaseInitialized) {
    connectionWarning.style.display = "flex";
    roomListContainer.innerHTML = `
      <div class="no-rooms">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--danger)">
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>Firebase 연결 설정이 필요합니다.</p>
        <p style="font-size: 0.8rem; color: var(--text-secondary); text-align: center;">상단의 톱니바퀴 아이콘을 눌러 프로젝트 설정을 입력하세요.</p>
      </div>
    `;
    return false;
  }
  connectionWarning.style.display = "none";
  return true;
}

// 2. 채팅방 목록 실시간 바인딩
function listenToRooms() {
  if (!isFirebaseInitialized) return;

  const roomsRef = ref(database, "rooms");
  onValue(roomsRef, (snapshot) => {
    const data = snapshot.val();
    activeRooms = data || {};
    renderRoomList(activeRooms);
  }, (error) => {
    console.error("데이터베이스 읽기 에러:", error);
    roomListContainer.innerHTML = `
      <div class="no-rooms">
        <p style="color: var(--danger)">데이터베이스 로딩 오류</p>
        <p style="font-size: 0.8rem;">설정 및 보안 규칙을 확인해 주세요.</p>
      </div>
    `;
  });
}

// 3. 채팅방 목록 렌더링
function renderRoomList(rooms, filterText = "") {
  roomListContainer.innerHTML = "";
  
  const roomKeys = Object.keys(rooms);
  const filteredKeys = roomKeys.filter(key => {
    const room = rooms[key];
    const matchTitle = room.title && room.title.toLowerCase().includes(filterText.toLowerCase());
    const matchCreator = room.creator && room.creator.toLowerCase().includes(filterText.toLowerCase());
    return matchTitle || matchCreator;
  });

  if (filteredKeys.length === 0) {
    roomListContainer.innerHTML = `
      <div class="no-rooms">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <p>${filterText ? "검색 조건에 맞는 방이 없습니다." : "현재 개설된 채팅방이 없습니다. 첫 번째 방을 만들어 보세요!"}</p>
      </div>
    `;
    return;
  }

  // 생성 역순 정렬 (최신 방이 위로)
  filteredKeys.sort((a, b) => (rooms[b].createdAt || 0) - (rooms[a].createdAt || 0));

  filteredKeys.forEach(roomId => {
    const room = rooms[roomId];
    const userCount = room.userCount || 0;
    const isFull = userCount >= 2;

    const roomItem = document.createElement("div");
    roomItem.className = "room-item";
    roomItem.innerHTML = `
      <div class="room-info">
        <span class="room-title">${escapeHtml(room.title)}</span>
        <div class="room-meta">
          <span class="room-creator">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            ${escapeHtml(room.creator)}
          </span>
          <span>•</span>
          <span>${formatDate(room.createdAt)}</span>
        </div>
      </div>
      <span class="room-status ${isFull ? 'status-full' : 'status-waiting'}">
        ${userCount}/2 명
      </span>
    `;

    // 방 클릭 이벤트
    roomItem.addEventListener("click", () => handleRoomClick(roomId, room));
    roomListContainer.appendChild(roomItem);
  });
}

// HTML 이스케이프 (XSS 방지)
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 날짜 포맷 (오늘인 경우 시간만, 이전인 경우 날짜 표시)
function formatDate(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const today = new Date();
  
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 4. 방 클릭 이벤트 핸들러
function handleRoomClick(roomId, room) {
  const userCount = room.userCount || 0;
  if (userCount >= 2) {
    alert("죄송합니다. 1:1 대화방 정원(2명)이 가득 차 참여하실 수 없습니다.");
    return;
  }
  
  selectedRoomIdForJoin = roomId;
  joinUsernameInput.value = "";
  joinRoomModal.classList.add("active");
  joinUsernameInput.focus();
}

// 5. 방 만들기 동작
confirmCreateBtn.addEventListener("click", async () => {
  if (!checkConnection()) return;

  const nickname = createUsernameInput.value.trim();
  const roomTitle = roomTitleInput.value.trim();

  if (!nickname) {
    alert("사용할 닉네임을 입력해 주세요.");
    createUsernameInput.focus();
    return;
  }
  if (!roomTitle) {
    alert("채팅방 이름을 입력해 주세요.");
    roomTitleInput.focus();
    return;
  }

  try {
    const roomsRef = ref(database, "rooms");
    const newRoomRef = push(roomsRef);
    const roomId = newRoomRef.key;
    const sessionId = getSessionId();

    const newRoomData = {
      title: roomTitle,
      creator: nickname,
      userCount: 1,
      participants: {
        [sessionId]: nickname
      },
      createdAt: Date.now()
    };

    await set(newRoomRef, newRoomData);

    // 세션 정보 로컬 저장
    sessionStorage.setItem("chat_nickname", nickname);
    sessionStorage.setItem("chat_room_id", roomId);

    // 모달 닫고 채팅창으로 이동
    createRoomModal.classList.remove("active");
    window.location.href = `chat.html?roomId=${roomId}`;
  } catch (err) {
    console.error("방 생성 중 오류:", err);
    alert("방을 생성하는 데 실패했습니다. Firebase 구성을 확인해 주세요.");
  }
});

// 6. 방 참여 동작
confirmJoinBtn.addEventListener("click", async () => {
  if (!checkConnection() || !selectedRoomIdForJoin) return;

  const nickname = joinUsernameInput.value.trim();
  if (!nickname) {
    alert("사용할 닉네임을 입력해 주세요.");
    joinUsernameInput.focus();
    return;
  }

  const roomId = selectedRoomIdForJoin;
  const sessionId = getSessionId();

  try {
    // 최신 방 정보 다시 조회하여 빈 자리 있는지 최종 검증
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) {
      alert("존재하지 않는 방입니다.");
      joinRoomModal.classList.remove("active");
      return;
    }

    const room = snapshot.val();
    const userCount = room.userCount || 0;
    if (userCount >= 2) {
      alert("대기 중 다른 사용자가 입장하여 정원이 가득 찼습니다.");
      joinRoomModal.classList.remove("active");
      return;
    }

    // 데이터 업데이트
    const updates = {};
    updates[`rooms/${roomId}/userCount`] = userCount + 1;
    updates[`rooms/${roomId}/participants/${sessionId}`] = nickname;
    
    // 시스템 알림 메시지 삽입 준비
    const msgRef = ref(database, `messages/${roomId}`);
    const newMsgRef = push(msgRef);
    
    await update(ref(database), updates);

    // 입장 알림 메시지 전송
    await set(newMsgRef, {
      sender: "system",
      text: `${nickname} 님이 입장하셨습니다. 1:1 대화가 준비되었습니다!`,
      timestamp: Date.now()
    });

    sessionStorage.setItem("chat_nickname", nickname);
    sessionStorage.setItem("chat_room_id", roomId);

    joinRoomModal.classList.remove("active");
    window.location.href = `chat.html?roomId=${roomId}`;
  } catch (err) {
    console.error("방 참여 중 오류:", err);
    alert("방 참여에 실패했습니다. Firebase 설정을 점검해 보세요.");
  }
});

// 검색 이벤트 리스너
roomSearchInput.addEventListener("input", (e) => {
  renderRoomList(activeRooms, e.target.value.trim());
});

// 모달 여닫기 이벤트
openCreateModalBtn.addEventListener("click", () => {
  if (!checkConnection()) return;
  createUsernameInput.value = sessionStorage.getItem("chat_nickname") || "";
  roomTitleInput.value = "";
  createRoomModal.classList.add("active");
  if (createUsernameInput.value) {
    roomTitleInput.focus();
  } else {
    createUsernameInput.focus();
  }
});

cancelCreateBtn.addEventListener("click", () => createRoomModal.classList.remove("active"));
cancelJoinBtn.addEventListener("click", () => joinRoomModal.classList.remove("active"));

// settings 모달 관련 로직
settingsBtn.addEventListener("click", () => {
  cfgApiKey.value = firebaseConfig.apiKey || "";
  cfgDbUrl.value = firebaseConfig.databaseURL || "";
  cfgProjectId.value = firebaseConfig.projectId || "";
  cfgAuthDomain.value = firebaseConfig.authDomain || "";
  cfgBucket.value = firebaseConfig.storageBucket || "";
  cfgSenderId.value = firebaseConfig.messagingSenderId || "";
  cfgAppId.value = firebaseConfig.appId || "";
  settingsModal.classList.add("active");
});

cancelSettingsBtn.addEventListener("click", () => settingsModal.classList.remove("active"));

saveSettingsBtn.addEventListener("click", () => {
  const newConfig = {
    apiKey: cfgApiKey.value.trim(),
    databaseURL: cfgDbUrl.value.trim(),
    projectId: cfgProjectId.value.trim(),
    authDomain: cfgAuthDomain.value.trim(),
    storageBucket: cfgBucket.value.trim(),
    messagingSenderId: cfgSenderId.value.trim(),
    appId: cfgAppId.value.trim()
  };

  localStorage.setItem("firebase_config", JSON.stringify(newConfig));
  alert("설정이 저장되었습니다! 페이지를 새로고침하여 적용합니다.");
  window.location.reload();
});

resetSettingsBtn.addEventListener("click", () => {
  if (confirm("설정을 초기 버전으로 되돌리시겠습니까?")) {
    localStorage.removeItem("firebase_config");
    alert("설정이 초기화되었습니다. 페이지를 새로고침합니다.");
    window.location.reload();
  }
});

// 초기화 호출
checkConnection();
listenToRooms();
getSessionId();
