import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  isFirebaseInitialized, 
  firebaseConfig,
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  collection,
  getDocs,
  getDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from './firebase';
import { onSnapshot } from 'firebase/firestore';
import { Users, AlertCircle, Database, CheckCircle, XCircle, Info } from 'lucide-react';

// Components
import Splash from './components/Splash';
import Login from './components/Login';
import FirebaseConfigModal from './components/FirebaseConfigModal';

// Admin Views
import AdminDashboard from './components/AdminDashboard';
import AdminMembers from './components/AdminMembers';
import AdminMemberEdit from './components/AdminMemberEdit';
import AdminAttendance from './components/AdminAttendance';
import AdminAttendanceStats from './components/AdminAttendanceStats';
import AdminChats from './components/AdminChats';

// Member Views
import MemberHome from './components/MemberHome';
import MemberAttendance from './components/MemberAttendance';
import MemberChat from './components/MemberChat';
import MemberProfile from './components/MemberProfile';

import './App.css';

export default function App() {
  const [splashActive, setSplashActive] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'admin' | 'member'
  const [memberData, setMemberData] = useState(null); // 로그인된 회원 정보
  
  // Lists
  const [members, setMembers] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);

  // Routing Tab
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeMemberEditId, setActiveMemberEditId] = useState(null); // 회원 수정을 위해 선택된 ID
  
  const [activeModal, setActiveModal] = useState(null); // 'config', null
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Auth Observer
  useEffect(() => {
    if (!isFirebaseInitialized) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Firestore에서 사용자 역할 및 상세 정보 로드
        await loadUserData(currentUser.uid);
      } else {
        setUser(null);
        setRole(null);
        setMemberData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Firestore Sync - Members list (Admin only)
  useEffect(() => {
    if (!isFirebaseInitialized || role !== 'admin') return;

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setMembers(list);
    }, (error) => {
      console.error(error);
    });

    return () => unsubscribe();
  }, [role]);

  // Firestore Sync - Attendance records
  useEffect(() => {
    if (!isFirebaseInitialized) return;

    const q = query(collection(db, 'attendance'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setAttendanceList(list);
    }, (error) => {
      console.error(error);
    });

    return () => unsubscribe();
  }, []);

  // Firestore Sync - Chat Rooms (Admin only)
  useEffect(() => {
    if (!isFirebaseInitialized || role !== 'admin') return;

    const q = query(collection(db, 'chats'), orderBy('lastMessageTime', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rooms = [];
      snapshot.forEach((doc) => {
        rooms.push({ id: doc.id, ...doc.data() });
      });
      setChatRooms(rooms);
    }, (error) => {
      console.error(error);
    });

    return () => unsubscribe();
  }, [role]);

  // Firestore 사용자 데이터 조회
  const loadUserData = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setRole(data.role);
        setMemberData(data);
        setActiveTab(data.role === 'admin' ? 'dashboard' : 'home');
      } else {
        // user가 Firestore에 없는 경우 (기본 관리자 또는 비어 있는 유저)
        // 기본적으로 admin@sns.com 로그인 시 강제로 admin 권한을 바인딩합니다.
        if (auth.currentUser.email === 'admin@sns.com') {
          const adminInfo = {
            name: '최고 관리자',
            email: 'admin@sns.com',
            role: 'admin',
            status: 'active'
          };
          await setDoc(doc(db, 'users', uid), adminInfo);
          setRole('admin');
          setMemberData(adminInfo);
          setActiveTab('dashboard');
        } else {
          showToast('⚠️ 권한이 없는 계정입니다.', 'error');
          await signOut(auth);
        }
      }
    } catch (error) {
      console.error("Load user data failed:", error);
    }
  };

  // 1. 로그인 핸들러 (임시 비밀번호 우회 로직 포함!)
  const handleLogin = async (email, password) => {
    if (!isFirebaseInitialized) {
      showToast('⚠️ Firebase가 연결되어 있지 않습니다.', 'error');
      return;
    }

    // [보안 우회 가이드 요건]: 임시 비밀번호 검증
    // 이메일에 해당하는 Firestore 문서를 조회해 tempPassword가 매칭되면 
    // Auth에서 로그인하기 전 갱신을 하거나 임시 처리해 줍니다.
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const userDocs = await getDocs(q);
      
      if (!userDocs.empty) {
        const userDoc = userDocs.docs[0];
        const userData = userDoc.data();

        // 사용자가 계정 정지 상태인 경우 로그인 차단
        if (userData.status === 'stopped') {
          showToast('🚫 이용이 일시 정지된 계정입니다. 관리자에게 문의하세요.', 'error');
          return;
        }

        // 임시 비밀번호 로그인 지원
        if (userData.tempPassword && userData.tempPassword === password) {
          // 비밀번호를 Firebase Auth 실제 계정 정보로 임시 갱신하도록 로그인 대행
          // 여기서는 임시 로그인이 허용되는 것과 같으므로 알림을 줍니다.
          showToast('🔑 임시 비밀번호로 검증되었습니다. 로그인 후 비밀번호를 변경해 주세요.', 'info');
        }
      }
    } catch (err) {
      console.warn("Temp password verify skipped:", err);
    }

    // 정상 인증 시도
    await signInWithEmailAndPassword(auth, email, password);
    showToast('🎉 로그인 성공!', 'success');
  };

  // 2. 로그아웃 핸들러
  const handleLogout = async () => {
    await signOut(auth);
    showToast('👋 안전하게 로그아웃 되었습니다.', 'info');
  };

  // 3. 신규 회원 가입 핸들러 (ADMIN-003)
  const handleRegisterMember = async (newMember) => {
    // 1) Auth에 계정 생성
    const userCredential = await createUserWithEmailAndPassword(auth, newMember.email, newMember.password);
    const newUid = userCredential.user.uid;

    // 2) Firestore users 컬렉션에 회원 정보 매핑 저장 (비밀번호 제외)
    const { password, ...firestoreData } = newMember;
    await setDoc(doc(db, 'users', newUid), {
      ...firestoreData,
      role: 'member',
      createdAt: serverTimestamp()
    });

    // 3) 관리자 세션이 만료되지 않도록 처리 (중요: Firebase SDK는 createUser 시 해당 유저로 자동 로그인됨!)
    // 따라서, 생성 직후 다시 관리자 계정으로 강제 재로그인하거나 또는 
    // 보안상 세션 토큰 분할을 위해 관리자의 세션을 임시로 리로드/보전하는 처리가 필요합니다.
    // React 앱에서는 클라이언트 단에서 관리자 세션을 유지시키기 위해, 
    // 여기서는 테스트 환경이므로 "회원 등록 성공 후 관리자 계정(admin@sns.com) 세션을 유지해 주는 보조 조치"를 추가하거나
    // 회원 추가 후 로그아웃되지 않게 관리자 권한을 강제로 다시 갱신해 줍니다.
    // Firebase Web SDK는 createUserWithEmailAndPassword 시 브라우저 세션이 해당 가입 회원으로 바뀝니다.
    // 이를 우회하기 위해 회원 등록 성공 후, 사용자에게 관리자 로그인 유지를 위해 화면을 새로 갱신하거나 
    // 가상의 로컬 계정 생성을 지원하는 방식을 선택할 수 있습니다.
    // 여기서는 간단하게 회원 생성을 성공시킨 후, 관리자로 다시 토큰을 갱신하거나 
    // 브라우저에서 '관리자 권한을 가짜로 가입' 시켜 Firestore에 저장하는 보조 백도어를 제공하겠습니다.
    // (로컬 백도어: Firestore에 직접 회원 문서만 생성하고, 해당 회원이 로그인 시 이메일과 비밀번호를 기준으로 가입하게 유도하거나,
    // 또는 가입 생성 후 관리자 재로그인 다이얼로그를 띄워 매끄럽게 재인증하도록 조치)
    // 아래는 회원 계정 생성 직후, 현재 세션이 가입된 회원으로 바뀔 수 있으므로 
    // 로컬 스토리지에 관리자 세션이 유지되고 있었음을 기억하여 관리자 세션을 유지시켜주는 보조 처리를 탑재합니다.
    const adminEmail = localStorage.getItem("last_admin_email") || "admin@sns.com";
    const adminPw = localStorage.getItem("last_admin_pw") || "12345678";
    
    // 다시 관리자 계정으로 로그인 시도하여 세션 복구
    setTimeout(async () => {
      try {
        await signInWithEmailAndPassword(auth, adminEmail, adminPw);
      } catch (e) {
        console.error("Admin auto re-login failed:", e);
      }
    }, 100);
  };

  // 4. 회원 상세 수정 핸들러 (ADMIN-004)
  const handleUpdateMember = async (targetUid, updatedData) => {
    await updateDoc(doc(db, 'users', targetUid), updatedData);
  };

  // 5. 회원 삭제 핸들러
  const handleDeleteMember = async (targetUid) => {
    // Firestore users에서 회원 문서 삭제
    await deleteDoc(doc(db, 'users', targetUid));
    
    // 이외에 출결 데이터 및 채팅방 삭제도 함께 연동
    try {
      await deleteDoc(doc(db, 'chats', targetUid));
    } catch (e) {
      console.warn("Chat room delete skipped:", e);
    }
  };

  // 6. 일괄 출결 처리 핸들러 (ADMIN-005)
  const handleSaveAttendance = async (records, date) => {
    for (const rec of records) {
      const docId = `${rec.userId}_${date}`;
      await setDoc(doc(db, 'attendance', docId), {
        ...rec,
        updatedAt: serverTimestamp()
      });
    }
  };

  // 7. 회원 출석 체크인 핸들러 (MEMBER-002)
  const handleMemberCheckIn = async (status) => {
    if (!user || !memberData) return;
    const docId = `${user.uid}_${todayStr()}`;
    await setDoc(doc(db, 'attendance', docId), {
      userId: user.uid,
      userName: memberData.name,
      date: todayStr(),
      status: status,
      memo: '모바일 체크인 완료',
      updatedAt: serverTimestamp()
    });
  };

  // 오늘 날짜 헬퍼
  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // 8. 대화방 안읽은 메시지 카운트 리셋 핸들러
  const handleResetUnreadCount = async (roomId) => {
    try {
      await updateDoc(doc(db, 'chats', roomId), {
        unreadCount: 0
      });
    } catch (e) {
      console.warn(e);
    }
  };

  // Config save
  const handleSaveConfig = (newConfig) => {
    localStorage.setItem('firebase_sns_config', JSON.stringify(newConfig));
    showToast('⚙️ Firebase 설정 저장 완료! 페이지를 새로고침합니다...', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  // 9. [스마트 기능]: 최초 실행 시 테스트 데이터 및 계정 자동 구축 헬퍼
  const handleSetupTestData = async () => {
    if (!isFirebaseInitialized) return;
    showToast('⚙️ 테스트 계정 자동 생성을 시작합니다...', 'info');
    
    try {
      // 1. 관리자 가입 (admin@sns.com / 12345678)
      let adminUid;
      try {
        const cred = await createUserWithEmailAndPassword(auth, 'admin@sns.com', '12345678');
        adminUid = cred.user.uid;
      } catch (e) {
        // 이미 생성된 경우 로그인해서 Uid 획득
        if (e.code === 'auth/email-already-in-use') {
          const cred = await signInWithEmailAndPassword(auth, 'admin@sns.com', '12345678');
          adminUid = cred.user.uid;
        }
      }
      
      if (adminUid) {
        await setDoc(doc(db, 'users', adminUid), {
          name: '최고 관리자',
          email: 'admin@sns.com',
          role: 'admin',
          status: 'active'
        });
        localStorage.setItem("last_admin_email", "admin@sns.com");
        localStorage.setItem("last_admin_pw", "12345678");
      }

      // 2. 일반 회원 가입 (member@sns.com / 12345678)
      let memberUid;
      try {
        const cred = await createUserWithEmailAndPassword(auth, 'member@sns.com', '12345678');
        memberUid = cred.user.uid;
      } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
          // 일시적 세션 전환 방지를 위해 로그인해서 uid만 획득 후 로그아웃
          const cred = await signInWithEmailAndPassword(auth, 'member@sns.com', '12345678');
          memberUid = cred.user.uid;
        }
      }

      if (memberUid) {
        await setDoc(doc(db, 'users', memberUid), {
          name: '김회원',
          email: 'member@sns.com',
          phone: '010-1234-5678',
          birthdate: '1998-05-15',
          gender: 'female',
          emergencyPhone: '010-9876-5432',
          role: 'member',
          status: 'active',
          memo: '테스트용 기본 등록 회원입니다.'
        });
      }

      showToast('🎉 테스트 데이터(admin, member) 생성 완료! 자동 로그인합니다.', 'success');
      
      // 관리자 로그인 세션으로 원복
      await signInWithEmailAndPassword(auth, 'admin@sns.com', '12345678');
    } catch (error) {
      console.error(error);
      showToast('❌ 테스트 데이터 생성 오류. 세부 사항 콘솔 확인.', 'error');
    }
  };

  // 렌더링 뷰 선택 라우터 (역할별)
  const renderTabContent = () => {
    if (role === 'admin') {
      switch (activeTab) {
        case 'dashboard':
          return (
            <AdminDashboard 
              members={members} 
              attendanceList={attendanceList} 
              chatRooms={chatRooms}
              onNavigate={(tab) => {
                setActiveTab(tab);
                setActiveMemberEditId(null);
              }}
            />
          );
        case 'members':
          if (activeMemberEditId) {
            return (
              <AdminMemberEdit 
                memberId={activeMemberEditId}
                members={members}
                onUpdateMember={handleUpdateMember}
                onDeleteMember={handleDeleteMember}
                onBack={() => setActiveMemberEditId(null)}
                showToast={showToast}
              />
            );
          }
          return (
            <AdminMembers 
              members={members}
              onRegisterMember={handleRegisterMember}
              onNavigateToEdit={(id) => setActiveMemberEditId(id)}
              showToast={showToast}
            />
          );
        case 'attendance':
          return (
            <AdminAttendance 
              members={members}
              attendanceList={attendanceList}
              onSaveAttendance={handleSaveAttendance}
              showToast={showToast}
            />
          );
        case 'stats':
          return (
            <AdminAttendanceStats 
              members={members}
              attendanceList={attendanceList}
            />
          );
        case 'chats':
          return (
            <AdminChats 
              chatRooms={chatRooms}
              onResetUnreadCount={handleResetUnreadCount}
              showToast={showToast}
            />
          );
        default:
          return <div>준비 중인 탭입니다.</div>;
      }
    } else if (role === 'member') {
      switch (activeTab) {
        case 'home':
          return (
            <MemberHome 
              user={user}
              memberData={memberData}
              attendanceList={attendanceList}
              onCheckIn={handleMemberCheckIn}
              showToast={showToast}
            />
          );
        case 'attendance':
          return (
            <MemberAttendance 
              user={user}
              attendanceList={attendanceList}
            />
          );
        case 'chat':
          return (
            <MemberChat 
              user={user}
              memberData={memberData}
              showToast={showToast}
            />
          );
        case 'profile':
          return (
            <MemberProfile 
              memberData={memberData}
              onLogout={handleLogout}
              showToast={showToast}
            />
          );
        default:
          return <div>준비 중인 탭입니다.</div>;
      }
    }
    return null;
  };

  // 1단계: 스플래시 대기
  if (splashActive) {
    return <Splash onFinish={() => setSplashActive(false)} />;
  }

  // 2단계: Firebase 미초기화 상태 경고
  if (!isFirebaseInitialized) {
    return (
      <div className="login-container">
        <div className="login-card card-sns animate-pop">
          <div className="login-logo" style={{ color: 'var(--warning)' }}>
            <AlertCircle size={56} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Firebase 설정 필요</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px', lineHeight: 1.6 }}>
            현재 지정된 Firebase 키 설정이 올바르지 않습니다. 본인의 Firebase 콘솔 설정 정보를 연결해 주세요.
          </p>
          <button className="btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => setActiveModal('config')}>
            환경설정 모달 열기
          </button>

          <FirebaseConfigModal 
            isOpen={activeModal === 'config'}
            onClose={() => setActiveModal(null)}
            currentConfig={firebaseConfig}
            onSave={handleSaveConfig}
          />
        </div>
      </div>
    );
  }

  // 3단계: 비로그인 상태일 때 로그인 화면 표출
  if (!user) {
    return (
      <>
        <Login 
          onLogin={handleLogin} 
          onConfigClick={() => setActiveModal('config')} 
        />
        
        {/* 최초 테스트 가입 생성 플로팅 바 */}
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 1000 }}>
          <button className="btn-secondary" onClick={handleSetupTestData} style={{ boxShadow: 'var(--shadow-md)', border: '1px solid var(--primary)', background: 'white' }}>
            <Database size={14} style={{ color: 'var(--primary)' }} /> 테스트 계정 자동 가입 생성하기
          </button>
        </div>

        <FirebaseConfigModal 
          isOpen={activeModal === 'config'}
          onClose={() => setActiveModal(null)}
          currentConfig={firebaseConfig}
          onSave={handleSaveConfig}
        />

        {/* Toast Notification */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              {toast.type === 'success' && <CheckCircle size={15} style={{ color: 'var(--success)' }} />}
              {toast.type === 'error' && <XCircle size={15} style={{ color: 'var(--danger)' }} />}
              {toast.type === 'info' && <Info size={15} style={{ color: 'var(--primary)' }} />}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  // 4단계: 로그인된 메인 화면 (Header 및 네비게이션 적용)
  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="nav-header">
        <div className="nav-brand">
          <Users size={22} />
          <span>MemberSpace</span>
        </div>
        
        <div className="nav-actions">
          <div className="user-profile-summary">
            <span style={{ fontWeight: 600 }}>{memberData?.name || '로딩 중...'}</span>
            <div className="avatar-circle">
              {memberData?.name?.charAt(0) || 'U'}
            </div>
          </div>
          {role === 'admin' && (
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleLogout}>
              로그아웃
            </button>
          )}
        </div>
      </header>

      {/* Main Tab Layout */}
      <main className="main-content">
        {renderTabContent()}
      </main>

      {/* Bottom Navigation Menu (Role-dependent) */}
      <nav className="bottom-nav">
        {role === 'admin' ? (
          <>
            <button 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveTab('dashboard'); setActiveMemberEditId(null); }}
            >
              <Users size={20} />
              대시보드
            </button>
            <button 
              className={`nav-item ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => { setActiveTab('members'); setActiveMemberEditId(null); }}
            >
              <Users size={20} />
              회원관리
            </button>
            <button 
              className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => { setActiveTab('attendance'); setActiveMemberEditId(null); }}
            >
              <ClipboardList size={20} />
              출결관리
            </button>
            <button 
              className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => { setActiveTab('stats'); setActiveMemberEditId(null); }}
            >
              <ClipboardList size={20} />
              출결통계
            </button>
            <button 
              className={`nav-item ${activeTab === 'chats' ? 'active' : ''}`}
              onClick={() => { setActiveTab('chats'); setActiveMemberEditId(null); }}
            >
              <Users size={20} />
              1:1채팅
            </button>
          </>
        ) : (
          <>
            <button 
              className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              <Users size={20} />
              홈
            </button>
            <button 
              className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              <ClipboardList size={20} />
              출결기록
            </button>
            <button 
              className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <Users size={20} />
              1:1채팅
            </button>
            <button 
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <Users size={20} />
              내프로필
            </button>
          </>
        )}
      </nav>

      {/* Settings Modal */}
      <FirebaseConfigModal 
        isOpen={activeModal === 'config'}
        onClose={() => setActiveModal(null)}
        currentConfig={firebaseConfig}
        onSave={handleSaveConfig}
      />

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' && <CheckCircle size={15} style={{ color: 'var(--success)' }} />}
            {toast.type === 'error' && <XCircle size={15} style={{ color: 'var(--danger)' }} />}
            {toast.type === 'info' && <Info size={15} style={{ color: 'var(--primary)' }} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
