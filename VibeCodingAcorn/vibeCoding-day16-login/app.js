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
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

// Firebase 프로젝트 설정
const firebaseConfig = {
    apiKey: "AIzaSyCOE4b00JGRouN0_q3ootAo9v8zCNN-SIA",
    authDomain: "vibefireauth-5a839.firebaseapp.com",
    projectId: "vibefireauth-5a839",
    storageBucket: "vibefireauth-5a839.firebasestorage.app",
    messagingSenderId: "681154168808",
    appId: "1:681154168808:web:19138328ab3095d1a1c65d",
    measurementId: "G-5DGWCK45PJ"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// 한국어 인증 메일 설정
auth.languageCode = 'ko';

// DOM 요소 선택
const authView           = document.getElementById('auth-view');
const dashboardView      = document.getElementById('dashboard-view');
const tabLogin           = document.getElementById('tab-login');
const tabSignup          = document.getElementById('tab-signup');
const loginForm          = document.getElementById('login-form');
const signupForm         = document.getElementById('signup-form');
const authMessage        = document.getElementById('auth-message');
const loginBtn           = document.getElementById('login-btn');
const signupBtn          = document.getElementById('signup-btn');
const googleBtn          = document.getElementById('google-login-btn');
const logoutBtn          = document.getElementById('logout-btn');
const forgotPasswordLink = document.getElementById('forgot-password');

// ── 탭 전환 ──────────────────────────────────────
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

// ── UI 헬퍼 함수 ─────────────────────────────────
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

// ── 1. 회원가입 ───────────────────────────────────
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name     = document.getElementById('signup-name').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    setLoading(signupBtn, true);
    clearMessage();

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        localStorage.setItem('isLoggedIn', 'true');
        showMessage('회원가입이 완료되었습니다! 환영합니다 🎉', 'success');
        // onAuthStateChanged가 user를 감지해 자동으로 대시보드 전환됨
    } catch (error) {
        console.error('Signup error:', error.code, error.message);
        showMessage(getErrorMessage(error.code));
    } finally {
        setLoading(signupBtn, false);
    }
});

// ── 2. 로그인 ─────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    setLoading(loginBtn, true);
    clearMessage();

    try {
        await signInWithEmailAndPassword(auth, email, password);
        localStorage.setItem('isLoggedIn', 'true');
        // onAuthStateChanged가 자동으로 대시보드 전환 처리
    } catch (error) {
        console.error('Login error:', error.code, error.message);
        showMessage(getErrorMessage(error.code));
    } finally {
        setLoading(loginBtn, false);
    }
});

// ── 3. Google OAuth 로그인 ────────────────────────
googleBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        localStorage.setItem('isLoggedIn', 'true');
    } catch (error) {
        console.error('Google login error:', error.code, error.message);
        showMessage(getErrorMessage(error.code));
    }
});

// ── 4. 비밀번호 재설정 ───────────────────────────
forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    if (!email) {
        showMessage('이메일 주소를 먼저 입력해주세요.');
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showMessage('비밀번호 재설정 이메일이 전송되었습니다. 메일함을 확인해주세요.', 'success');
    } catch (error) {
        console.error('Reset password error:', error.code, error.message);
        showMessage(getErrorMessage(error.code));
    }
});

// ── 5. 로그아웃 ───────────────────────────────────
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        localStorage.clear(); // 세션 완전 초기화
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// ── Auth 상태 감시자 (핵심 수정) ──────────────────
// [버그 원인] 기존 코드: user && isLocalLoggedIn 두 조건을 동시에 검사
//   → 회원가입 직후 observer가 localStorage 세팅 전에 먼저 실행되면
//     isLocalLoggedIn = false 로 판단해 로그인 화면으로 다시 튕기는
//     race condition 발생!
// [수정] Firebase user 객체만을 신뢰의 원천(source of truth)으로 사용.
//   localStorage는 보조 힌트 역할만 담당.
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Firebase가 인증된 user를 반환 → 대시보드 표시
        localStorage.setItem('isLoggedIn', 'true');
        showDashboard(user);
    } else {
        // Firebase가 null 반환 → 로그아웃 상태
        localStorage.clear();
        showAuth();
    }
});

// ── 화면 전환 함수 ────────────────────────────────
function showDashboard(user) {
    authView.classList.add('hidden');
    dashboardView.classList.remove('hidden');

    const welcomeMsg   = document.getElementById('welcome-message');
    const emailDisplay = document.getElementById('user-email-display');
    const avatar       = document.getElementById('user-avatar');

    const displayName = user.displayName || user.email.split('@')[0];
    welcomeMsg.textContent   = `${displayName}님, 환영합니다! 👋`;
    emailDisplay.textContent = user.email;

    if (user.photoURL) {
        avatar.innerHTML = `<img src="${user.photoURL}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
        avatar.innerHTML = `<i class="fas fa-user"></i>`;
    }

    loginForm.reset();
    signupForm.reset();
    clearMessage();
}

function showAuth() {
    authView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
}

// ── 에러 메시지 한국어 포매터 ─────────────────────
function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email':
            return '유효하지 않은 이메일 형식입니다.';
        case 'auth/user-disabled':
            return '비활성화된 계정입니다. 관리자에게 문의해주세요.';
        case 'auth/user-not-found':
            return '해당 이메일로 가입된 계정이 없습니다.';
        case 'auth/wrong-password':
            return '비밀번호가 올바르지 않습니다.';
        case 'auth/email-already-in-use':
            return '이미 사용 중인 이메일 주소입니다.';
        case 'auth/weak-password':
            return '비밀번호는 6자리 이상이어야 합니다.';
        case 'auth/popup-closed-by-user':
            return '구글 로그인 창이 닫혔습니다. 다시 시도해주세요.';
        case 'auth/popup-blocked':
            return '팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.';
        case 'auth/invalid-credential':
            return '이메일 또는 비밀번호가 올바르지 않습니다.';
        case 'auth/too-many-requests':
            return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
        case 'auth/network-request-failed':
            return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
        default:
            return `오류가 발생했습니다 (${errorCode}). 잠시 후 다시 시도해주세요.`;
    }
}
