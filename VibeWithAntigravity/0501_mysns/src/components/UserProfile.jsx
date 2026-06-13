import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, MessageCircle, Calendar } from 'lucide-react';
import { db, collection, getDocs, getDoc, doc, query, where } from '../firebase';

export default function UserProfile({ targetUid, onBack, showToast }) {
  const [profile, setProfile] = useState(null);
  const [postCount, setPostCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetUid) return;

    const loadProfileData = async () => {
      setLoading(true);
      try {
        // 1. 프로필 정보 획득
        const userSnap = await getDoc(doc(db, 'users', targetUid));
        if (userSnap.exists()) {
          setProfile(userSnap.data());
        }

        // 2. 작성한 게시물 수 집계
        const postsQuery = query(collection(db, 'posts'), where('authorUid', '==', targetUid));
        const postsSnap = await getDocs(postsQuery);
        setPostCount(postsSnap.size);

        // 3. 댓글 단 개수 집계 (전체 posts의 하위 comments를 다 훑어서 작성한 댓글 수 탐색)
        // Cloud Firestore에서 복잡한 cross-subcollection 쿼리는 제한되므로,
        // 여기서는 전체 게시물을 읽어와 해당 사용자가 등록한 댓글의 총합을 루프로 산출합니다.
        let totalComments = 0;
        const allPostsSnap = await getDocs(collection(db, 'posts'));
        
        for (const postDoc of allPostsSnap.docs) {
          const commentsSnap = await getDocs(collection(db, 'posts', postDoc.id, 'comments'));
          commentsSnap.forEach(commentDoc => {
            if (commentDoc.data().authorUid === targetUid) {
              totalComments++;
            }
          });
        }
        setCommentCount(totalComments);
      } catch (error) {
        console.error(error);
        showToast('❌ 프로필 정보를 읽어오는 중 에러가 발생했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [targetUid]);

  if (loading) {
    return (
      <div className="card-sns animate-slide" style={{ padding: '60px', textAlign: 'center' }}>
        <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid var(--border-light)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}></div>
        <span>프로필 로딩 중...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card-sns animate-slide" style={{ padding: '40px', textAlign: 'center' }}>
        <p>해당 사용자를 찾을 수 없거나 탈퇴한 회원입니다.</p>
        <button className="btn-secondary" onClick={onBack} style={{ marginTop: '16px' }}>
          <ArrowLeft size={16} /> 홈으로 이동
        </button>
      </div>
    );
  }

  const getJoinDateString = () => {
    if (!profile.createdAt) return '';
    const date = new Date(profile.createdAt.seconds * 1000);
    return date.toLocaleDateString();
  };

  return (
    <div className="animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button className="btn-icon" onClick={onBack} title="뒤로가기">
          <ArrowLeft size={18} />
        </button>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>👤 회원 프로필</h2>
      </div>

      <div className="card-sns profile-card">
        {/* Avatar */}
        <div className="profile-avatar" style={{ overflow: 'hidden', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {profile.photoURL ? (
            <img src={profile.photoURL} alt={profile.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '36px', fontWeight: 700, color: 'var(--primary)' }}>{profile.nickname?.charAt(0)}</span>
          )}
        </div>

        {/* Info */}
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 800 }}>{profile.nickname}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            {profile.email}
          </p>
        </div>

        {/* Bio */}
        <div style={{ width: '100%', maxWidth: '400px', background: '#f0f2f5', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {profile.bio || '등록된 남김말이 없습니다.'}
        </div>

        {/* Join date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <Calendar size={14} />
          <span>가입일: {getJoinDateString()}</span>
        </div>

        {/* Activity Statistics */}
        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-value">{postCount}</span>
            <span className="stat-label">
              <BookOpen size={12} style={{ display: 'inline', marginRight: '4px' }} /> 작성 게시물
            </span>
          </div>

          <div className="stat-item">
            <span className="stat-value">{commentCount}</span>
            <span className="stat-label">
              <MessageCircle size={12} style={{ display: 'inline', marginRight: '4px' }} /> 등록 댓글
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
