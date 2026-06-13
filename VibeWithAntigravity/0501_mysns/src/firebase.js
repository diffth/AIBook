import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updatePassword,
  GoogleAuthProvider,
  signInWithPopup
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
  limit,
  serverTimestamp 
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";

// 기본 Firebase 프로젝트 설정 값 (새로 생성한 mysns-664eb2 프로젝트 기준)
const defaultFirebaseConfig = {
  apiKey: "AIzaSyBANmAJCT4dCbaKevxDoz0WEFg7ocLIDjc",
  authDomain: "mysns-664eb2.firebaseapp.com",
  projectId: "mysns-664eb2",
  storageBucket: "mysns-664eb2.firebasestorage.app",
  messagingSenderId: "1069518962821",
  appId: "1:1069518962821:web:1b0a4ec92f7e853390e9ec"
};

// 로컬 스토리지에 저장된 설정이 있다면 우선 사용 (단, 기본 프로젝트 ID가 변경되면 초기화)
const savedConfigStr = localStorage.getItem("firebase_sns_config");
let firebaseConfig = defaultFirebaseConfig;

if (savedConfigStr) {
  try {
    const parsed = JSON.parse(savedConfigStr);
    if (parsed.projectId !== defaultFirebaseConfig.projectId) {
      localStorage.removeItem("firebase_sns_config");
      firebaseConfig = defaultFirebaseConfig;
    } else {
      firebaseConfig = parsed;
    }
  } catch (e) {
    firebaseConfig = defaultFirebaseConfig;
  }
}

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

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

export {
  app,
  auth,
  db,
  storage,
  firebaseConfig,
  isFirebaseInitialized,
  initFirebase,
  googleProvider,
  
  // Auth Method
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updatePassword,
  signInWithPopup,
  
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
  limit,
  serverTimestamp,
  
  // Storage Method
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
};
