import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';

export default function VisitorCounter() {
  const [visitorCount, setVisitorCount] = useState(0);

  useEffect(() => {
    fetch('/api/visitor')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setVisitorCount(data.count);
        }
      })
      .catch((err) => console.error("방문자 수 호출 실패:", err));
  }, []);

  return (
    <div className="visitor-counter" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Users size={18} className="text-secondary" />
      <span>오늘 누적 방문자 수: <strong style={{ color: 'var(--primary)' }}>{visitorCount.toLocaleString()}</strong> 명</span>
    </div>
  );
}
