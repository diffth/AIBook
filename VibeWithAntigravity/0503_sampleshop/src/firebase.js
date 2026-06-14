import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updatePassword,
  signInWithPopup,
  GoogleAuthProvider
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

// 기본 Firebase 프로젝트 설정 값 (샘플 프로젝트 ID: sampleshop-664eb2)
// 깃허브 보안을 위해 apiKey 등 민감정보는 기본적으로 가려져서 업로드됩니다.
const defaultFirebaseConfig = {
  apiKey: "AIzaSyB0x_YOUR_API_KEY_MASKED_HERE",
  authDomain: "sampleshop-664eb2.firebaseapp.com",
  projectId: "sampleshop-664eb2",
  storageBucket: "sampleshop-664eb2.firebasestorage.app",
  messagingSenderId: "265793205016",
  appId: "1:265793205016:web:ce416b5c55c838809a246d"
};

// 로컬 스토리지에 저장된 설정이 있다면 우선 사용 (단, 기본 프로젝트 ID가 변경되면 초기화)
const savedConfigStr = localStorage.getItem("firebase_shop_config");
let firebaseConfig = defaultFirebaseConfig;

if (savedConfigStr) {
  try {
    const parsed = JSON.parse(savedConfigStr);
    if (parsed.projectId !== defaultFirebaseConfig.projectId) {
      localStorage.removeItem("firebase_shop_config");
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
let isFirebaseInitialized = false;

function initFirebase(customConfig = null) {
  const configToUse = customConfig || firebaseConfig;
  
  if (!configToUse.apiKey || 
      configToUse.apiKey.includes("MASKED") || 
      configToUse.apiKey.includes("YOUR_")) {
    console.warn("실제 Firebase API Key가 설정되지 않았습니다. 가상 세션 모드로 실행됩니다.");
    isFirebaseInitialized = false;
    return false;
  }
  
  try {
    app = getApps().length === 0 ? initializeApp(configToUse) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseInitialized = true;
    return true;
  } catch (error) {
    console.error("Firebase 초기화 에러:", error);
    isFirebaseInitialized = false;
    return false;
  }
}

// 초기화 시도
initFirebase();

const googleProvider = new GoogleAuthProvider();

export {
  app,
  auth,
  db,
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
  serverTimestamp
};
