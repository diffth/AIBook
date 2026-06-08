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
let isLeaving = false; // 퇴장 프로세스 중 중복 실행 방지
let roomData = null;

// 1. 초기 파라미터 검증
function validateSession() {
  if (!isFirebaseInitialized) {
    connectionWarning.style.display = "flex";
    return false;
  }
  if (!roomId || !nickname || !sessionId) {
    alert("비정상적인 접근입니다. 대기실로 이동합니다.");
    window.location.href = "index.html";
    return false;
  }
  return true;
}

// 2. 채팅방 초기화 및 검증
async function initChatRoom() {
  if (!validateSession()) return;

  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      alert("존재하지 않거나 삭제된 채팅방입니다.");
      window.location.href = "index.html";
      return;
    }

    roomData = snapshot.val();
    
    // 내가 참여자에 포함되어 있지 않고 방이 꽉 찬 경우 튕겨냄
    const isParticipant = roomData.participants && roomData.participants[sessionId];
    if (!isParticipant && roomData.userCount >= 2) {
      alert("이 방은 이미 꽉 찼습니다.");
      window.location.href = "index.html";
      return;
    }

    // 내가 튕겨 나갔다가 새로고침 등으로 들어왔을 때 participants에 없는 경우 재등록
    if (!isParticipant) {
      const updates = {};
      updates[`rooms/${roomId}/participants/${sessionId}`] = nickname;
      updates[`rooms/${roomId}/userCount`] = (roomData.userCount || 0) + 1;
      await update(ref(database), updates);
    }

    // 입력창 활성화
    chatInput.removeAttribute("disabled");
    sendBtn.removeAttribute("disabled");
    chatInput.focus();

    // 실시간 리스너 작동 시작
    startRealtimeListeners();

    // 네트워크 끊김 감지(onDisconnect) 설정
    setupOnDisconnect();

  } catch (error) {
    console.error("채팅방 설정 오류:", error);
    alert("채팅방에 접속할 수 없습니다.");
    window.location.href = "index.html";
  }
}

// 3. 실시간 리스너 연결
function startRealtimeListeners() {
  // A. 방 정보 감시 (방장 탈퇴, 인원수 변화 등)
  const roomRef = ref(database, `rooms/${roomId}`);
  onValue(roomRef, (snapshot) => {
    if (isLeaving) return; // 퇴장 중이면 무시
    
    const data = snapshot.val();
    if (!data) {
      // 상대방이 퇴장하여 방이 폭파되었거나 방이 존재하지 않을 때
      alert("채팅방이 상대방에 의해 종료되었습니다.");
      exitToMain(false); // 수동 퇴장 처리 없이 바로 메인으로
      return;
    }

    roomData = data;
    roomTitleHeader.innerText = roomData.title || "채팅방";
    
    // 인원수 상태 업데이트
    const count = roomData.userCount || 1;
    if (count === 1) {
      statusIndicator.style.background = "#f59e0b"; // Amber (대기중)
      statusText.innerText = "상대방을 기다리는 중 (1/2)";
    } else {
      statusIndicator.style.background = "var(--success)"; // Green (대화중)
      statusText.innerText = "대화 중 (2/2)";
    }
  });

  // B. 메시지 내역 감시
  const messagesRef = ref(database, `messages/${roomId}`);
  onValue(messagesRef, (snapshot) => {
    const messages = snapshot.val();
    renderMessages(messages);
  });
}

// 4. 메시지 화면 출력 및 자동 스크롤
function renderMessages(messagesData) {
  chatMessages.innerHTML = "";
  if (!messagesData) return;

  const msgIds = Object.keys(messagesData);
  // 타임스탬프 순으로 정렬
  msgIds.sort((a, b) => (messagesData[a].timestamp || 0) - (messagesData[b].timestamp || 0));

  msgIds.forEach(id => {
    const msg = messagesData[id];
    const isSystem = msg.sender === "system";
    const isMe = msg.sender === nickname; // 심플하게 닉네임으로 판단 (동일인 닉네임 방지처리가 되어있음)

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

  // 스크롤 최하단 자동 이동
  setTimeout(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 50);
}

// 시간 포맷 (오전/오후 HH:MM)
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
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 5. 메시지 전송 로직
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
    alert("메시지 전송에 실패했습니다.");
  }
}

// 전송 버튼 & 엔터키 바인딩
sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// 6. 안전한 퇴장 처리 (Clean up)
async function exitToMain(performCleanup = true) {
  if (isLeaving) return;
  isLeaving = true;

  // 리스너 해제
  off(ref(database, `rooms/${roomId}`));
  off(ref(database, `messages/${roomId}`));

  if (performCleanup) {
    try {
      // 1. 방 정보 다시 조회
      const roomRef = ref(database, `rooms/${roomId}`);
      const snapshot = await get(roomRef);
      
      if (snapshot.exists()) {
        const room = snapshot.val();
        const currentUserCount = room.userCount || 1;
        
        if (currentUserCount <= 1) {
          // 마지막 나가는 사람인 경우 방 정보 및 메시지 전체 폭파 (DB 청소)
          await remove(ref(database, `rooms/${roomId}`));
          await remove(ref(database, `messages/${roomId}`));
        } else {
          // 2명이 있었는데 한 명이 나가는 경우
          const updates = {};
          updates[`rooms/${roomId}/userCount`] = currentUserCount - 1;
          updates[`rooms/${roomId}/participants/${sessionId}`] = null; // 내 세션 제거
          
          await update(ref(database), updates);

          // 시스템 퇴장 안내 메시지 추가
          const messagesRef = ref(database, `messages/${roomId}`);
          const newMsgRef = push(messagesRef);
          await set(newMsgRef, {
            sender: "system",
            text: `${nickname} 님이 퇴장하셨습니다.`,
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error("퇴장 정리 중 오류:", error);
    }
  }

  // 로컬 세션 정보 삭제 (다음 입장을 위해 roomId만 제거)
  sessionStorage.removeItem("chat_room_id");
  window.location.href = "index.html";
}

// 나가기 버튼 바인딩
leaveRoomBtn.addEventListener("click", () => {
  if (confirm("정말 채팅방에서 나가시겠습니까?")) {
    exitToMain(true);
  }
});

// 7. 네트워크 단절(onDisconnect) 시 Firebase 자동 처리 등록
function setupOnDisconnect() {
  const myParticipantRef = ref(database, `rooms/${roomId}/participants/${sessionId}`);
  
  // 네트워크가 비정상적으로 유실될 경우 내 참여 정보를 삭제해둡니다.
  myParticipantRef.onDisconnect().remove();
}

// 브라우저 닫기/새로고침 시 퇴장 처리 작동 (최대한 정리)
window.addEventListener("beforeunload", (e) => {
  if (!isLeaving) {
    // 동기식 요청으로 처리하기 위해 데이터베이스 연결 유지 상태에서 퇴장 로직을 수행할 수 있게 함
    // 다만 브라우저 닫힘 특성상 비동기 결과는 보장하기 힘들어 onDisconnect가 백업 역할을 함
    exitToMain(true);
  }
});

// 시작
initChatRoom();
