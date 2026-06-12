import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  storage, 
  firebaseConfig, 
  isFirebaseInitialized, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from './firebase';
import { onSnapshot } from 'firebase/firestore';
import { HardDrive, AlertCircle, RefreshCw, Info, CheckCircle, XCircle } from 'lucide-react';

// Components
import Header from './components/Header';
import Toolbar from './components/Toolbar';
import FileUpload from './components/FileUpload';
import FileGrid from './components/FileGrid';
import FileList from './components/FileList';
import FilePreviewModal from './components/FilePreviewModal';
import FileEditModal from './components/FileEditModal';
import FirebaseConfigModal from './components/FirebaseConfigModal';

import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'login', 'edit', 'preview', 'config', null
  const [selectedFile, setSelectedFile] = useState(null);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Auth observer
  useEffect(() => {
    if (!isFirebaseInitialized) return;
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore Files synchronization
  useEffect(() => {
    if (!isFirebaseInitialized) return;

    const q = query(collection(db, 'files'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filesList = [];
      snapshot.forEach((doc) => {
        filesList.push({ id: doc.id, ...doc.data() });
      });
      setFiles(filesList);
    }, (error) => {
      console.error("Firestore sync error:", error);
      showToast('❌ 파일 목록을 불러오는 중 오류가 발생했습니다.', 'error');
    });

    return () => unsubscribe();
  }, []);

  // Admin login handler
  const handleLogin = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    showToast('🔑 관리자 로그인 성공!', 'success');
  };

  // Admin logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('👋 로그아웃 되었습니다.', 'info');
    } catch (error) {
      console.error(error);
      showToast('❌ 로그아웃에 실패했습니다.', 'error');
    }
  };

  // File Upload handler
  const handleUpload = (file) => {
    if (!isFirebaseInitialized) {
      showToast('⚠️ Firebase가 초기화되지 않았습니다.', 'error');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);

    const storagePath = `files/${Date.now()}_${file.name}`;
    const fileRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error(error);
        showToast('❌ 파일 업로드에 실패했습니다.', 'error');
        setIsUploading(false);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Firestore에 메타데이터 저장
          await addDoc(collection(db, 'files'), {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            storagePath: storagePath,
            downloadUrl: downloadUrl,
            createdAt: serverTimestamp()
          });

          showToast('🎉 파일 업로드 성공!', 'success');
        } catch (error) {
          console.error(error);
          showToast('❌ 파일 업로드 DB 저장에 실패했습니다.', 'error');
        } finally {
          setIsUploading(false);
        }
      }
    );
  };

  // File Name edit handler
  const handleEdit = async (fileId, newName) => {
    try {
      const fileRef = doc(db, 'files', fileId);
      await updateDoc(fileRef, {
        name: newName,
        updatedAt: serverTimestamp()
      });
      showToast('✏️ 파일 이름이 변경되었습니다.', 'success');
    } catch (error) {
      console.error(error);
      showToast('❌ 파일 이름 변경에 실패했습니다.', 'error');
    }
  };

  // File Delete handler
  const handleDelete = async (file) => {
    if (!window.confirm(`"${file.name}" 파일을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      // 1. Storage에서 실물 파일 삭제
      const fileRef = ref(storage, file.storagePath);
      await deleteObject(fileRef);

      // 2. Firestore에서 메타데이터 삭제
      await deleteDoc(doc(db, 'files', file.id));
      
      showToast('🗑️ 파일이 삭제되었습니다.', 'success');
    } catch (error) {
      console.error(error);
      // Storage에 파일이 존재하지 않는 경우를 대비해 Firestore에서만이라도 삭제를 시도할 수 있습니다.
      try {
        await deleteDoc(doc(db, 'files', file.id));
        showToast('🗑️ 메타데이터만 삭제되었습니다. (스토리지 파일 없음)', 'warning');
      } catch (dbErr) {
        console.error(dbErr);
        showToast('❌ 파일 삭제에 실패했습니다.', 'error');
      }
    }
  };

  // File Download handler
  const handleDownload = (file) => {
    // a 태그를 동적으로 생성하여 다운로드 트리거
    const link = document.createElement('a');
    link.href = file.downloadUrl;
    link.download = file.name;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 다운로드를 시작합니다.', 'info');
  };

  // Config save handler
  const handleSaveConfig = (newConfig) => {
    localStorage.setItem('firebase_space_config', JSON.stringify(newConfig));
    showToast('⚙️ Firebase 설정이 저장되었습니다! 적용을 위해 새로고침합니다...', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  // Filtered & Searched Files
  const filteredFiles = files.filter((file) => {
    // 1. Search Query Filter
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. File Type Category Filter
    if (!matchesSearch) return false;
    if (filterType === 'all') return true;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isPdf = file.type === 'application/pdf';
    const isText = file.type.startsWith('text/') || file.name.endsWith('.txt');

    if (filterType === 'image') return isImage;
    if (filterType === 'video') return isVideo;
    if (filterType === 'document') return isPdf || isText;
    
    // 'other' 카테고리는 위의 모든 조건에 해당하지 않는 경우
    return !isImage && !isVideo && !isPdf && !isText;
  });

  return (
    <div className="app-container">
      {/* Header */}
      <Header 
        user={user} 
        onLoginClick={() => setActiveModal('login')} 
        onLogout={handleLogout}
        onConfigClick={() => setActiveModal('config')}
      />

      {/* Firebase Setup Warning */}
      {!isFirebaseInitialized && (
        <div className="card-glass animate-fade" style={{ padding: '20px', border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.05)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <AlertCircle size={28} style={{ color: 'var(--warning)', flexShrink: 0 }} />
          <div style={{ flexGrow: 1 }}>
            <h3 style={{ color: 'var(--warning)', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Firebase 설정이 필요합니다</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              현재 기본 설정이 비어있거나 불완전합니다. 우측 상단의 톱니바퀴 아이콘을 클릭하여 나만의 Firebase 프로젝트 설정을 입력해 주세요.
            </p>
          </div>
          <button className="btn-secondary" onClick={() => setActiveModal('config')}>
            설정하기
          </button>
        </div>
      )}

      {/* Upload area (Visible only to logged in Admin) */}
      {user && (
        <FileUpload 
          onUpload={handleUpload}
          uploadProgress={uploadProgress}
          isUploading={isUploading}
          showToast={showToast}
        />
      )}

      {/* Toolbar */}
      <Toolbar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterType={filterType}
        setFilterType={setFilterType}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Files Display */}
      {filteredFiles.length > 0 ? (
        viewMode === 'grid' ? (
          <FileGrid 
            files={filteredFiles}
            user={user}
            onPreview={(file) => {
              setSelectedFile(file);
              setActiveModal('preview');
            }}
            onDownload={handleDownload}
            onEdit={(file) => {
              setSelectedFile(file);
              setActiveModal('edit');
            }}
            onDelete={handleDelete}
          />
        ) : (
          <FileList 
            files={filteredFiles}
            user={user}
            onPreview={(file) => {
              setSelectedFile(file);
              setActiveModal('preview');
            }}
            onDownload={handleDownload}
            onEdit={(file) => {
              setSelectedFile(file);
              setActiveModal('edit');
            }}
            onDelete={handleDelete}
          />
        )
      ) : (
        <div className="empty-state card-glass animate-fade">
          <HardDrive size={48} className="empty-state-icon" />
          <p style={{ fontWeight: 500 }}>등록된 파일이 없거나 검색 결과가 없습니다.</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {user ? '위 업로드 영역에 파일을 올려 드라이브에 보관해 보세요!' : '관리자로 로그인하여 파일을 업로드할 수 있습니다.'}
          </p>
        </div>
      )}

      {/* Modals Container */}
      <LoginModal 
        isOpen={activeModal === 'login'}
        onClose={() => setActiveModal(null)}
        onLogin={handleLogin}
      />

      <FirebaseConfigModal 
        isOpen={activeModal === 'config'}
        onClose={() => setActiveModal(null)}
        currentConfig={firebaseConfig}
        onSave={handleSaveConfig}
      />

      <FileEditModal 
        isOpen={activeModal === 'edit'}
        onClose={() => setActiveModal(null)}
        file={selectedFile}
        onUpdate={handleEdit}
      />

      <FilePreviewModal 
        isOpen={activeModal === 'preview'}
        onClose={() => setActiveModal(null)}
        file={selectedFile}
      />

      {/* Toast Notification Area */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' && <CheckCircle size={16} style={{ color: 'var(--success)' }} />}
            {toast.type === 'error' && <XCircle size={16} style={{ color: 'var(--danger)' }} />}
            {toast.type === 'info' && <Info size={16} style={{ color: 'var(--primary)' }} />}
            {toast.type === 'warning' && <AlertCircle size={16} style={{ color: 'var(--warning)' }} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
