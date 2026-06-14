// Firebase SDK 라이브러리 로드 (ES Modules 형식)
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  limit,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 생성한 Firebase 프로젝트의 Web SDK 설정 정보
const defaultFirebaseConfig = {
  apiKey: "AIzaSyCLTPc1nPApUZJl53ImngZCw9xFiIxgLdI",
  authDomain: "aienglish-a8c9b2.firebaseapp.com",
  projectId: "aienglish-a8c9b2",
  storageBucket: "aienglish-a8c9b2.firebasestorage.app",
  messagingSenderId: "302286704180",
  appId: "1:302286704180:web:d6e08076880401cac3c461"
};

// 로컬 스토리지에 저장된 설정이 있다면 우선 사용합니다. (테스트 편의성 제공)
const savedConfig = localStorage.getItem("firebase_config");
const firebaseConfig = savedConfig ? JSON.parse(savedConfig) : defaultFirebaseConfig;

let app;
let auth;
let db;

function initFirebase() {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    return true;
  } catch (error) {
    console.error("Firebase 초기화 에러:", error);
    if (localStorage.getItem("firebase_config")) {
      localStorage.removeItem("firebase_config");
      setTimeout(() => window.location.reload(), 300);
    }
    return false;
  }
}

const isFirebaseInitialized = initFirebase();

export {
  app,
  auth,
  db,
  firebaseConfig,
  isFirebaseInitialized,
  // Auth 관련 모듈 재내보내기
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  // Firestore 관련 모듈 재내보내기
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  limit,
  writeBatch
};
