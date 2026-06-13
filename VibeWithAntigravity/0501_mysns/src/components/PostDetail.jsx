import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ChevronLeft, ChevronRight, MessageSquare, AlertCircle } from 'lucide-react';
import { db, collection, addDoc, doc, updateDoc, serverTimestamp } from '../firebase';
import { onSnapshot } from 'firebase/firestore';

export default function PostDetail({ isOpen, onClose, post, currentUser, memberData, onAuthorClick, showToast }) {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 이미지 슬라이더 관련 상태
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const commentsEndRef = useRef(null);

  // 실시간 댓글 로드
  useEffect(() => {
    if (!isOpen || !post) return;

    const commentsRef = collection(db, 'posts', post.id, 'comments');
    const unsubscribe = onSnapshot(commentsRef, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // 등록 순 정렬 (시간 기준)
      list.sort((a, b) => {
        const t1 = a.createdAt?.seconds || 0;
        const t2 = b.createdAt?.seconds || 0;
        return t1 - t2;
      });
      setComments(list);
    }, (error) => {
      console.error(error);
    });

    return () => unsubscribe();
  }, [isOpen, post]);

  if (!isOpen || !post) return null;

  // 댓글 비즈니스 룰 검증
  const isMyPost = post.authorUid === currentUser?.uid;
  const hasAlreadyCommented = comments.some(c => c.authorUid === currentUser?.uid);
  const canComment = !isMyPost && !hasAlreadyCommented;

  // 댓글 전송 핸들러
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !canComment || submitting) return;

    setSubmitting(true);
    const textToSend = commentText.trim();
    setCommentText('');

    try {
      // 1) 댓글 데이터 추가
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        postId: post.id,
        authorUid: currentUser.uid,
        authorNickname: memberData.nickname,
        authorPhotoURL: memberData.photoURL || '',
        text: textToSend,
        createdAt: serverTimestamp()
      });

      // 2) 게시물 정보 업데이트 (댓글 수 증가)
      await updateDoc(doc(db, 'posts', post.id), {
        commentCount: (post.commentCount || 0) + 1
      });

      showToast('💬 댓글이 성공적으로 추가되었습니다!', 'success');
      
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error(error);
      showToast('❌ 댓글 작성에 실패했습니다.', 'error');
      setCommentText(textToSend);
    } finally {
      setSubmitting(false);
    }
  };

  // 슬라이더 이동
  const handlePrevImage = () => {
    setActiveImageIndex(prev => (prev === 0 ? post.mediaUrls.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex(prev => (prev === post.mediaUrls.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card-sns animate-slide" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        {/* Header: Author info */}
        <div className="modal-header">
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            onClick={() => {
              onClose();
              onAuthorClick(post.authorUid);
            }}
          >
            <div className="avatar-circle">
              {post.authorPhotoURL ? (
                <img src={post.authorPhotoURL} alt={post.authorNickname} />
              ) : (
                post.authorNickname?.charAt(0) || 'U'
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>{post.authorNickname} 님의 게시물</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : ''}
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ background: 'none' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content text */}
        <div style={{ fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
          {post.content}
        </div>

        {/* Slider Media Area */}
        {post.mediaType !== 'none' && post.mediaUrls?.length > 0 && (
          <div style={{ position: 'relative' }}>
            {post.mediaType === 'image' ? (
              <div className="slider-container">
                {post.mediaUrls.length > 1 && (
                  <>
                    <button className="slider-btn prev" onClick={handlePrevImage}>
                      <ChevronLeft size={20} />
                    </button>
                    <button className="slider-btn next" onClick={handleNextImage}>
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
                <img 
                  src={post.mediaUrls[activeImageIndex]} 
                  alt={`Slide ${activeImageIndex}`} 
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
                {post.mediaUrls.length > 1 && (
                  <div style={{ position: 'absolute', bottom: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>
                    {activeImageIndex + 1} / {post.mediaUrls.length}
                  </div>
                )}
              </div>
            ) : (
              <div className="slider-container" style={{ height: '300px' }}>
                <video src={post.mediaUrls[0]} controls autoPlay className="preview-video" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="post-tags" style={{ marginTop: '2px' }}>
            {post.tags.map((tag, idx) => (
              <span key={idx} className="tag-badge">#{tag}</span>
            ))}
          </div>
        )}

        {/* Comment Section */}
        <div className="comment-section">
          <h3 style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={16} /> 댓글 ({comments.length}개)
          </h3>

          {/* List of comments */}
          <div className="comments-list">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="avatar-circle" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                    {comment.authorPhotoURL ? (
                      <img src={comment.authorPhotoURL} alt={comment.authorNickname} />
                    ) : (
                      comment.authorNickname?.charAt(0)
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="comment-bubble">
                      <span className="comment-author">{comment.authorNickname}</span>
                      <span>{comment.text}</span>
                    </div>
                    {comment.createdAt && (
                      <span className="comment-meta">
                        {new Date(comment.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '16px 0' }}>
                첫 댓글을 달아 소통을 시작해 보세요!
              </p>
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Comment Form with Constraints */}
          {currentUser && (
            <div style={{ marginTop: '8px' }}>
              {isMyPost ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                  <AlertCircle size={16} style={{ color: 'var(--text-muted)' }} />
                  <span>자신의 게시물에는 댓글을 작성할 수 없습니다.</span>
                </div>
              ) : hasAlreadyCommented ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                  <AlertCircle size={16} style={{ color: 'var(--text-muted)' }} />
                  <span>이 게시글에 이미 댓글을 작성하셨습니다. (1인 1댓글 제한)</span>
                </div>
              ) : (
                <form onSubmit={handleCommentSubmit} className="comment-input-area">
                  <input 
                    type="text" 
                    placeholder="댓글 입력..." 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={submitting}
                    style={{ flexGrow: 1, padding: '8px 12px' }}
                  />
                  <button type="submit" className="btn-primary" disabled={submitting || !commentText.trim()} style={{ padding: '8px 14px' }}>
                    <Send size={14} /> 등록
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
