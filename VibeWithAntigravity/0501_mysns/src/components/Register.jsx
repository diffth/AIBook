import React, { useState } from 'react';
import { Camera, Check, Shield } from 'lucide-react';
import { db, collection, getDocs, query, where, ref, uploadBytesResumable, getDownloadURL, storage } from '../firebase';

export default function Register({ tempUser, onCompleteRegister, showToast }) {
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState(tempUser?.photoURL || '');

  // 중복 검사 관련 상태
  const [isCheckSuccess, setIsCheckSuccess] = useState(false);
  const [lastCheckedNickname, setLastCheckedNickname] = useState('');
  const [checking, setChecking] = useState(false);

  // 약관 동의 상태
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [loading, setLoading] = useState(false);

  const isFormValid = agreeTerms && agreePrivacy && isCheckSuccess && nickname === lastCheckedNickname;

  // 닉네임 중복 확인 (Firestore 쿼리)
  const handleCheckDuplicate = async () => {
    if (!nickname.trim()) {
      showToast('⚠️ 닉네임을 입력해 주세요.', 'warning');
      return;
    }

    setChecking(true);
    try {
      const q = query(collection(db, 'users'), where('nickname', '==', nickname.trim()));
      const snap = await getDocs(q);

      if (!snap.empty) {
        showToast('❌ 이미 사용 중인 닉네임입니다.', 'error');
        setIsCheckSuccess(false);
      } else {
        showToast('✅ 사용 가능한 닉네임입니다.', 'success');
        setIsCheckSuccess(true);
        setLastCheckedNickname(nickname.trim());
      }
    } catch (error) {
      console.error(error);
      showToast('❌ 중복 확인에 실패했습니다.', 'error');
    } finally {
      setChecking(false);
    }
  };

  // 프로필 이미지 선택
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImageFile(file);
      setProfilePreviewUrl(URL.createObjectURL(file));
    }
  };

  // 회원가입 전송
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || loading) return;

    setLoading(true);
    let finalPhotoUrl = tempUser?.photoURL || '';

    try {
      // 1) 사진을 Storage에 업로드 (사용자가 사진을 새로 선택했을 경우)
      if (profileImageFile) {
        const imagePath = `profiles/${tempUser.uid}_${Date.now()}_${profileImageFile.name}`;
        const imageRef = ref(storage, imagePath);
        const uploadTask = await uploadBytesResumable(imageRef, profileImageFile);
        finalPhotoUrl = await getDownloadURL(uploadTask.ref);
      }

      // 2) 가입 데이터 생성 및 부모 핸들러 전달
      await onCompleteRegister({
        uid: tempUser.uid,
        email: tempUser.email,
        nickname: nickname.trim(),
        bio: bio.trim(),
        photoURL: finalPhotoUrl,
        role: 'member',
        status: 'active'
      });
    } catch (error) {
      console.error(error);
      showToast('❌ 회원가입 처리 중 에러가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card card-sns animate-slide">
        <h2 style={{ fontSize: '20px', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>
          📝 회원 가입 프로필 셋업
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', marginBottom: '24px' }}>
          서비스 이용을 위해 닉네임과 프로필 정보를 입력해 주세요.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Profile Picture */}
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
                htmlFor="profile-upload"
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
                id="profile-upload"
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }}
                onChange={handleImageChange}
                disabled={loading}
              />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>프로필 사진 등록 (선택)</span>
          </div>

          {/* Nickname Input & Dup Check */}
          <div className="form-group">
            <label>닉네임 *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="고유 닉네임 입력 (한글/영어/숫자)" 
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setIsCheckSuccess(false); // 변경 시 재인증 유도
                }}
                required
                disabled={loading}
                style={{ flexGrow: 1 }}
              />
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleCheckDuplicate}
                disabled={loading || checking || !nickname.trim()}
                style={{ flexShrink: 0 }}
              >
                중복 확인
              </button>
            </div>
            {isCheckSuccess && nickname === lastCheckedNickname && (
              <span style={{ fontSize: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Check size={12} /> 사용 가능한 닉네임입니다.
              </span>
            )}
          </div>

          {/* Bio (남김말) */}
          <div className="form-group">
            <label>남김말 (Bio)</label>
            <textarea 
              rows="3" 
              placeholder="내 프로필에 노출될 소개글을 적어보세요." 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Terms and Privacy Agreement */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700 }}>📜 약관 동의</label>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={agreeTerms} 
                  onChange={(e) => setAgreeTerms(e.target.checked)} 
                  style={{ marginTop: '3px' }}
                />
                <span>[필수] 서비스 이용약관 동의</span>
              </label>
              <div className="terms-container">
                제1조 (목적) 본 약관은 MemberSpace SNS(이하 "서비스")가 제공하는 제반 서비스의 이용에 관한 권리와 의무, 책임사항을 규정함을 목적으로 합니다.
                제2조 (개인정보의 보호) 서비스는 회원의 개인정보를 보호하기 위해 최선을 다하며, 관련 법령 및 개인정보처리방침을 준수합니다.
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer', marginTop: '6px' }}>
                <input 
                  type="checkbox" 
                  checked={agreePrivacy} 
                  onChange={(e) => setAgreePrivacy(e.target.checked)} 
                  style={{ marginTop: '3px' }}
                />
                <span>[필수] 개인정보 수집 및 이용 동의</span>
              </label>
              <div className="terms-container">
                1. 수집 항목: 구글 이메일 주소, 프로필 이미지, 닉네임, 남김말
                2. 수집 목적: 회원 가입 인증 및 프로필 커뮤니케이션 지원
                3. 보유 기간: 회원 탈퇴 시 즉시 영구 파기
              </div>
            </div>
          </div>

          {/* Register Button */}
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={!isFormValid || loading}
            style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '12px' }}
          >
            {loading ? '가입 처리 중...' : '회원가입 완료'}
          </button>
        </form>
      </div>
    </div>
  );
}
