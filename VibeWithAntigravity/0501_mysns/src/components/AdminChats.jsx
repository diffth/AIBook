import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, AlertCircle } from 'lucide-react';
import { 
  db, 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from '../firebase';
import { onSnapshot } from 'firebase/firestore';

export default function AdminChats({ chatRooms, onResetUnreadCount, showToast }) {
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  // 현재 선택된 대화방 정보 찾기
  const activeRoom = chatRooms.find(r => r.id === activeRoomId);

  // 실시간 메시지 구독
  useEffect(() => {
    if (!activeRoomId) return;

    // 대화방에 진입하면 관리자의 unreadCount를 0으로 초기화해 줌
    onResetUnreadCount(activeRoomId);

    const messagesQuery = query(
      collection(db, 'chats', activeRoomId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
      
      // 스크롤 최하단 이동
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      console.error("Messages sync error:", error);
      showToast('❌ 메시지를 불러오는 중 에러가 발생했습니다.', 'error');
    });

    return () => unsubscribe();
  }, [activeRoomId]);

  // 메시지 전송 핸들러
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeRoomId || sending) return;

    setSending(true);
    const textToSend = inputText.trim();
    setInputText('');

    try {
      // 1. 하위 컬렉션 messages에 새 메시지 추가
      await addDoc(collection(db, 'chats', activeRoomId, 'messages'), {
        senderId: 'admin',
        senderName: '관리자',
        text: textToSend,
        createdAt: serverTimestamp()
      });

      // 2. 대화방 문서(상위)에 마지막 메시지 정보 갱신
      await updateDoc(doc(db, 'chats', activeRoomId), {
        lastMessage: textToSend,
        lastMessageTime: serverTimestamp(),
        // 관리자가 메시지를 보냈으므로 unreadCount는 0 유지
        unreadCount: 0
      });
    } catch (error) {
      console.error("Message send error:", error);
      showToast('❌ 메시지 전송에 실패했습니다.', 'error');
      setInputText(textToSend); // 실패 시 입력창 텍스트 복구
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-container animate-pop">
      {/* Sidebar - Chat rooms list */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <span style={{ fontSize: '15px' }}>💬 대화방 목록 ({chatRooms.length})</span>
        </div>
        <div className="chat-list">
          {chatRooms.length > 0 ? (
            chatRooms.map((room) => {
              const isActive = room.id === activeRoomId;
              const hasUnread = room.unreadCount && room.unreadCount > 0;
              return (
                <div 
                  key={room.id}
                  className={`chat-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveRoomId(room.id)}
                >
                  <div className="avatar-circle" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                    {room.memberName?.charAt(0) || 'M'}
                  </div>
                  <div style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {room.memberName}
                      </span>
                      {hasUnread && (
                        <span style={{ 
                          backgroundColor: 'var(--danger)', 
                          color: 'white', 
                          fontSize: '10px', 
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '10px',
                          lineHeight: 1
                        }}>
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                    <span style={{ 
                      fontSize: '12px', 
                      color: hasUnread ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: hasUnread ? 600 : 400,
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis' 
                    }}>
                      {room.lastMessage || '대화 내역이 없습니다.'}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              개설된 활성 대화방이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* Main chat window */}
      <div className="chat-main">
        {activeRoom ? (
          <>
            {/* Header */}
            <div className="chat-main-header">
              <div className="avatar-circle" style={{ width: '32px', height: '32px' }}>
                {activeRoom.memberName?.charAt(0)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>{activeRoom.memberName} 님</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{activeRoom.memberEmail}</span>
              </div>
            </div>

            {/* Message Area */}
            <div className="message-list">
              {messages.length > 0 ? (
                messages.map((msg) => {
                  const isMe = msg.senderId === 'admin';
                  return (
                    <div key={msg.id} className={`message-wrapper ${isMe ? 'me' : 'other'}`}>
                      <div className="message-bubble">
                        {msg.text}
                      </div>
                      {msg.createdAt && (
                        <span className="message-time">
                          {new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                  <MessageSquare size={36} style={{ opacity: 0.5 }} />
                  <span style={{ fontSize: '13px' }}>회원과 대화를 시작해 보세요!</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="chat-input-area">
              <input 
                type="text" 
                placeholder="메시지를 입력하세요..." 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={sending}
                style={{ flexGrow: 1, padding: '10px 14px' }}
              />
              <button type="submit" className="btn-primary" disabled={sending || !inputText.trim()} style={{ padding: '10px 16px' }}>
                <Send size={16} /> 전송
              </button>
            </form>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <MessageSquare size={56} style={{ color: 'var(--text-muted)' }} />
            <div>
              <p style={{ fontWeight: 600 }}>대화방이 선택되지 않았습니다.</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                좌측 목록에서 대화할 회원의 방을 선택해 주세요.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
