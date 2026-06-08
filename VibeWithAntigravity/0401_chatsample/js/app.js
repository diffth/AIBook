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

// 고유 세션 ID 생성 또는 조회
function getSessionId() {
  let sessionId = sessionStorage.getItem("chat_session_id");
  if (!sessionId) {
    sessionId = "user_" + Math.random().toString(36).substring(2, 11);
    sessionStorage.setItem("chat_session_id", sessionId);
  }
  return sessionId;
}

// Firebase 연결 확인 및 UI 반영
function checkConnection() {
  if (!isFirebaseInitialized) {
    connectionWarning.style.display = "flex";
    roomListContainer.innerHTML = `
      <div class="no-rooms">
        <p>Firebase 연결 설정이 필요합니다.</p>
      </div>
    `;
    return false;
  }
  connectionWarning.style.display = "none";
  return true;
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
    window.location.reload();
  }
});

// 초기화 호출
checkConnection();
getSessionId();
