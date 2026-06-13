import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updatePassword
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  setDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
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
const savedConfig = localStorage.getItem("firebase_sns_config");
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
  createUserWithEmailAndPassword,
  updatePassword,
  
  // Firestore Method
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  
  // Storage Method
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
};
