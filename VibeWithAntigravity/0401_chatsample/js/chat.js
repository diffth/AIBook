import {
  database,
  isFirebaseInitialized,
  ref,
  set,
  get,
  update,
  push,
  remove,
  onValue,
  off,
  onDisconnect
} from "./firebase-config.js";

// DOM 요소 취득
const connectionWarning = document.getElementById("connectionWarning");
const roomTitleHeader = document.getElementById("roomTitleHeader");
const roomStatusBadge = document.getElementById("roomStatusBadge");
const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");
const leaveRoomBtn = document.getElementById("leaveRoomBtn");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

// URL 파라미터 및 세션 정보 추출
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("roomId");
const nickname = sessionStorage.getItem("chat_nickname");
const sessionId = sessionStorage.getItem("chat_session_id");

// 상태 관리
let isLeaving = false;
let roomData = null;

// 초기 파라미터 검증
function validateSession() {
  if (!isFirebaseInitialized) {
    connectionWarning.style.display = "flex";
    return false;
  }
  if (!roomId || !nickname || !sessionId) {
    alert("비정상적인 접근입니다.");
    window.location.href = "index.html";
    return false;
  }
  return true;
}

// 채팅방 초기화 및 검증
async function initChatRoom() {
  if (!validateSession()) return;

  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      alert("존재하지 않는 채팅방입니다.");
      window.location.href = "index.html";
      return;
    }

    roomData = snapshot.val();
    
    // 입력창 활성화
    chatInput.removeAttribute("disabled");
    sendBtn.removeAttribute("disabled");
    chatInput.focus();

    // 메시지 수신 감시
    const messagesRef = ref(database, `messages/${roomId}`);
    onValue(messagesRef, (snapshot) => {
      const messages = snapshot.val();
      renderMessages(messages);
    });

  } catch (error) {
    console.error("채팅방 설정 오류:", error);
    window.location.href = "index.html";
  }
}

// 메시지 화면 출력 및 자동 스크롤
function renderMessages(messagesData) {
  chatMessages.innerHTML = "";
  if (!messagesData) return;

  const msgIds = Object.keys(messagesData);
  msgIds.sort((a, b) => (messagesData[a].timestamp || 0) - (messagesData[b].timestamp || 0));

  msgIds.forEach(id => {
    const msg = messagesData[id];
    const isSystem = msg.sender === "system";
    const isMe = msg.sender === nickname;

    const wrapper = document.createElement("div");
    
    if (isSystem) {
      wrapper.className = "message-system";
      wrapper.innerText = msg.text;
    } else {
      wrapper.className = `message-wrapper ${isMe ? 'me' : 'other'}`;
      
      const senderHtml = isMe ? "" : `<span class="message-sender">${escapeHtml(msg.sender)}</span>`;
      const timeStr = formatTime(msg.timestamp);

      wrapper.innerHTML = `
        ${senderHtml}
        <div class="message-bubble">${escapeHtml(msg.text)}</div>
        <span class="message-time">${timeStr}</span>
      `;
    }

    chatMessages.appendChild(wrapper);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 시간 포맷
function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

// HTML 이스케이프
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// 메시지 전송 로직
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = "";
  chatInput.focus();

  try {
    const messagesRef = ref(database, `messages/${roomId}`);
    const newMsgRef = push(messagesRef);
    await set(newMsgRef, {
      sender: nickname,
      text: text,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("메시지 전송 실패:", error);
  }
}

sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// 시작
initChatRoom();
