import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// TODO: 아래 설정을 본인의 Firebase 프로젝트 설정으로 변경하세요.
// Firebase Console -> Project Settings -> General -> 하단의 'Your apps'에서 확인 가능
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app, auth;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
} catch (error) {
    console.error("Firebase 초기화 실패. firebaseConfig 값을 확인해주세요:", error);
}

// DOM 요소 선택
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authMessage = document.getElementById('auth-message');

const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const googleBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const forgotPasswordLink = document.getElementById('forgot-password');

// 탭 전환 로직
tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    loginForm.classList.add('active-form');
    signupForm.classList.remove('active-form');
    clearMessage();
});

tabSignup.addEventListener('click', () => {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    signupForm.classList.add('active-form');
    loginForm.classList.remove('active-form');
    clearMessage();
});

// UI 헬퍼 함수
const showMessage = (msg, type = 'error') => {
    authMessage.textContent = msg;
    authMessage.className = `message ${type}`;
};

const clearMessage = () => {
    authMessage.textContent = '';
    authMessage.className = 'message';
};

const setLoading = (button, isLoading) => {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
};

// Firebase 인증 핸들러

// 1. 회원가입 (Email/Password)
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!auth) { showMessage('Firebase 설정이 누락되었습니다. app.js에서 config를 세팅해주세요.'); return; }
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    setLoading(signupBtn, true);
    clearMessage();

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // 사용자의 이름(Profile) 업데이트
        await updateProfile(userCredential.user, { displayName: name });
        
        // localStorage를 사용한 세션 상태 저장 (요구사항 반영)
        localStorage.setItem('isLoggedIn', 'true');
        
        showMessage('회원가입이 완료되었습니다!', 'success');
        // onAuthStateChanged 트리거 됨
    } catch (error) {
        showMessage(getErrorMessage(error.code));
    } finally {
        setLoading(signupBtn, false);
    }
});

// 2. 로그인 (Email/Password)
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!auth) { showMessage('Firebase 설정이 누락되었습니다. app.js에서 config를 세팅해주세요.'); return; }

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    setLoading(loginBtn, true);
    clearMessage();

    try {
        await signInWithEmailAndPassword(auth, email, password);
        
        // localStorage를 사용한 세션 상태 저장 (요구사항 반영)
        localStorage.setItem('isLoggedIn', 'true');
        
        // onAuthStateChanged 트리거 됨
    } catch (error) {
        showMessage(getErrorMessage(error.code));
    } finally {
        setLoading(loginBtn, false);
    }
});

// 3. Google OAuth 로그인
googleBtn.addEventListener('click', async () => {
    if (!auth) { showMessage('Firebase 설정이 누락되었습니다.'); return; }
    
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        // localStorage를 사용한 세션 상태 저장 (요구사항 반영)
        localStorage.setItem('isLoggedIn', 'true');
    } catch (error) {
        showMessage(getErrorMessage(error.code));
    }
});

// 4. 비밀번호 재설정 기능
forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!auth) { showMessage('Firebase 설정이 누락되었습니다.'); return; }

    const email = document.getElementById('login-email').value;
    if (!email) {
        showMessage('비밀번호를 재설정할 이메일 주소를 입력칸에 먼저 입력해주세요.');
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showMessage('비밀번호 재설정 이메일이 전송되었습니다.', 'success');
    } catch (error) {
        showMessage(getErrorMessage(error.code));
    }
});

// 5. 로그아웃 (clearStorage)
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        
        // 세션 초기화 (요구사항 반영: clearStorage() 사용)
        localStorage.clear();
        
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Auth 상태 감시자 (Observer)
if (auth) {
    onAuthStateChanged(auth, (user) => {
        // localStorage 플래그도 함께 검증
        const isLocalLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

        if (user && isLocalLoggedIn) {
            // 로그인 성공 / 유지 상태
            showDashboard(user);
        } else {
            // 로그아웃 상태
            if (isLocalLoggedIn) localStorage.clear(); // Firebase와 로컬 상태 동기화
            showAuth();
        }
    });
} else {
    showAuth();
}

// 화면 전환(뷰) 관리
function showDashboard(user) {
    authView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    
    const welcomeMsg = document.getElementById('welcome-message');
    const emailDisplay = document.getElementById('user-email-display');
    const avatar = document.getElementById('user-avatar');
    
    // 사용자 이름이 없으면 이메일 앞부분 사용
    const displayName = user.displayName || user.email.split('@')[0];
    welcomeMsg.textContent = `${displayName}님, 환영합니다!`;
    emailDisplay.textContent = user.email;
    
    if (user.photoURL) {
        avatar.innerHTML = `<img src="${user.photoURL}" alt="avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
        avatar.innerHTML = `<i class="fas fa-user"></i>`;
    }
    
    // 폼 초기화
    loginForm.reset();
    signupForm.reset();
    clearMessage();
}

function showAuth() {
    authView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
}

// 에러 메시지 포매터
function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email': return '유효하지 않은 이메일 형식입니다.';
        case 'auth/user-disabled': return '비활성화된 계정입니다.';
        case 'auth/user-not-found': return '해당 이메일로 가입된 계정을 찾을 수 없습니다.';
        case 'auth/wrong-password': return '비밀번호가 틀렸습니다.';
        case 'auth/email-already-in-use': return '이미 사용 중인 이메일입니다.';
        case 'auth/weak-password': return '비밀번호는 6자리 이상이어야 합니다.';
        case 'auth/popup-closed-by-user': return '구글 로그인이 취소되었습니다.';
        case 'auth/invalid-credential': return '이메일 또는 비밀번호가 올바르지 않습니다.';
        default: return '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
}
