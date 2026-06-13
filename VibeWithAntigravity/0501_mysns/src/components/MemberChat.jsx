import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { 
  db, 
  collection, 
  addDoc, 
  doc, 
  getDoc,
  setDoc,
  updateDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from '../firebase';
import { onSnapshot } from 'firebase/firestore';

export default function MemberChat({ user, memberData, showToast }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isRoomCreated, setIsRoomCreated] = useState(false);

  const messagesEndRef = useRef(null);
  const roomId = user?.uid; // 회원의 UID를 대화방 ID로 활용

  // 1. 대화방 존재 확인 및 생성 (첫 진입 시)
  useEffect(() => {
    if (!user || !memberData) return;

    const checkAndCreateRoom = async () => {
      try {
        const roomDocRef = doc(db, 'chats', roomId);
        const roomSnap = await getDoc(roomDocRef);

        if (!roomSnap.exists()) {
          // 채팅방 자동 생성
          await setDoc(roomDocRef, {
            memberName: memberData.name,
            memberEmail: memberData.email,
            lastMessage: '대화방이 개설되었습니다.',
            lastMessageTime: serverTimestamp(),
            unreadCount: 0 // 관리자가 읽지 않은 메시지 수
          });
        }
        setIsRoomCreated(true);
      } catch (error) {
        console.error("Room check/creation failed:", error);
        showToast('❌ 대화방을 초기화하지 못했습니다.', 'error');
      }
    };

    checkAndCreateRoom();
  }, [user, memberData, roomId]);

  // 2. 실시간 메시지 구독
  useEffect(() => {
    if (!isRoomCreated || !roomId) return;

    const messagesQuery = query(
      collection(db, 'chats', roomId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);

      // 스크롤 최하단
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      console.error("Messages sync error:", error);
    });

    return () => unsubscribe();
  }, [isRoomCreated, roomId]);

  // 3. 메시지 발송 핸들러
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !roomId || sending) return;

    setSending(true);
    const textToSend = inputText.trim();
    setInputText('');

    try {
      // 1) messages 하위 컬렉션 추가
      await addDoc(collection(db, 'chats', roomId, 'messages'), {
        senderId: user.uid,
        senderName: memberData.name,
        text: textToSend,
        createdAt: serverTimestamp()
      });

      // 2) 상위 대화방 정보 업데이트 및 관리자용 안읽은 카운트 증가 (Transaction 또는 기존 카운트 획득 후 업데이트)
      const roomDocRef = doc(db, 'chats', roomId);
      const roomSnap = await getDoc(roomDocRef);
      const currentUnread = roomSnap.exists() ? (roomSnap.data().unreadCount || 0) : 0;

      await updateDoc(roomDocRef, {
        lastMessage: textToSend,
        lastMessageTime: serverTimestamp(),
        unreadCount: currentUnread + 1 // 관리자 알림 뱃지용
      });
    } catch (error) {
      console.error("Message send error:", error);
      showToast('❌ 메시지 전송에 실패했습니다.', 'error');
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-container animate-pop" style={{ height: 'calc(100vh - 160px)' }}>
      <div className="chat-main" style={{ width: '100%' }}>
        {/* Header */}
        <div className="chat-main-header">
          <div className="avatar-circle" style={{ width: '32px', height: '32px' }}>
            A
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>관리자 센터 1:1 상담</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>실시간으로 문의하실 수 있습니다.</span>
          </div>
        </div>

        {/* Message Area */}
        <div className="message-list">
          {messages.length > 0 ? (
            messages.map((msg) => {
              const isMe = msg.senderId === user.uid;
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
              <span style={{ fontSize: '13px' }}>관리자에게 첫 질문을 보내 대화를 시작하세요!</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
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
      </div>
    </div>
  );
}
