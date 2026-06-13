import React, { useState, useEffect } from 'react';
import { ArrowLeft, Camera, Check, Save } from 'lucide-react';
import { db, collection, getDocs, doc, updateDoc, query, where, ref, uploadBytesResumable, getDownloadURL, storage } from '../firebase';

export default function UserEdit({ currentUser, memberData, onBack, onUpdateProfile, showToast }) {
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState('');

  // 중복 검사 상태
  const [isCheckSuccess, setIsCheckSuccess] = useState(false);
  const [lastCheckedNickname, setLastCheckedNickname] = useState('');
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (memberData) {
      setNickname(memberData.nickname || '');
      setBio(memberData.bio || '');
      setProfilePreviewUrl(memberData.photoURL || '');
      setLastCheckedNickname(memberData.nickname || '');
      // 닉네임이 기존과 같으면 중복검사 통과 상태로 세팅
      setIsCheckSuccess(true);
    }
  }, [memberData]);

  // 중복 확인
  const handleCheckDuplicate = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      showToast('⚠️ 닉네임을 입력해 주세요.', 'warning');
      return;
    }

    if (trimmed === memberData.nickname) {
      showToast('✅ 현재 사용 중인 나의 닉네임입니다.', 'success');
      setIsCheckSuccess(true);
      setLastCheckedNickname(trimmed);
      return;
    }

    setChecking(true);
    try {
      const q = query(collection(db, 'users'), where('nickname', '==', trimmed));
      const snap = await getDocs(q);

      if (!snap.empty) {
        showToast('❌ 이미 사용 중인 닉네임입니다.', 'error');
        setIsCheckSuccess(false);
      } else {
        showToast('✅ 사용 가능한 닉네임입니다.', 'success');
        setIsCheckSuccess(true);
        setLastCheckedNickname(trimmed);
      }
    } catch (error) {
      console.error(error);
      showToast('❌ 중복 확인 중 에러가 발생했습니다.', 'error');
    } finally {
      setChecking(false);
    }
  };

  // 이미지 변경
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImageFile(file);
      setProfilePreviewUrl(URL.createObjectURL(file));
    }
  };

  // 프로필 업데이트 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedNick = nickname.trim();
    
    // 닉네임이 변경되었으나 중복검사를 통과하지 못한 경우
    if (trimmedNick !== memberData.nickname && (!isCheckSuccess || trimmedNick !== lastCheckedNickname)) {
      showToast('⚠️ 닉네임 중복 확인이 완료되지 않았습니다.', 'warning');
      return;
    }

    setLoading(true);
    let finalPhotoUrl = memberData.photoURL || '';

    try {
      // 이미지 파일이 선택된 경우 업로드 진행
      if (profileImageFile) {
        const imagePath = `profiles/${currentUser.uid}_${Date.now()}_${profileImageFile.name}`;
        const imageRef = ref(storage, imagePath);
        const uploadTask = await uploadBytesResumable(imageRef, profileImageFile);
        finalPhotoUrl = await getDownloadURL(uploadTask.ref);
      }

      const updatedPayload = {
        nickname: trimmedNick,
        bio: bio.trim(),
        photoURL: finalPhotoUrl
      };

      // Firestore 유저 업데이트
      await updateDoc(doc(db, 'users', currentUser.uid), updatedPayload);
      
      // 상위 컨텍스트 갱신 호출
      onUpdateProfile(updatedPayload);
      showToast('💾 프로필 정보가 수정되었습니다.', 'success');
      onBack();
    } catch (error) {
      console.error(error);
      showToast('❌ 프로필 정보 수정에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isNicknameChanged = nickname.trim() !== memberData?.nickname;
  const isSaveDisabled = loading || (isNicknameChanged && (!isCheckSuccess || nickname.trim() !== lastCheckedNickname));

  return (
    <div className="animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button className="btn-icon" onClick={onBack} title="홈으로">
          <ArrowLeft size={18} />
        </button>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>⚙️ 회원 정보 설정 수정</h2>
      </div>

      <form onSubmit={handleSubmit} className="card-sns" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* Avatar change */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <div className="avatar-circle" style={{ width: '80px', height: '80px' }}>
              {profilePreviewUrl ? (
                <img src={profilePreviewUrl} alt="Preview" />
              ) : (
                <Camera size={24} style={{ color: 'var(--text-muted)' }} />
              )}
            </div>
            <label 
              htmlFor="profile-edit-upload"
              style={{ 
                position: 'absolute', 
                bottom: 0, 
                right: 0, 
                background: 'var(--primary)', 
                color: 'white', 
                borderRadius: '50%', 
                padding: '6px',
                cursor: 'pointer',
                display: 'flex'
              }}
            >
              <Camera size={14} />
            </label>
            <input 
              id="profile-edit-upload"
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }}
              onChange={handleImageChange}
              disabled={loading}
            />
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>프로필 사진 변경</span>
        </div>

        {/* Nickname modification */}
        <div className="form-group">
          <label>닉네임 수정</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="새 닉네임 입력" 
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (e.target.value.trim() !== memberData.nickname) {
                  setIsCheckSuccess(false);
                } else {
                  setIsCheckSuccess(true);
                  setLastCheckedNickname(memberData.nickname);
                }
              }}
              required
              disabled={loading}
              style={{ flexGrow: 1 }}
            />
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={handleCheckDuplicate}
              disabled={loading || checking || (!isNicknameChanged)}
            >
              중복 확인
            </button>
          </div>
          {isNicknameChanged && isCheckSuccess && nickname.trim() === lastCheckedNickname && (
            <span style={{ fontSize: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <Check size={12} /> 변경 가능한 닉네임입니다.
            </span>
          )}
        </div>

        {/* Bio modification */}
        <div className="form-group">
          <label>남김말 수정</label>
          <textarea 
            rows="4" 
            placeholder="새로운 자기소개를 입력하세요." 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '16px', marginTop: '8px' }}>
          <button type="button" className="btn-secondary" onClick={onBack} disabled={loading}>취소</button>
          <button type="submit" className="btn-primary" disabled={isSaveDisabled}>
            <Save size={16} /> 설정 저장
          </button>
        </div>
      </form>
    </div>
  );
}
