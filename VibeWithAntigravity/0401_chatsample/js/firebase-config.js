// Firebase SDK 라이브러리 로드 (ES Modules 형식)
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, child, update, push, remove, onValue, off, onDisconnect } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// [필독] 본인의 Firebase 프로젝트 설정 값으로 변경해 주세요.
// 또는 웹 UI의 설정 모달을 통해 간편하게 등록할 수 있습니다.
const defaultFirebaseConfig = {
  apiKey: "AIzaSyDf0hjzpuD1UroQNdQM19I0ghdpEF6bzng",
  authDomain: "chatsample-378492.firebaseapp.com",
  databaseURL: "https://chatsample-378492-default-rtdb.firebaseio.com/", // 프로젝트에 따라 다를 수 있습니다.
  projectId: "chatsample-378492",
  storageBucket: "chatsample-378492.firebasestorage.app",
  messagingSenderId: "880492358594",
  appId: "1:880492358594:web:5d0b9ee6b44d4d1da0845b"
};

// 로컬 스토리지에 저장된 설정이 있다면 우선 사용합니다. (테스트 편의성 극대화)
const savedConfig = localStorage.getItem("firebase_config");
const firebaseConfig = savedConfig ? JSON.parse(savedConfig) : defaultFirebaseConfig;

// Firebase 초기화 함수
let app;
let database;

function initFirebase() {
  // 필수 설정값 검증 (테스트용)
  if (!firebaseConfig.databaseURL || firebaseConfig.databaseURL.includes("YOUR_")) {
    console.warn("Firebase Config가 아직 설정되지 않았습니다. UI의 설정 버튼을 눌러 Firebase 설정을 등록해 주세요.");
    return false;
  }
  
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    database = getDatabase(app);
    return true;
  } catch (error) {
    console.error("Firebase 초기화 중 에러 발생:", error);
    return false;
  }
}

// 초기화 실행
const isFirebaseInitialized = initFirebase();

export {
  app,
  database,
  firebaseConfig,
  isFirebaseInitialized,
  initFirebase,
  // Firebase DB 메서드 재내보내기
  ref,
  set,
  get,
  child,
  update,
  push,
  remove,
  onValue,
  off,
  onDisconnect
};
