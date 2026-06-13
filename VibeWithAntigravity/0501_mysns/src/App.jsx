import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  isFirebaseInitialized, 
  firebaseConfig,
  googleProvider,
  signInWithPopup,
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
  orderBy,
  serverTimestamp
} from './firebase';
import { onSnapshot } from 'firebase/firestore';
import { Users, AlertCircle, Database, LogOut, CheckCircle, XCircle, Info, Plus, Settings, Sparkles } from 'lucide-react';

// Components
import Splash from './components/Splash';
import Login from './components/Login';
import Register from './components/Register';
import FirebaseConfigModal from './components/FirebaseConfigModal';

// User Views
import PostFeed from './components/PostFeed';
import PostDialog from './components/PostDialog';
import PostDetail from './components/PostDetail';
import UserProfile from './components/UserProfile';
import UserEdit from './components/UserEdit';

// Admin Views
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './components/AdminDashboard';
import AdminUsers from './components/AdminUsers';
import AdminPosts from './components/AdminPosts';

import './App.css';

export default function App() {
  const [splashActive, setSplashActive] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'member' | 'admin'
  const [memberData, setMemberData] = useState(null); // Firestore 유저 메타데이터
  const [isRegistered, setIsRegistered] = useState(false); // 가입 프로필 완료 여부

  // Lists
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);

  // Routing
  const [currentPage, setCurrentPage] = useState('feed'); // 'feed' | 'profile' | 'edit'
  const [activeProfileUid, setActiveProfileUid] = useState(null); // 프로필 조회를 위해 선택된 사용자 Uid
  const [adminTab, setAdminTab] = useState('dashboard'); // admin 탭 관리

  // Modal Dialogs
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [selectedPostDetail, setSelectedPostDetail] = useState(null); // 상세보기할 포스트
  const [activeModal, setActiveModal] = useState(null); // 'config', null

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Toasts
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
        await loadUserMeta(currentUser);
      } else {
        setUser(null);
        setRole(null);
        setMemberData(null);
        setIsRegistered(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Firestore Sync - Posts (All users and real-time)
  useEffect(() => {
    if (!isFirebaseInitialized) return;

    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setPosts(list);
    }, (error) => {
      console.error(error);
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

  // Firestore 사용자 프로필 데이터 체크
  const loadUserMeta = async (currentUser) => {
    try {
      // 1. 관리자 고유 정보 체크 (미리 로그인한 이메일 기준 판정)
      if (currentUser.email === 'admin@sns.com') {
        const adminMeta = {
          nickname: '최고관리자',
          email: 'admin@sns.com',
          role: 'admin',
          status: 'active'
        };
        setRole('admin');
        setMemberData(adminMeta);
        setIsRegistered(true);
        return;
      }

      // 2. 일반 구글 로그인 회원 상세 로딩
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setRole(data.role || 'member');
        setMemberData(data);
        setIsRegistered(!!data.nickname); // 닉네임이 있는 경우 회원가입 완료
      } else {
        // 회원정보 문서가 없다면 회원가입 대기 상태
        setRole('member');
        setMemberData(null);
        setIsRegistered(false);
      }
    } catch (error) {
      console.error("Load user meta failed:", error);
    }
  };

  // 구글 로그인 핸들러
  const handleGoogleLogin = async () => {
    await signInWithPopup(auth, googleProvider);
    showToast('🔑 구글 계정으로 로그인했습니다.', 'success');
  };

  // 관리자 이메일 로그인 핸들러
  const handleAdminLogin = async (email, password) => {
    // 보안 유지용 로컬 캐싱
    localStorage.setItem("last_admin_email", email);
    localStorage.setItem("last_admin_pw", password);
    
    await signInWithEmailAndPassword(auth, email, password);
    showToast('💼 관리자 계정 로그인 성공!', 'success');
  };

  // 로그아웃
  const handleLogout = async () => {
    await signOut(auth);
    setCurrentPage('feed');
    setActiveProfileUid(null);
    showToast('👋 안전하게 로그아웃 되었습니다.', 'info');
  };

  // 회원가입 프로필 세팅 등록 완료 (Register 컴포넌트 호출용)
  const handleCompleteRegister = async (payload) => {
    try {
      await setDoc(doc(db, 'users', payload.uid), {
        ...payload,
        createdAt: serverTimestamp()
      });
      showToast('🎉 회원가입이 완료되었습니다!', 'success');
      setMemberData(payload);
      setIsRegistered(true);
      setCurrentPage('feed');
    } catch (error) {
      console.error(error);
      showToast('❌ 프로필 등록에 실패했습니다.', 'error');
    }
  };

  // 프로필 정보 갱신 핸들러 (UserEdit 호출용)
  const handleUpdateProfile = (payload) => {
    setMemberData(prev => ({
      ...prev,
      ...payload
    }));
  };

  // 게시글 작성 업로드 핸들러
  const handleSavePost = async (postPayload) => {
    try {
      await addDoc(collection(db, 'posts'), {
        ...postPayload,
        authorUid: user.uid,
        authorNickname: memberData.nickname,
        authorPhotoURL: memberData.photoURL || '',
        commentCount: 0,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // 게시글 삭제 (사용자 / 관리자 공용)
  const handleDeletePost = async (postId) => {
    // 1. 하위 댓글 컬렉션 전체 탐색 후 문서 삭제
    const commentsSnap = await getDocs(collection(db, 'posts', postId, 'comments'));
    for (const commentDoc of commentsSnap.docs) {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentDoc.id));
    }
    
    // 2. 포스트 메인 문서 삭제
    await deleteDoc(doc(db, 'posts', postId));
  };

  // 어드민 사용자 정보 강제 업데이트
  const handleAdminUpdateUser = async (uid, updatedPayload) => {
    await updateDoc(doc(db, 'users', uid), updatedPayload);
  };

  // 어드민 사용자 강제 탈퇴 삭제
  const handleAdminDeleteUser = async (uid) => {
    // 1) users 컬렉션 삭제
    await deleteDoc(doc(db, 'users', uid));
    
    // 2) 해당 유저가 쓴 글 모두 탐색 및 연동 삭제
    const userPostsQuery = query(collection(db, 'posts'), where('authorUid', '==', uid));
    const userPostsSnap = await getDocs(userPostsQuery);
    for (const postDoc of userPostsSnap.docs) {
      await handleDeletePost(postDoc.id);
    }
  };

  // Config save
  const handleSaveConfig = (newConfig) => {
    localStorage.setItem('firebase_sns_config', JSON.stringify(newConfig));
    showToast('⚙️ Firebase 설정 저장 완료! 페이지를 리로드합니다...', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  // 10. [스마트 기능]: 최초 가입 생성 및 샘플 다중 미디어 포스트 피드 자동 주입 헬퍼
  const handleSetupTestData = async () => {
    if (!isFirebaseInitialized) return;
    showToast('⚙️ 초기 테스트 환경을 구축하고 있습니다...', 'info');

    try {
      // 1. 관리자 가입 (admin@sns.com / 12345678)
      let adminUid;
      try {
        const cred = await createUserWithEmailAndPassword(auth, 'admin@sns.com', '12345678');
        adminUid = cred.user.uid;
      } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
          const cred = await signInWithEmailAndPassword(auth, 'admin@sns.com', '12345678');
          adminUid = cred.user.uid;
        }
      }

      if (adminUid) {
        await setDoc(doc(db, 'users', adminUid), {
          nickname: '최고관리자',
          email: 'admin@sns.com',
          role: 'admin',
          status: 'active',
          createdAt: serverTimestamp()
        });
        localStorage.setItem("last_admin_email", "admin@sns.com");
        localStorage.setItem("last_admin_pw", "12345678");
      }

      // 2. 샘플 포스트 바인딩 (다중 이미지 4장 / 동영상 등 시뮬레이션용 데이터 강제 주입)
      const mockPosts = [
        {
          authorUid: 'admin',
          authorNickname: '최고관리자',
          authorPhotoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          content: 'MemberSpace SNS에 오신 것을 환영합니다! 🚀 여러 장의 사진을 올리시면 상세화면에서 멋진 슬라이더로 감상할 수 있습니다. #환영 #소통 #시작',
          mediaType: 'image',
          mediaUrls: [
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&auto=format&fit=crop&q=60',
            'https://images.unsplash.com/photo-1472214222555-d404758b1c42?w=800&auto=format&fit=crop&q=60'
          ],
          representativeIndex: 0,
          tags: ['환영', '소통', '시작'],
          commentCount: 0,
          createdAt: serverTimestamp()
        },
        {
          authorUid: 'admin',
          authorNickname: '풍경지기',
          authorPhotoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
          content: '맑은 하늘과 강변 정취를 비디오 클립으로 담아보았습니다. 🌿 #여행 #힐링 #풍경',
          mediaType: 'video',
          mediaUrls: [
            'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4'
          ],
          representativeIndex: 0,
          tags: ['여행', '힐링', '풍경'],
          commentCount: 0,
          createdAt: serverTimestamp()
        }
      ];

      for (const mPost of mockPosts) {
        await addDoc(collection(db, 'posts'), mPost);
      }

      showToast('🎉 초기 데이터 구축 완료! 최고 관리자 계정으로 자동 진입합니다.', 'success');
      await signInWithEmailAndPassword(auth, 'admin@sns.com', '12345678');
    } catch (err) {
      console.error(err);
      showToast('❌ 환경 구축 중 에러가 발생했습니다. 개발 콘솔 로그를 확인해 주세요.', 'error');
    }
  };

  // 태그 검색 필터링된 포스트 목록
  const filteredPosts = posts.filter(post => {
    if (!searchQuery.trim()) return true;
    const cleanSearch = searchQuery.trim().replace('#', '').toLowerCase();
    
    // 게시글 내 해시태그 목록 중 검색어가 부분/전체 일치하는지 비교
    return post.tags?.some(tag => tag.toLowerCase().includes(cleanSearch));
  });

  // 1단계: 스플래시 로더 노출
  if (splashActive) {
    return <Splash onFinish={() => setSplashActive(false)} />;
  }

  // 2단계: Firebase 미초기화 상태 경고
  if (!isFirebaseInitialized) {
    return (
      <div className="login-container">
        <div className="login-card card-sns animate-slide">
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
          onGoogleLogin={handleGoogleLogin}
          onAdminLogin={handleAdminLogin}
          onConfigClick={() => setActiveModal('config')}
        />

        {/* 테스트 가입 버튼 */}
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 1000 }}>
          <button className="btn-secondary" onClick={handleSetupTestData} style={{ boxShadow: 'var(--shadow-md)', border: '1px solid var(--primary)', background: '#fff' }}>
            <Sparkles size={14} style={{ color: 'var(--primary)' }} /> 테스트 계정 & 피드 데이터 1초 완성
          </button>
        </div>

        <FirebaseConfigModal 
          isOpen={activeModal === 'config'}
          onClose={() => setActiveModal(null)}
          currentConfig={firebaseConfig}
          onSave={handleSaveConfig}
        />

        {/* Toast Container */}
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

  // 4단계: 구글 로그인은 완료하였으나 프로필을 작성하지 않은 경우 (가입 가드)
  if (!isRegistered) {
    return (
      <>
        <Register 
          tempUser={user}
          onCompleteRegister={handleCompleteRegister}
          showToast={showToast}
        />
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              {toast.type === 'success' && <CheckCircle size={15} style={{ color: 'var(--success)' }} />}
              {toast.type === 'error' && <XCircle size={15} style={{ color: 'var(--danger)' }} />}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  // 5단계: 계정이 블락(정지) 처리된 사용자인 경우 차단 피드백 노출
  if (memberData?.status === 'blocked') {
    return (
      <div className="login-container">
        <div className="login-card card-sns blocked-card animate-slide">
          <AlertCircle size={64} style={{ color: 'var(--danger)' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--danger)' }}>🚫 계정이 정지되었습니다</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            이용 약관 위반 및 운영 방침에 의거하여 현재 계정이 블락 처리되었습니다.
            이의 제기나 해제를 원하실 경우 고객 센터로 연락 바랍니다.
          </p>
          <button className="btn-secondary" style={{ width: '100%', marginTop: '12px' }} onClick={handleLogout}>
            <LogOut size={16} /> 로그아웃
          </button>
        </div>
      </div>
    );
  }

  // 6-A단계: 로그인 완료 - [관리자 전용 화면]
  if (role === 'admin') {
    return (
      <AdminLayout 
        activeTab={adminTab}
        onTabChange={(tab) => setAdminTab(tab)}
        onLogout={handleLogout}
      >
        {adminTab === 'dashboard' && <AdminDashboard members={members} posts={posts} />}
        {adminTab === 'users' && <AdminUsers members={members} onUpdateUser={handleAdminUpdateUser} onDeleteUser={handleAdminDeleteUser} showToast={showToast} />}
        {adminTab === 'posts' && <AdminPosts posts={posts} onDeletePost={handleDeletePost} showToast={showToast} />}

        {/* Toast Container */}
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
      </AdminLayout>
    );
  }

  // 6-B단계: 로그인 완료 - [일반 사용자 SNS 화면]
  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="sns-header">
        <div className="logo-section" onClick={() => { setCurrentPage('feed'); setActiveProfileUid(null); }}>
          <Sparkles size={22} style={{ color: 'var(--primary)' }} />
          <span style={{ fontFamily: 'Outfit', fontWeight: 800 }}>MemberSpace</span>
        </div>

        {/* Search Input bar (Feed page only) */}
        {currentPage === 'feed' && (
          <div className="header-search">
            <input 
              type="text" 
              placeholder="#태그 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        <div className="header-actions">
          <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setIsWriteOpen(true)}>
            <Plus size={16} /> 등록
          </button>
          
          <button className="btn-icon" onClick={() => { setCurrentPage('edit'); setActiveProfileUid(null); }} title="설정">
            <Settings size={16} />
          </button>

          <div 
            className="avatar-circle" 
            onClick={() => { 
              setActiveProfileUid(user.uid); 
              setCurrentPage('profile'); 
            }}
            title="내 프로필"
          >
            {memberData?.photoURL ? (
              <img src={memberData.photoURL} alt={memberData.nickname} />
            ) : (
              memberData?.nickname?.charAt(0)
            )}
          </div>

          <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={handleLogout} title="로그아웃">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content">
        {currentPage === 'feed' && (
          <PostFeed 
            posts={filteredPosts}
            onPostClick={(post) => setSelectedPostDetail(post)}
            onAuthorClick={(uid) => {
              setActiveProfileUid(uid);
              setCurrentPage('profile');
            }}
          />
        )}

        {currentPage === 'profile' && (
          <UserProfile 
            targetUid={activeProfileUid}
            onBack={() => {
              setCurrentPage('feed');
              setActiveProfileUid(null);
            }}
            showToast={showToast}
          />
        )}

        {currentPage === 'edit' && (
          <UserEdit 
            currentUser={user}
            memberData={memberData}
            onBack={() => setCurrentPage('feed')}
            onUpdateProfile={handleUpdateProfile}
            showToast={showToast}
          />
        )}
      </main>

      {/* Dialog Modals */}
      <PostDialog 
        isOpen={isWriteOpen}
        onClose={() => setIsWriteOpen(false)}
        onSave={handleSavePost}
        showToast={showToast}
      />

      <PostDetail 
        isOpen={!!selectedPostDetail}
        onClose={() => setSelectedPostDetail(null)}
        post={selectedPostDetail}
        currentUser={user}
        memberData={memberData}
        onAuthorClick={(uid) => {
          setActiveProfileUid(uid);
          setCurrentPage('profile');
        }}
        showToast={showToast}
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
    </div>
  );
}
