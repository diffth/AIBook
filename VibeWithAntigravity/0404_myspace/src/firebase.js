import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";

// 기본 Firebase 프로젝트 설정 값 (사용자의 이전 프로젝트 정보를 기반으로 설정)
const defaultFirebaseConfig = {
  apiKey: "AIzaSyDf0hjzpuD1UroQNdQM19I0ghdpEF6bzng",
  authDomain: "chatsample-378492.firebaseapp.com",
  projectId: "chatsample-378492",
  storageBucket: "chatsample-378492.firebasestorage.app",
  messagingSenderId: "880492358594",
  appId: "1:880492358594:web:5d0b9ee6b44d4d1da0845b"
};

// 로컬 스토리지에 저장된 설정이 있다면 우선 사용
const savedConfig = localStorage.getItem("firebase_space_config");
const firebaseConfig = savedConfig ? JSON.parse(savedConfig) : defaultFirebaseConfig;

let app;
let auth;
let db;
let storage;
let isFirebaseInitialized = false;

function initFirebase(customConfig = null) {
  const configToUse = customConfig || firebaseConfig;
  
  if (!configToUse.apiKey || 
      configToUse.apiKey.includes("YOUR_") || 
      configToUse.apiKey.includes("<")) {
    console.warn("Firebase Config가 설정되지 않았거나 형식이 올바르지 않습니다.");
    isFirebaseInitialized = false;
    return false;
  }
  
  try {
    // 이미 앱이 초기화되어 있다면 갱신
    if (getApps().length > 0 && customConfig) {
      // 새로운 설정이 들어오면 기존 앱을 삭제하고 재초기화
      // 여기서는 간편하게 로컬 스토리지 업데이트 후 페이지를 새로고침하는 방식을 가이드합니다.
    }
    
    app = getApps().length === 0 ? initializeApp(configToUse) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    isFirebaseInitialized = true;
    return true;
  } catch (error) {
    console.error("Firebase 초기화 에러:", error);
    isFirebaseInitialized = false;
    return false;
  }
}

initFirebase();

export {
  app,
  auth,
  db,
  storage,
  firebaseConfig,
  isFirebaseInitialized,
  initFirebase,
  
  // Auth Method
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  
  // Firestore Method
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  
  // Storage Method
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
};
