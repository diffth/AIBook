// Firebase SDK 라이브러리 로드 (ES Modules 형식)
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, child, update, push, remove, onValue, off, onDisconnect, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// chatsample-378492 프로젝트의 기본 설정 값
const defaultFirebaseConfig = {
  apiKey: "AIzaSyDf0hjzpuD1UroQNdQM19I0ghdpEF6bzng",
  authDomain: "chatsample-378492.firebaseapp.com",
  databaseURL: "https://chatsample-378492-default-rtdb.firebaseio.com/",
  projectId: "chatsample-378492",
  storageBucket: "chatsample-378492.firebasestorage.app",
  messagingSenderId: "880492358594",
  appId: "1:880492358594:web:5d0b9ee6b44d4d1da0845b"
};

// 로컬 스토리지에 저장된 설정이 있다면 우선 사용합니다. (설정 모달을 통한 갱신 기능 보장)
const savedConfig = localStorage.getItem("firebase_news_config");
const firebaseConfig = savedConfig ? JSON.parse(savedConfig) : defaultFirebaseConfig;

let app;
let database;

function initFirebase() {
  if (!firebaseConfig.databaseURL || 
      firebaseConfig.databaseURL.includes("YOUR_") || 
      firebaseConfig.databaseURL.includes("<")) {
    console.warn("Firebase Config가 설정되지 않았거나 URL 형식이 올바르지 않습니다.");
    return false;
  }
  
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    database = getDatabase(app);
    return true;
  } catch (error) {
    console.error("Firebase 초기화 에러:", error);
    return false;
  }
}

const isFirebaseInitialized = initFirebase();

export {
  app,
  database,
  firebaseConfig,
  isFirebaseInitialized,
  initFirebase,
  ref,
  set,
  get,
  child,
  update,
  push,
  remove,
  onValue,
  off,
  onDisconnect,
  runTransaction
};
