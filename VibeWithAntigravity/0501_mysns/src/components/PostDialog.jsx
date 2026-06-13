import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Video, Trash2 } from 'lucide-react';
import { storage, ref, uploadBytesResumable, getDownloadURL } from '../firebase';

export default function PostDialog({ isOpen, onClose, onSave, showToast }) {
  const [content, setContent] = useState('');
  const [mediaType, setMediaType] = useState('none'); // 'none', 'image', 'video'
  
  // 업로드용 상태
  const [imageFiles, setImageFiles] = useState([]); // 최대 4개 이미지 파일 객체
  const [imagePreviews, setImagePreviews] = useState([]); // 미리보기 blob url
  const [representativeIndex, setRepresentativeIndex] = useState(0); // 대표 이미지 인덱스 (0~3)

  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');

  const [tagInput, setTagInput] = useState(''); // 쉼표나 공백으로 나열한 태그
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // 파일 선택 창 트리거
  const handleTriggerUpload = (type) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' ? 'image/*' : 'video/*';
      fileInputRef.current.multiple = type === 'image';
      fileInputRef.current.click();
    }
  };

  // 파일 선택 핸들러
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const acceptType = fileInputRef.current.accept;

    if (acceptType.startsWith('image')) {
      // 이미지 처리
      const totalImages = [...imageFiles, ...files];
      if (totalImages.length > 4) {
        showToast('⚠️ 이미지는 최대 4장까지만 등록 가능합니다.', 'warning');
        return;
      }

      setMediaType('image');
      setImageFiles(totalImages);
      
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImagePreviews([...imagePreviews, ...newPreviews]);
      
      // 비디오가 있으면 초기화
      setVideoFile(null);
      setVideoPreview('');
    } else {
      // 비디오 처리 (최대 1개)
      if (files.length > 1) {
        showToast('⚠️ 영상은 1개만 업로드할 수 있습니다.', 'warning');
        return;
      }
      setMediaType('video');
      setVideoFile(files[0]);
      setVideoPreview(URL.createObjectURL(files[0]));
      
      // 이미지가 있으면 초기화
      setImageFiles([]);
      setImagePreviews([]);
      setRepresentativeIndex(0);
    }
  };

  // 미디어 전체 삭제
  const handleClearMedia = () => {
    setImageFiles([]);
    setImagePreviews([]);
    setRepresentativeIndex(0);
    setVideoFile(null);
    setVideoPreview('');
    setMediaType('none');
  };

  // 게시물 등록 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && mediaType === 'none') {
      showToast('⚠️ 텍스트 내용 또는 미디어 파일을 추가해 주세요.', 'warning');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const uploadedUrls = [];

      // 1. 이미지 업로드
      if (mediaType === 'image' && imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const path = `posts/images/${Date.now()}_${i}_${file.name}`;
          const storageRef = ref(storage, path);
          const uploadTask = await uploadBytesResumable(storageRef, file);
          const downloadUrl = await getDownloadURL(uploadTask.ref);
          uploadedUrls.push(downloadUrl);
        }
      }

      // 2. 비디오 업로드
      if (mediaType === 'video' && videoFile) {
        const path = `posts/videos/${Date.now()}_${videoFile.name}`;
        const storageRef = ref(storage, path);
        const uploadTask = await uploadBytesResumable(storageRef, videoFile);
        const downloadUrl = await getDownloadURL(uploadTask.ref);
        uploadedUrls.push(downloadUrl);
      }

      // 3. 해시태그 정리
      // 공백 제거 후 쉼표나 띄어쓰기로 태그 분리
      const parsedTags = tagInput
        .split(/[,\s#]+/)
        .map(tag => tag.trim().replace('#', ''))
        .filter(tag => tag.length > 0);

      // 4. 부모 저장소 전달
      await onSave({
        content: content.trim(),
        mediaType,
        mediaUrls: uploadedUrls,
        representativeIndex: mediaType === 'image' ? representativeIndex : 0,
        tags: parsedTags
      });

      showToast('🎉 게시물이 등록되었습니다!', 'success');
      handleResetForm();
      onClose();
    } catch (error) {
      console.error(error);
      showToast('❌ 게시글 등록 중 에러가 발생했습니다.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleResetForm = () => {
    setContent('');
    setMediaType('none');
    setImageFiles([]);
    setImagePreviews([]);
    setRepresentativeIndex(0);
    setVideoFile(null);
    setVideoPreview('');
    setTagInput('');
    setProgress(0);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card-sns animate-slide" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>✍️ 게시물 작성</h2>
          <button className="btn-icon" onClick={onClose} style={{ background: 'none' }} disabled={uploading}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Content TextArea */}
          <div className="form-group">
            <textarea 
              rows="4" 
              placeholder="친구들에게 전할 이야기를 작성하세요... (해시태그 예: #날씨 #소풍)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required={mediaType === 'none'}
              disabled={uploading}
              style={{ width: '100%' }}
            />
          </div>

          {/* Tag Input */}
          <div className="form-group">
            <label>태그 등록 (쉼표 또는 공백으로 구분)</label>
            <input 
              type="text" 
              placeholder="예: 여행, 일상, 힐링"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              disabled={uploading}
            />
          </div>

          {/* Media Attach Controls */}
          {mediaType === 'none' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flexGrow: 1 }}
                onClick={() => handleTriggerUpload('image')}
                disabled={uploading}
              >
                <ImageIcon size={18} style={{ color: '#ec4899' }} /> 사진 첨부 (최대 4장)
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flexGrow: 1 }}
                onClick={() => handleTriggerUpload('video')}
                disabled={uploading}
              >
                <Video size={18} style={{ color: '#06b6d4' }} /> 비디오 첨부 (1개)
              </button>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
          />

          {/* Media Previews & Representative Image Select */}
          {mediaType !== 'none' && (
            <div className="card-sns" style={{ padding: '12px', background: '#f8f9fa', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>
                  📂 첨부 파일 목록 ({mediaType === 'image' ? `${imageFiles.length}장` : '비디오 1개'})
                </span>
                <button 
                  type="button" 
                  className="btn-danger" 
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                  onClick={handleClearMedia}
                  disabled={uploading}
                >
                  <Trash2 size={12} /> 첨부 초기화
                </button>
              </div>

              {mediaType === 'image' ? (
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    * 대표로 노출할 이미지를 클릭해 선택해 주세요.
                  </p>
                  <div className="media-previews">
                    {imagePreviews.map((src, index) => {
                      const isRep = index === representativeIndex;
                      return (
                        <div 
                          key={index} 
                          className={`media-preview-item ${isRep ? 'representative' : ''}`}
                          onClick={() => setRepresentativeIndex(index)}
                          style={{ cursor: 'pointer' }}
                        >
                          <img src={src} alt="Upload preview" />
                          {isRep && <span className="rep-indicator">대표</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ width: '100%', height: '140px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                  <video src={videoPreview} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>
          )}

          {uploading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>콘텐츠를 안전하게 업로드 중입니다...</span>
              <div style={{ width: '100%', height: '4px', background: 'var(--border-light)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: 'var(--primary)', animation: 'progressAnim 2s infinite ease-in-out' }}></div>
              </div>
            </div>
          )}

          <div className="modal-footer" style={{ marginTop: '8px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={uploading}>취소</button>
            <button type="submit" className="btn-primary" disabled={uploading}>
              게시물 등록
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes progressAnim {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}
