import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Plus, X, Utensils } from 'lucide-react';

export default function FoodInput({ onAnalyze, loading }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [base64Data, setBase64Data] = useState(null);
  const [mimeType, setMimeType] = useState('');
  const [description, setDescription] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    if (!file) return;

    // 이미지 파일 형식 검증
    if (!file.type.startsWith('image/')) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    setMimeType(file.type);
    
    // FileReader로 Base64 스트링 및 이미지 미리보기 URL 획득
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result); // 미리보기 데이터 URL
      
      // Base64 실제 순수 바디 데이터만 추출
      const base64Body = e.target.result.split(',')[1];
      setBase64Data(base64Body);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation(); // 드롭존 클릭 이벤트 방지
    setImageSrc(null);
    setBase64Data(null);
    setMimeType('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;

    onAnalyze({
      image: base64Data,
      mimeType: mimeType,
      text: description.trim()
    });
  };

  return (
    <div className="wellness-card">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: imageSrc ? '1.2fr 1fr' : '1fr', gap: '20px' }}>
          {/* 드롭존 영역 */}
          <div
            className="food-dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !loading && fileInputRef.current.click()}
            style={{
              borderColor: isDragOver ? 'var(--primary)' : 'rgba(139, 195, 74, 0.2)',
              backgroundColor: isDragOver ? 'rgba(139, 195, 74, 0.05)' : 'rgba(139, 195, 74, 0.01)',
              opacity: loading ? 0.6 : 1,
              minHeight: '200px',
              justifyContent: 'center'
            }}
          >
            {imageSrc ? (
              <div style={{ width: '100%', position: 'relative' }}>
                <div className="preview-container">
                  <img src={imageSrc} alt="음식 미리보기" className="preview-img" />
                  {!loading && (
                    <button type="button" className="remove-img-btn" onClick={handleRemoveImage}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                  ✓ 이미지 교체하려면 클릭 또는 파일 드롭
                </p>
              </div>
            ) : (
              <>
                <Camera size={36} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
                    여기에 음식 사진을 드롭하거나 클릭하여 업로드
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    * 촬영된 사진이 있으면 AI가 그릇 크기와 양을 더 정확하게 파악합니다.
                  </p>
                </div>
              </>
            )}
            
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
              disabled={loading}
            />
          </div>

          {/* 설명 텍스트 영역 */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                <Utensils size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                음식 텍스트 설명 (보조 입력 또는 단독 입력)
              </label>
              <textarea
                className="form-input"
                placeholder="예: 점심으로 김치볶음밥 1인분 먹었어, 계란후라이 추가함"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                style={{
                  height: imageSrc ? '142px' : '100px',
                  resize: 'none',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', marginTop: '20px' }}>
          <button
            type="submit"
            className="btn btn-green"
            disabled={loading || (!base64Data && !description.trim())}
            style={{ width: '100%', padding: '14px', borderRadius: '10px' }}
          >
            {loading ? 'AI 영양사 분석 중...' : '음식 영양소 분석 실행'}
          </button>
        </div>
      </form>
    </div>
  );
}
