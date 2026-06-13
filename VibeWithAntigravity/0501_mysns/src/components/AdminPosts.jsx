import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, X, Image as ImageIcon, Video, MessageSquare, Save } from 'lucide-react';
import { db, collection, doc, getDocs, updateDoc, deleteDoc } from '../firebase';
import { onSnapshot } from 'firebase/firestore';

export default function AdminPosts({ posts, onDeletePost, showToast }) {
  const [selectedPost, setSelectedPost] = useState(null);
  
  // 게시글 편집용 상태
  const [editContent, setEditContent] = useState('');
  const [postMediaUrls, setPostMediaUrls] = useState([]);
  
  // 댓글 목록 상태
  const [comments, setComments] = useState([]);
  
  // 개별 댓글 편집을 위한 상태
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // 특정 글 선택 시 실시간 댓글 로드 및 상태 복사
  useEffect(() => {
    if (!selectedPost) return;
    
    setEditContent(selectedPost.content || '');
    setPostMediaUrls(selectedPost.mediaUrls || []);

    const commentsRef = collection(db, 'posts', selectedPost.id, 'comments');
    const unsubscribe = onSnapshot(commentsRef, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // 시간순 정렬
      list.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setComments(list);
    }, (error) => {
      console.error(error);
    });

    return () => unsubscribe();
  }, [selectedPost]);

  // 게시글 메인 데이터 저장 (내용 수정)
  const handleSavePost = async (e) => {
    e.preventDefault();
    if (!selectedPost) return;

    try {
      await updateDoc(doc(db, 'posts', selectedPost.id), {
        content: editContent.trim(),
        mediaUrls: postMediaUrls
      });
      showToast('💾 게시물 내용이 정상적으로 편집되었습니다.', 'success');
      setSelectedPost(null);
    } catch (error) {
      console.error(error);
      showToast('❌ 게시물 수정 중 오류가 발생했습니다.', 'error');
    }
  };

  // 첨부 미디어 개별 삭제
  const handleDeleteMediaItem = async (indexToDelete) => {
    if (window.confirm('이 사진/영상을 게시물에서 영구 삭제하시겠습니까?')) {
      const nextUrls = postMediaUrls.filter((_, idx) => idx !== indexToDelete);
      
      try {
        // 우선 화면에 선반영
        setPostMediaUrls(nextUrls);
        
        // Firestore 업데이트 (동시 처리)
        await updateDoc(doc(db, 'posts', selectedPost.id), {
          mediaUrls: nextUrls,
          // 대표 인덱스가 유효 범위를 넘어가면 0으로 강제 초기화
          representativeIndex: selectedPost.representativeIndex >= nextUrls.length ? 0 : selectedPost.representativeIndex
        });
        showToast('🗑️ 선택한 첨부 미디어가 삭제되었습니다.', 'success');
      } catch (error) {
        console.error(error);
        showToast('❌ 미디어 파일 삭제 중 에러 발생.', 'error');
      }
    }
  };

  // 게시글 자체 삭제
  const handlePostDelete = async (postId) => {
    if (window.confirm('이 게시물을 정말로 완전히 삭제하시겠습니까?\n모든 미디어와 댓글이 지워집니다.')) {
      try {
        await onDeletePost(postId);
        showToast('🗑️ 게시물이 영구 삭제되었습니다.', 'success');
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(null);
        }
      } catch (error) {
        console.error(error);
        showToast('❌ 게시물 삭제 실패.', 'error');
      }
    }
  };

  // 댓글 개별 수정 진입
  const handleStartEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text || '');
  };

  // 댓글 개별 수정 전송
  const handleSaveComment = async (commentId) => {
    if (!editingCommentText.trim() || !selectedPost) return;

    try {
      await updateDoc(doc(db, 'posts', selectedPost.id, 'comments', commentId), {
        text: editingCommentText.trim()
      });
      showToast('✏️ 댓글이 수정되었습니다.', 'success');
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (error) {
      console.error(error);
      showToast('❌ 댓글 수정 실패.', 'error');
    }
  };

  // 댓글 개별 삭제
  const handleDeleteComment = async (comment) => {
    if (!selectedPost) return;

    if (window.confirm(`"${comment.authorNickname}" 님의 댓글을 삭제하시겠습니까?`)) {
      try {
        await deleteDoc(doc(db, 'posts', selectedPost.id, 'comments', comment.id));
        
        // 게시물의 총 댓글 수 차감
        await updateDoc(doc(db, 'posts', selectedPost.id), {
          commentCount: Math.max(0, (selectedPost.commentCount || 0) - 1)
        });
        
        showToast('🗑️ 댓글이 삭제되었습니다.', 'success');
      } catch (error) {
        console.error(error);
        showToast('❌ 댓글 삭제 실패.', 'error');
      }
    }
  };

  return (
    <div className="animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1c223f' }}>📝 콘텐츠 관리</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
          사용자들이 작성한 모든 포스트, 미디어, 댓글을 검열하고 제재 조율이 가능합니다.
        </p>
      </div>

      <div className="table-wrapper card-sns">
        <table className="sns-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>작성자</th>
              <th>게시물 내용</th>
              <th>미디어</th>
              <th>댓글수</th>
              <th style={{ textAlign: 'right' }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {posts.length > 0 ? (
              posts.map((post) => (
                <tr key={post.id}>
                  <td style={{ fontWeight: 600 }}>{post.authorNickname}</td>
                  <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.content}
                  </td>
                  <td>
                    {post.mediaType === 'image' && <span style={{ color: '#ec4899', fontSize: '12px', fontWeight: 600 }}>📷 이미지 ({post.mediaUrls?.length}장)</span>}
                    {post.mediaType === 'video' && <span style={{ color: '#06b6d4', fontSize: '12px', fontWeight: 600 }}>🎥 동영상 (1개)</span>}
                    {post.mediaType === 'none' && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>텍스트</span>}
                  </td>
                  <td>{post.commentCount || 0}개</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => setSelectedPost(post)}
                      >
                        검열 / 편집
                      </button>
                      <button 
                        className="btn-danger" 
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => handlePostDelete(post.id)}
                      >
                        <Trash2 size={13} /> 삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  등록된 게시물이 아직 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 어드민용 검열 및 편집 세부 모달 */}
      {selectedPost && (
        <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="modal-content card-sns animate-pop" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', maxHeight: '95vh' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>🛠️ 콘텐츠 상세 편집 검열</h2>
              <button className="btn-icon" onClick={() => setSelectedPost(null)} style={{ background: 'none' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePost} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Content Edit */}
              <div className="form-group">
                <label style={{ fontWeight: 700 }}>게시물 내용 편집</label>
                <textarea 
                  rows="3" 
                  value={editContent} 
                  onChange={(e) => setEditContent(e.target.value)} 
                  required
                />
              </div>

              {/* Media Edit list */}
              {postMediaUrls.length > 0 && (
                <div className="form-group">
                  <label style={{ fontWeight: 700 }}>첨부 미디어 검열 (개별 삭제 가능)</label>
                  <div className="media-previews" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    {postMediaUrls.map((url, idx) => (
                      <div key={idx} className="media-preview-item" style={{ position: 'relative' }}>
                        {selectedPost.mediaType === 'image' ? (
                          <img src={url} alt="Media inspection" />
                        ) : (
                          <video src={url} muted />
                        )}
                        <button
                          type="button"
                          className="btn-danger"
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            padding: '3px',
                            borderRadius: '50%',
                            border: 'none',
                            lineHeight: 1
                          }}
                          onClick={() => handleDeleteMediaItem(idx)}
                          title="미디어 영구 삭제"
                        >
                          <Trash2 size={10} style={{ color: 'white' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form submit */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setSelectedPost(null)}>취소</button>
                <button type="submit" className="btn-primary" style={{ fontSize: '13px' }}>
                  <Save size={14} /> 게시글 저장
                </button>
              </div>
            </form>

            {/* 댓글 검열 리스트 */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={16} /> 댓글 모니터링 및 개별 제어
              </h3>

              <div className="comments-list" style={{ maxHeight: '200px', background: '#f8f9fa', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px dashed var(--border-light)', paddingBottom: '6px', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexGrow: 1 }}>
                        <div className="avatar-circle" style={{ width: '24px', height: '24px', fontSize: '9px', flexShrink: 0 }}>
                          {comment.authorNickname?.charAt(0)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexGrow: 1 }}>
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>{comment.authorNickname}</span>
                          {editingCommentId === comment.id ? (
                            <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                              <input 
                                type="text"
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                style={{ padding: '4px 8px', fontSize: '12px', flexGrow: 1 }}
                              />
                              <button 
                                className="btn-primary" 
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                onClick={() => handleSaveComment(comment.id)}
                              >
                                저장
                              </button>
                              <button 
                                className="btn-secondary" 
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                onClick={() => setEditingCommentId(null)}
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{comment.text}</span>
                          )}
                        </div>
                      </div>

                      {/* Comment action btn */}
                      {editingCommentId !== comment.id && (
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button 
                            className="btn-icon" 
                            style={{ padding: '4px' }}
                            onClick={() => handleStartEditComment(comment)}
                            title="댓글 강제 수정"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button 
                            className="btn-icon" 
                            style={{ padding: '4px', color: 'var(--danger)' }}
                            onClick={() => handleDeleteComment(comment)}
                            title="댓글 삭제"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '12px 0' }}>
                    등록된 댓글이 존재하지 않습니다.
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
