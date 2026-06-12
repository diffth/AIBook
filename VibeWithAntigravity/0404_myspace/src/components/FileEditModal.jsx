import React, { useState, useEffect } from 'react';
import { X, Edit2 } from 'lucide-react';

export default function FileEditModal({ isOpen, onClose, file, onUpdate }) {
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (file) {
      // 확장자 분리하여 이름만 기본값으로 세팅하거나 전체 세팅
      setNewName(file.name);
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim() || newName === file.name) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      await onUpdate(file.id, newName.trim());
      onClose();
    } catch (error) {
      console.error(error);
      alert('파일명 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card-glass animate-scale" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ 파일 이름 수정</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label>새 파일 이름</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="파일 이름 입력" 
                style={{ width: '100%', paddingLeft: '40px' }}
                required 
              />
              <Edit2 size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '8px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>취소</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '수정 중...' : '이름 변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
