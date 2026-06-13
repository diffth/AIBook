import React from 'react';
import { Play, MessageSquare, Tag } from 'lucide-react';

export default function PostFeed({ posts, onPostClick, onAuthorClick }) {
  
  const getPostDateString = (post) => {
    if (!post.createdAt) return '';
    const date = new Date(post.createdAt.seconds * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="feed-container">
      {posts.map((post) => {
        const hasImages = post.mediaType === 'image' && post.mediaUrls?.length > 0;
        const hasVideo = post.mediaType === 'video' && post.mediaUrls?.length > 0;
        
        // 대표 이미지 URL
        const representativeUrl = hasImages 
          ? (post.mediaUrls[post.representativeIndex] || post.mediaUrls[0]) 
          : null;

        return (
          <div 
            key={post.id} 
            className="post-card card-sns animate-slide"
            style={{ cursor: 'pointer' }}
            onClick={() => onPostClick(post)}
          >
            {/* Header: Author info */}
            <div className="post-header">
              <div 
                className="post-author"
                onClick={(e) => {
                  e.stopPropagation();
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
                <div className="post-author-info">
                  <span className="post-author-name">{post.authorNickname || '익명 회원'}</span>
                  <span className="post-date">{getPostDateString(post)}</span>
                </div>
              </div>
            </div>

            {/* Body: content text */}
            <div className="post-body">
              {post.content}
            </div>

            {/* Media: Image / Video Thumbnail */}
            {post.mediaType !== 'none' && post.mediaUrls?.length > 0 && (
              <div className="post-body-media" style={{ marginTop: '4px' }}>
                {hasImages && representativeUrl && (
                  <div className="post-media">
                    <img src={representativeUrl} alt="Post media thumbnail" loading="lazy" />
                    {post.mediaUrls.length > 1 && (
                      <span className="media-badge">
                        +{post.mediaUrls.length - 1}장 더보기
                      </span>
                    )}
                  </div>
                )}

                {hasVideo && (
                  <div className="post-media">
                    <video src={post.mediaUrls[0]} preload="metadata" muted />
                    <div style={{
                      position: 'absolute',
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(24, 119, 242, 0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: 'var(--shadow-md)'
                    }}>
                      <Play size={20} fill="white" style={{ marginLeft: '2px' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="post-tags" style={{ marginTop: '4px' }}>
                {post.tags.map((tag, idx) => (
                  <span key={idx} className="tag-badge">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Footer: Stats */}
            <div className="post-footer">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={16} /> 댓글 {post.commentCount || 0}개
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
