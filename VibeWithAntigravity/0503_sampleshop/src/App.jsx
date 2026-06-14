import React, { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  db, 
  isFirebaseInitialized, 
  googleProvider,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from './firebase';
import { onSnapshot } from 'firebase/firestore';

// Recharts
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

// Lucide Icons
import { 
  ShoppingBag, 
  User, 
  LogOut, 
  ShoppingCart, 
  Plus, 
  Edit3, 
  Trash2, 
  LayoutDashboard, 
  Package, 
  ClipboardList, 
  BarChart3, 
  Search, 
  X, 
  Settings, 
  Zap, 
  Filter 
} from 'lucide-react';

import './App.css';

// -------------------------------------------------------------
// [Custom HTML Editor Component]
// -------------------------------------------------------------
function HtmlEditor({ value, onChange, placeholder }) {
  const textareaRef = useRef(null);

  const insertTag = (before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = before + selected + after;

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const insertImage = () => {
    const url = prompt("이미지 주소(URL)를 입력하세요:");
    if (url) {
      insertTag(`<img src="${url}" alt="상품 이미지" style="max-width:100%; border-radius:8px; margin: 10px 0;" />`);
    }
  };

  const insertVideo = () => {
    const url = prompt("유튜브 공유 소스 URL (예: https://www.youtube.com/embed/...)을 입력하세요:");
    if (url) {
      insertTag(`<div class="video-container" style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; margin: 10px 0; border-radius:8px;"><iframe src="${url}" style="position:absolute; top:0; left:0; width:100%; height:100%;" frameborder="0" allowfullscreen></iframe></div>`);
    }
  };

  return (
    <div className="custom-html-editor">
      <div className="editor-toolbar">
        <button type="button" onClick={() => insertTag('<b>', '</b>')} title="굵게"><b>B</b></button>
        <button type="button" onClick={() => insertTag('<i>', '</i>')} title="기울임"><i>I</i></button>
        <button type="button" onClick={() => insertTag('<u>', '</u>')} title="밑줄"><u>U</u></button>
        <button type="button" onClick={() => insertTag('<h2>', '</h2>')} title="제목">H2</button>
        <button type="button" onClick={() => insertTag('<p>', '</p>')} title="단락">P</button>
        <button type="button" onClick={insertImage} title="이미지 추가">🖼️ 이미지</button>
        <button type="button" onClick={insertVideo} title="동영상 추가">🎥 동영상</button>
      </div>
      <textarea
        ref={textareaRef}
        className="editor-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={8}
      />
      <div className="editor-preview-label">실시간 HTML 프리뷰</div>
      <div 
        className="editor-preview-box" 
        dangerouslySetInnerHTML={{ __html: value || '<p style="color:var(--text-muted)">상세 내용이 여기에 표시됩니다.</p>' }} 
      />
    </div>
  );
}

export default function App() {
  // 전역 상태
  const [user, setUser] = useState(null);
  const [userMeta, setUserMeta] = useState(null);
  const [role, setRole] = useState(null); // 'member' | 'admin'
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'

  // 리스트 상태
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  // 라우팅 및 탭 관리
  const [adminMode, setAdminMode] = useState(false); 
  const [adminTab, setAdminTab] = useState('dashboard'); // 'dashboard' | 'products' | 'orders' | 'stats'
  const [currentPage, setCurrentPage] = useState('main'); // 'main' | 'detail' | 'cart'
  const [selectedProductId, setSelectedProductId] = useState(null); 

  // 장바구니 로컬 상태
  const [cart, setCart] = useState([]);

  // 회원가입 및 로그인 폼 상태
  const [signUpName, setSignUpName] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpAddress, setSignUpAddress] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 어드민 상품 편집 상태
  const [selectedAdminProductId, setSelectedAdminProductId] = useState(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [prodFormTitle, setProdFormTitle] = useState('신규 상품 등록');
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodImgUrl, setProdImgUrl] = useState('');
  const [prodStartDate, setProdStartDate] = useState('');
  const [prodEndDate, setProdEndDate] = useState('');
  const [prodDescription, setProdDescription] = useState('');

  // 어드민 주문 검색/필터 및 상세 다이얼로그
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilterPay, setOrderFilterPay] = useState('all'); 
  const [orderFilterShip, setOrderFilterShip] = useState('all'); 
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  // 어드민 통계 기간설정
  const [statsPeriod, setStatsPeriod] = useState('7'); 

  // 토스트 메시지
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. 가상 세션 모드 로컬 데이터 동기화 헬퍼
  const updateLocalProducts = (newProducts) => {
    setProducts(newProducts);
    localStorage.setItem("mock_products", JSON.stringify(newProducts));
  };

  const updateLocalOrders = (newOrders) => {
    setOrders(newOrders);
    localStorage.setItem("mock_orders", JSON.stringify(newOrders));
  };

  // 장바구니 로컬 로드
  useEffect(() => {
    const saved = localStorage.getItem("shop_cart");
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (e) {
        setCart([]);
      }
    }
  }, []);

  const saveCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem("shop_cart", JSON.stringify(newCart));
  };

  // 가상 모드 또는 Firebase 데이터 로드
  useEffect(() => {
    // 가상 어드민 세션 로그인 체크
    const isVirtualAdmin = localStorage.getItem("admin_logged_in") === "true";
    if (isVirtualAdmin) {
      setUser({ email: 'admin@shop.com', uid: 'admin_virtual_uid' });
      setUserMeta({ name: '최고관리자', email: 'admin@shop.com', role: 'admin' });
      setRole('admin');
      setAdminMode(true);
    } else {
      // 로컬스토리지에 로그인된 가상 사용자 정보 확인
      const savedVirtualUser = localStorage.getItem("virtual_logged_in_user");
      if (savedVirtualUser) {
        try {
          const parsed = JSON.parse(savedVirtualUser);
          setUser({ email: parsed.email, uid: parsed.uid });
          setUserMeta(parsed);
          setRole(parsed.role || 'member');
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (!isFirebaseInitialized) {
      // Firebase 비활성화인 경우 로컬스토리지 데이터를 상태로 로드
      const localProducts = localStorage.getItem("mock_products");
      const localOrders = localStorage.getItem("mock_orders");
      if (localProducts) {
        setProducts(JSON.parse(localProducts));
      }
      if (localOrders) {
        setOrders(JSON.parse(localOrders));
      }
      return;
    }

    // Firebase Auth 관찰
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        await loadUserMeta(u.uid);
      } else if (!isVirtualAdmin) {
        setUser(null);
        setUserMeta(null);
        setRole(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Firebase 실시간 데이터 바인딩 (상품 목록)
  useEffect(() => {
    if (!isFirebaseInitialized) return;

    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setProducts(list);
    });

    return () => unsubscribe();
  }, []);

  // Firebase 실시간 데이터 바인딩 (어드민용 주문 목록)
  useEffect(() => {
    if (!isFirebaseInitialized || role !== 'admin') return;

    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setOrders(list);
    });

    return () => unsubscribe();
  }, [role]);

  const loadUserMeta = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data();
        setUserMeta(data);
        setRole(data.role || 'member');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 1초 테스트 환경 자동 완성 헬퍼 (데이터 적재 & 강제 관리자 로그인)
  const handleSetupTestData = async () => {
    showToast('⚙️ 테스트 데이터와 가상 관리자 세션을 생성하고 있습니다...', 'info');

    try {
      // 1. 관리자 가상 플래그 저장
      localStorage.setItem("admin_logged_in", "true");
      setUser({ email: 'admin@shop.com', uid: 'admin_virtual_uid' });
      setUserMeta({ name: '최고관리자', email: 'admin@shop.com', role: 'admin' });
      setRole('admin');
      setAdminMode(true);

      const mockProducts = [
        {
          id: "prod_1",
          name: "쿨 에어 린넨 셔츠",
          price: 35000,
          stock: 40,
          imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=80",
          startDate: "2026-06-14",
          endDate: "2026-08-31",
          description: "<h2>여름철 필수 린넨 셔츠!</h2><p>천연 마 소재를 사용하여 땀 흡수가 잘 되며 시원합니다.</p>",
          status: "active",
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_2",
          name: "데일리 오버핏 슬랙스",
          price: 42000,
          stock: 25,
          imageUrl: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=80",
          startDate: "2026-06-14",
          endDate: "2026-12-31",
          description: "<h2>사계절 내내 편안한 슬랙스</h2><p>신축성이 우수하며 다리가 길어보이는 와이드 오버핏 슬랙스입니다.</p>",
          status: "active",
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_3",
          name: "캠퍼스 레트로 스니커즈 (품절 임박)",
          price: 79000,
          stock: 0, 
          imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&auto=format&fit=crop&q=80",
          startDate: "2026-06-14",
          endDate: "2026-10-30",
          description: "<h2>레트로 무드의 클래식 스니커즈</h2><p>쿠션감이 좋아 오랜 시간 걸어도 피로하지 않습니다. 품절 주의!</p>",
          status: "active",
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_4",
          name: "베이직 코튼 볼캡",
          price: 18000,
          stock: 100,
          imageUrl: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&auto=format&fit=crop&q=80",
          startDate: "2026-06-14",
          endDate: "2026-12-31",
          description: "<h2>심플한 핏감의 베이직 볼캡</h2><p>어느 캐주얼 코디에나 자연스럽게 녹아드는 워싱 코튼 모자입니다.</p>",
          status: "active",
          createdAt: new Date().toISOString()
        }
      ];

      const mockOrders = [
        {
          id: "order_1",
          buyerUid: "student_001",
          buyerName: "김철수",
          buyerPhone: "010-1111-2222",
          buyerAddress: "서울시 마포구 창전동 45-12",
          items: [
            { productName: "쿨 에어 린넨 셔츠", price: 35000, quantity: 1 }
          ],
          totalPrice: 35000,
          paymentStatus: "paid",
          deliveryStatus: "shipped",
          createdAt: new Date().toISOString()
        },
        {
          id: "order_2",
          buyerUid: "student_002",
          buyerName: "이영희",
          buyerPhone: "010-3333-4444",
          buyerAddress: "부산시 수영구 광안동 99-8",
          items: [
            { productName: "데일리 오버핏 슬랙스", price: 42000, quantity: 2 },
            { productName: "베이직 코튼 볼캡", price: 18000, quantity: 1 }
          ],
          totalPrice: 102000,
          paymentStatus: "unpaid",
          deliveryStatus: "pending",
          createdAt: new Date().toISOString()
        }
      ];

      if (isFirebaseInitialized) {
        for (const p of mockProducts) {
          const { id, ...data } = p;
          await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp() });
        }
        for (const o of mockOrders) {
          const { id, ...data } = o;
          await addDoc(collection(db, 'orders'), { ...data, createdAt: serverTimestamp() });
        }
      } else {
        // 가상 모드인 경우 로컬 스토리지 데이터 동기화
        updateLocalProducts(mockProducts);
        updateLocalOrders(mockOrders);
      }

      showToast('🎉 초기 데이터 및 가상 어드민 진입이 완료되었습니다!', 'success');
    } catch (e) {
      console.error(e);
      showToast('❌ 테스트 세션 구성 실패: ' + e, 'error');
    }
  };

  // 일반 로그인
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (loginEmail === 'admin@shop.com' && loginPassword === '12345678') {
      localStorage.setItem("admin_logged_in", "true");
      setUser({ email: 'admin@shop.com', uid: 'admin_virtual_uid' });
      setUserMeta({ name: '최고관리자', email: 'admin@shop.com', role: 'admin' });
      setRole('admin');
      setAdminMode(true);
      setIsAuthOpen(false);
      showToast('💼 가상 어드민 세션으로 로그인했습니다.', 'success');
      return;
    }

    if (!isFirebaseInitialized) {
      const savedUsers = localStorage.getItem("mock_users") ? JSON.parse(localStorage.getItem("mock_users")) : [];
      const matched = savedUsers.find(u => u.email === loginEmail);
      if (matched && loginPassword.length >= 6) {
        const loggedInUser = { email: matched.email, uid: matched.uid, ...matched };
        setUser({ email: matched.email, uid: matched.uid });
        setUserMeta(loggedInUser);
        setRole(matched.role || 'member');
        localStorage.setItem("virtual_logged_in_user", JSON.stringify(loggedInUser));
        setIsAuthOpen(false);
        showToast('🔑 [가상] 로그인되었습니다.', 'success');
        return;
      }
      showToast('가상 계정을 찾을 수 없거나 비밀번호가 올바르지 않습니다. (먼저 회원가입을 하거나 admin@shop.com / 12345678을 이용하세요.)', 'error');
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      await loadUserMeta(cred.user.uid);
      setIsAuthOpen(false);
      showToast('🔑 정상 로그인되었습니다.', 'success');
    } catch (err) {
      showToast('❌ 로그인 실패: ' + err.message, 'error');
    }
  };

  // 일반 회원가입
  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    const newUserMeta = {
      name: signUpName,
      phone: signUpPhone,
      address: signUpAddress,
      role: 'member',
      email: loginEmail
    };

    try {
      if (isFirebaseInitialized) {
        const cred = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          ...newUserMeta,
          createdAt: serverTimestamp()
        });
        setUser(cred.user);
      } else {
        const virtualUid = "user_" + Date.now();
        const loggedInUser = { uid: virtualUid, ...newUserMeta };
        setUser({ email: loginEmail, uid: virtualUid });
        
        const savedUsers = localStorage.getItem("mock_users") ? JSON.parse(localStorage.getItem("mock_users")) : [];
        savedUsers.push(loggedInUser);
        localStorage.setItem("mock_users", JSON.stringify(savedUsers));
        localStorage.setItem("virtual_logged_in_user", JSON.stringify(loggedInUser));
      }

      setUserMeta(newUserMeta);
      setRole('member');
      setIsAuthOpen(false);
      showToast('🎉 회원가입 완료 및 자동 로그인되었습니다!', 'success');
    } catch (err) {
      showToast('❌ 가입 실패: ' + err.message, 'error');
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    localStorage.removeItem("admin_logged_in");
    localStorage.removeItem("virtual_logged_in_user");
    if (isFirebaseInitialized) {
      await signOut(auth);
    }
    setUser(null);
    setUserMeta(null);
    setRole(null);
    setAdminMode(false);
    setCurrentPage('main');
    showToast('👋 안전하게 로그아웃되었습니다.', 'info');
  };

  // 장바구니 담기
  const handleAddToCart = (product, quantity) => {
    if (product.stock === 0) {
      showToast('❌ 해당 상품은 현재 품절입니다.', 'error');
      return;
    }

    const existIdx = cart.findIndex((item) => item.id === product.id);
    let newCart = [...cart];

    if (existIdx > -1) {
      const newQty = newCart[existIdx].quantity + quantity;
      if (newQty > product.stock) {
        showToast(`❌ 현재 재고(${product.stock}개) 이상 담을 수 없습니다.`, 'error');
        return;
      }
      newCart[existIdx].quantity = newQty;
    } else {
      newCart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        quantity,
        stock: product.stock
      });
    }

    saveCart(newCart);
    showToast('🛒 장바구니에 담았습니다.', 'success');
  };

  // 장바구니 수량 조정
  const handleCartQtyChange = (itemId, change) => {
    const newCart = cart.map((item) => {
      if (item.id === itemId) {
        const nextQty = item.quantity + change;
        if (nextQty < 1) return item;
        if (nextQty > item.stock) {
          showToast(`❌ 재고량(${item.stock}개)을 초과할 수 없습니다.`, 'error');
          return item;
        }
        return { ...item, quantity: nextQty };
      }
      return item;
    });
    saveCart(newCart);
  };

  // 장바구니 품목 삭제
  const handleCartRemoveItem = (itemId) => {
    const newCart = cart.filter((item) => item.id !== itemId);
    saveCart(newCart);
    showToast('🗑️ 장바구니에서 삭제했습니다.', 'info');
  };

  // 장바구니 주문 처리
  const handleCartOrderSubmit = async () => {
    if (cart.length === 0) return;

    if (!user) {
      setAuthMode('login');
      setIsAuthOpen(true);
      showToast('주문을 위해 먼저 로그인해 주세요.', 'info');
      return;
    }

    try {
      const orderData = {
        buyerUid: user.uid,
        buyerName: userMeta?.name || "일반회원",
        buyerPhone: userMeta?.phone || "010-0000-0000",
        buyerAddress: userMeta?.address || "배송 주소 미지정",
        items: cart.map((c) => ({
          productId: c.id,
          productName: c.name,
          price: c.price,
          quantity: c.quantity
        })),
        totalPrice: cart.reduce((acc, cur) => acc + cur.price * cur.quantity, 0),
        paymentStatus: "unpaid",
        deliveryStatus: "pending",
        createdAt: new Date().toISOString()
      };

      if (isFirebaseInitialized) {
        await addDoc(collection(db, 'orders'), { ...orderData, createdAt: serverTimestamp() });
        for (const c of cart) {
          const prodRef = doc(db, 'products', c.id);
          const currentStock = c.stock - c.quantity;
          await updateDoc(prodRef, {
            stock: currentStock >= 0 ? currentStock : 0
          });
        }
      } else {
        // 가상 모드
        const newOrder = {
          id: "order_" + Date.now(),
          ...orderData
        };
        updateLocalOrders([newOrder, ...orders]);
        
        // 상품 재고 차감
        const updatedProducts = products.map(p => {
          const cartItem = cart.find(c => c.id === p.id);
          if (cartItem) {
            const nextStock = p.stock - cartItem.quantity;
            return { ...p, stock: nextStock >= 0 ? nextStock : 0 };
          }
          return p;
        });
        updateLocalProducts(updatedProducts);
      }

      saveCart([]);
      showToast('🎉 주문이 성공적으로 완료되었습니다! (결제 대기)', 'success');
      setCurrentPage('main');
    } catch (e) {
      console.error(e);
      showToast('❌ 주문 전송 실패: ' + e, 'error');
    }
  };

  // 어드민 상품 추가/수정 팝업 열기
  const openProductForm = (prod = null) => {
    if (prod) {
      setSelectedAdminProductId(prod.id);
      setProdFormTitle('상품 정보 수정');
      setProdName(prod.name || '');
      setProdPrice(prod.price || '');
      setProdStock(prod.stock || '');
      setProdImgUrl(prod.imageUrl || '');
      setProdStartDate(prod.startDate || '');
      setProdEndDate(prod.endDate || '');
      setProdDescription(prod.description || '');
    } else {
      setSelectedAdminProductId(null);
      setProdFormTitle('신규 상품 등록');
      setProdName('');
      setProdPrice('');
      setProdStock('');
      setProdImgUrl('');
      setProdStartDate('');
      setProdEndDate('');
      setProdDescription('');
    }
    setIsProductFormOpen(true);
  };

  // 어드민 상품 저장/수정 처리
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const payload = {
      name: prodName,
      price: Number(prodPrice),
      stock: Number(prodStock),
      imageUrl: prodImgUrl,
      startDate: prodStartDate,
      endDate: prodEndDate,
      description: prodDescription,
      status: "active"
    };

    try {
      if (isFirebaseInitialized) {
        if (selectedAdminProductId) {
          await updateDoc(doc(db, 'products', selectedAdminProductId), payload);
          showToast('💾 상품 정보가 정상 수정되었습니다.', 'success');
        } else {
          await addDoc(collection(db, 'products'), {
            ...payload,
            createdAt: serverTimestamp()
          });
          showToast('🎉 새로운 상품이 정상 등록되었습니다.', 'success');
        }
      } else {
        // 가상 모드
        if (selectedAdminProductId) {
          const updated = products.map(p => p.id === selectedAdminProductId ? { ...p, ...payload } : p);
          updateLocalProducts(updated);
          showToast('💾 상품 정보가 정상 수정되었습니다. (가상 세션)', 'success');
        } else {
          const newProd = {
            id: "prod_" + Date.now(),
            ...payload,
            createdAt: new Date().toISOString()
          };
          updateLocalProducts([newProd, ...products]);
          showToast('🎉 새로운 상품이 정상 등록되었습니다. (가상 세션)', 'success');
        }
      }
      setIsProductFormOpen(false);
      setSelectedAdminProductId(null);
    } catch (err) {
      console.error(err);
      showToast('❌ 상품 저장 실패: ' + err.message, 'error');
    }
  };

  // 어드민 상품 삭제
  const handleDeleteProduct = async (prodId) => {
    if (!confirm('정말로 이 상품을 삭제하시겠습니까?')) return;

    try {
      if (isFirebaseInitialized) {
        await deleteDoc(doc(db, 'products', prodId));
        showToast('🗑️ 상품이 삭제되었습니다.', 'info');
      } else {
        const filtered = products.filter(p => p.id !== prodId);
        updateLocalProducts(filtered);
        showToast('🗑️ 상품이 삭제되었습니다. (가상 세션)', 'info');
      }
      setSelectedAdminProductId(null);
    } catch (err) {
      showToast('❌ 상품 삭제 실패: ' + err.message, 'error');
    }
  };

  // 어드민 상품 판매 활성/비활성 토글
  const handleToggleProductStatus = async (prodId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      if (isFirebaseInitialized) {
        await updateDoc(doc(db, 'products', prodId), { status: nextStatus });
      } else {
        const updated = products.map(p => p.id === prodId ? { ...p, status: nextStatus } : p);
        updateLocalProducts(updated);
      }
      showToast(`상품 판매 상태가 [${nextStatus === 'active' ? '판매중' : '판매중지'}]로 변경되었습니다.`, 'success');
    } catch (err) {
      showToast('상태 토글 실패: ' + err.message, 'error');
    }
  };

  // 어드민 주문 입금 및 배송 상태 토글 변경
  const handleToggleOrderStatus = async (orderId, type, currentVal) => {
    const isPayment = type === 'payment';
    let nextVal = '';
    
    if (isPayment) {
      nextVal = currentVal === 'paid' ? 'unpaid' : 'paid';
    } else {
      nextVal = currentVal === 'shipped' ? 'pending' : 'shipped';
    }

    try {
      if (isFirebaseInitialized) {
        if (isPayment) {
          await updateDoc(doc(db, 'orders', orderId), { paymentStatus: nextVal });
        } else {
          await updateDoc(doc(db, 'orders', orderId), { deliveryStatus: nextVal });
        }
      } else {
        const updated = orders.map(o => {
          if (o.id === orderId) {
            return isPayment ? { ...o, paymentStatus: nextVal } : { ...o, deliveryStatus: nextVal };
          }
          return o;
        });
        updateLocalOrders(updated);
      }
      showToast('주문 상태가 실시간 업데이트되었습니다.', 'success');
    } catch (err) {
      showToast('상태 업데이트 실패: ' + err.message, 'error');
    }
  };

  // 어드민 통계 계산 가공 (Recharts 바인딩용)
  const getStatsData = () => {
    const daysLimit = Number(statsPeriod);
    const dateMap = {};
    
    for (let i = daysLimit - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().substring(0, 10);
      dateMap[k] = { date: k.substring(5, 10), 매출액: 0, 주문건수: 0 };
    }

    orders.forEach((o) => {
      if (!o.createdAt) return;
      const date = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      const k = date.toISOString().substring(0, 10);
      if (dateMap[k]) {
        dateMap[k].매출액 += o.totalPrice || 0;
        dateMap[k].주문건수 += 1;
      }
    });

    return Object.values(dateMap);
  };

  return (
    <div className="app-container">
      {/* -------------------------------------------------------------
       * 1단계: 사용자 쇼핑몰 모드
       * ------------------------------------------------------------- */}
      {!adminMode ? (
        <>
          {/* Header */}
          <header className="shop-header">
            <div className="header-logo" onClick={() => setCurrentPage('main')}>
              <ShoppingBag size={22} style={{ color: 'var(--accent)' }} />
              <span>SampleShop</span>
            </div>

            <div className="header-actions">
              <button 
                className="cart-icon-btn" 
                onClick={() => setCurrentPage('cart')}
                title="장바구니"
              >
                <ShoppingCart size={20} />
                {cart.length > 0 && <span className="cart-badge">{cart.reduce((a,c) => a + c.quantity, 0)}</span>}
              </button>

              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{userMeta?.name || '회원'}님</span>
                  <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={handleLogout}>
                    <LogOut size={14} style={{ display: 'inline', marginRight: '4px' }} /> 로그아웃
                  </button>
                </div>
              ) : (
                <button 
                  className="btn-primary" 
                  style={{ padding: '8px 14px', fontSize: '13px' }} 
                  onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }}
                >
                  <User size={14} /> 로그인
                </button>
              )}

              {/* 관리자 진입 단축 버튼 */}
              <button 
                className="btn-secondary" 
                style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid var(--accent)', color: 'var(--accent)' }}
                onClick={() => setAdminMode(true)}
              >
                <Settings size={14} /> 관리자 사이트
              </button>
            </div>
          </header>

          {/* 메인 뷰 분기 */}
          {currentPage === 'main' && (
            <main className="animate-fade">
              {/* 메인 히어로 배너 */}
              <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', color: 'white', padding: '60px 24px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'Outfit' }}>Summer Special Open! 🏝️</h1>
                <p style={{ color: '#94A3B8', marginTop: '8px', fontSize: '14px' }}>인기 트렌드 상품을 가볍게 주문해 보세요.</p>
              </div>

              {/* 상품 목록 */}
              <div className="products-grid">
                {products.filter(p => p.status === 'active').map((p) => {
                  const isSoldOut = p.stock === 0;
                  return (
                    <div 
                      key={p.id} 
                      className="card-shop product-card animate-fade"
                      onClick={() => { setSelectedProductId(p.id); setCurrentPage('detail'); }}
                    >
                      <div className="product-img-wrapper">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', backgroundColor: '#E2E8F0' }} />
                        )}
                        {isSoldOut && <div className="soldout-overlay">품절 (SOLDOUT)</div>}
                      </div>
                      <div className="product-info">
                        <h3 className="product-name">{p.name}</h3>
                        <p className="product-price">{p.price.toLocaleString()}원</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </main>
          )}

          {currentPage === 'detail' && (
            <ProductDetailView 
              productId={selectedProductId}
              products={products}
              onBack={() => setCurrentPage('main')}
              onAddToCart={handleAddToCart}
            />
          )}

          {currentPage === 'cart' && (
            <CartView 
              cart={cart}
              onQtyChange={handleCartQtyChange}
              onRemove={handleCartRemoveItem}
              onClear={() => saveCart([])}
              onOrder={handleCartOrderSubmit}
              onBack={() => setCurrentPage('main')}
            />
          )}
        </>
      ) : (
        /* -------------------------------------------------------------
         * 2단계: 관리자 어드민 모드
         * ------------------------------------------------------------- */
        <div className="admin-container">
          {/* Sidebar */}
          <aside className="admin-sidebar">
            <div className="sidebar-brand"> 어드민 센터 </div>
            <ul className="sidebar-menu">
              <li 
                className={`sidebar-item ${adminTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setAdminTab('dashboard')}
              >
                <LayoutDashboard size={18} /> 대시보드
              </li>
              <li 
                className={`sidebar-item ${adminTab === 'products' ? 'active' : ''}`}
                onClick={() => setAdminTab('products')}
              >
                <Package size={18} /> 상품 관리
              </li>
              <li 
                className={`sidebar-item ${adminTab === 'orders' ? 'active' : ''}`}
                onClick={() => setAdminTab('orders')}
              >
                <ClipboardList size={18} /> 주문 관리
              </li>
              <li 
                className={`sidebar-item ${adminTab === 'stats' ? 'active' : ''}`}
                onClick={() => setAdminTab('stats')}
              >
                <BarChart3 size={18} /> 통계 분석
              </li>
              <li className="sidebar-item" onClick={handleLogout} style={{ color: 'var(--danger)', marginTop: '40px' }}>
                <LogOut size={18} /> 로그아웃
              </li>
            </ul>

            {/* 사용자 모드 전환 단축 버튼 */}
            <div style={{ marginTop: 'auto', padding: '16px' }}>
              <button 
                className="btn-accent" 
                style={{ width: '100%', fontSize: '12px' }}
                onClick={() => setAdminMode(false)}
              >
                쇼핑몰 사이트 이동
              </button>
            </div>
          </aside>

          {/* Admin Content Panels */}
          <main className="admin-content">
            {adminTab === 'dashboard' && (
              <AdminDashboardPanel 
                products={products} 
                orders={orders}
                onTabChange={(tab) => setAdminTab(tab)}
              />
            )}
            
            {adminTab === 'products' && (
              <AdminProductsPanel 
                products={products}
                onAddClick={() => openProductForm()}
                onEditClick={(p) => openProductForm(p)}
                onDeleteClick={handleDeleteProduct}
                onToggleStatus={handleToggleProductStatus}
              />
            )}

            {adminTab === 'orders' && (
              <AdminOrdersPanel 
                orders={orders}
                onToggleStatus={handleToggleOrderStatus}
                onRowDoubleClick={(ord) => setSelectedOrderDetail(ord)}
              />
            )}

            {adminTab === 'stats' && (
              <AdminStatsPanel 
                statsData={getStatsData()}
                orders={orders}
                statsPeriod={statsPeriod}
                onPeriodChange={setStatsPeriod}
              />
            )}
          </main>
        </div>
      )}

      {/* -------------------------------------------------------------
       * 공통 모달 및 토스트 컴포넌트
       * ------------------------------------------------------------- */}
      {/* 1. 로그인 / 회원가입 팝업 모달 */}
      {isAuthOpen && (
        <div className="modal-overlay">
          <div className="modal-content card-shop animate-fade">
            <button className="modal-close" onClick={() => setIsAuthOpen(false)}>
              <X size={18} />
            </button>
            
            {authMode === 'login' ? (
              <form onSubmit={handleLoginSubmit}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>회원 로그인</h3>
                <input 
                  type="email" 
                  className="input-shop" 
                  placeholder="이메일 주소" 
                  value={loginEmail} 
                  onChange={(e) => setLoginEmail(e.target.value)} 
                  required 
                  style={{ marginBottom: '10px' }}
                />
                <input 
                  type="password" 
                  className="input-shop" 
                  placeholder="비밀번호" 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)} 
                  required 
                  style={{ marginBottom: '16px' }}
                />
                <button type="submit" className="btn-accent" style={{ width: '100%' }}>로그인</button>
                <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px' }}>
                  아직 회원이 아니신가요?{' '}
                  <span 
                    style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }}
                    onClick={() => setAuthMode('signup')}
                  >
                    회원가입
                  </span>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignUpSubmit}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>신규 회원가입</h3>
                <input 
                  type="email" 
                  className="input-shop" 
                  placeholder="이메일 주소" 
                  value={loginEmail} 
                  onChange={(e) => setLoginEmail(e.target.value)} 
                  required 
                  style={{ marginBottom: '10px' }}
                />
                <input 
                  type="password" 
                  className="input-shop" 
                  placeholder="비밀번호 (6자 이상)" 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)} 
                  required 
                  style={{ marginBottom: '10px' }}
                />
                <input 
                  type="text" 
                  className="input-shop" 
                  placeholder="가입자 성함" 
                  value={signUpName} 
                  onChange={(e) => setSignUpName(e.target.value)} 
                  required 
                  style={{ marginBottom: '10px' }}
                />
                <input 
                  type="text" 
                  className="input-shop" 
                  placeholder="연락처 (예: 010-1234-5678)" 
                  value={signUpPhone} 
                  onChange={(e) => setSignUpPhone(e.target.value)} 
                  required 
                  style={{ marginBottom: '10px' }}
                />
                <textarea 
                  className="input-shop" 
                  placeholder="택배 받을 기본 주소" 
                  value={signUpAddress} 
                  onChange={(e) => setSignUpAddress(e.target.value)} 
                  required 
                  style={{ marginBottom: '16px', minHeight: '60px' }}
                />
                <button type="submit" className="btn-accent" style={{ width: '100%' }}>회원 등록 완료</button>
                <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px' }}>
                  이미 가입한 아이디가 있다면?{' '}
                  <span 
                    style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }}
                    onClick={() => setAuthMode('login')}
                  >
                    로그인으로 이동
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 2. 어드민 상품 추가/수정 폼 팝업 */}
      {isProductFormOpen && (
        <div className="modal-overlay">
          <div className="modal-content card-shop animate-fade" style={{ maxWidth: '600px' }}>
            <button className="modal-close" onClick={() => setIsProductFormOpen(false)}>
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>{prodFormTitle}</h3>
            
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input 
                  type="text" 
                  className="input-shop" 
                  placeholder="상품명" 
                  value={prodName} 
                  onChange={(e) => setProdName(e.target.value)} 
                  required
                />
                <input 
                  type="number" 
                  className="input-shop" 
                  placeholder="판매 가격 (원)" 
                  value={prodPrice} 
                  onChange={(e) => setProdPrice(e.target.value)} 
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input 
                  type="number" 
                  className="input-shop" 
                  placeholder="재고 수량" 
                  value={prodStock} 
                  onChange={(e) => setProdStock(e.target.value)} 
                  required
                />
                <input 
                  type="text" 
                  className="input-shop" 
                  placeholder="상품 대표 이미지 URL" 
                  value={prodImgUrl} 
                  onChange={(e) => setProdImgUrl(e.target.value)} 
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input 
                  type="date" 
                  className="input-shop" 
                  placeholder="판매 시작일" 
                  value={prodStartDate} 
                  onChange={(e) => setProdStartDate(e.target.value)} 
                  required
                />
                <input 
                  type="date" 
                  className="input-shop" 
                  placeholder="판매 종료일" 
                  value={prodEndDate} 
                  onChange={(e) => setProdEndDate(e.target.value)} 
                  required
                />
              </div>

              {/* Custom HTML Editor */}
              <HtmlEditor 
                value={prodDescription}
                onChange={setProdDescription}
                placeholder="상품 상세 내용 및 HTML 코드를 입력하세요 (이미지/비디오 링크 가능)"
              />

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button type="submit" className="btn-accent" style={{ flexGrow: 1 }}>상품 저장</button>
                <button type="button" className="btn-secondary" onClick={() => setIsProductFormOpen(false)}>취소</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. 어드민 주문 상세 더블클릭 팝업 */}
      {selectedOrderDetail && (
        <div className="modal-overlay">
          <div className="modal-content card-shop animate-fade">
            <button className="modal-close" onClick={() => setSelectedOrderDetail(null)}>
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>주문 상세 내역</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div>
                <strong>👤 구매자 정보</strong>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>이름: {selectedOrderDetail.buyerName}</p>
                <p style={{ color: 'var(--text-muted)' }}>연락처: {selectedOrderDetail.buyerPhone}</p>
                <p style={{ color: 'var(--text-muted)' }}>배송 주소: {selectedOrderDetail.buyerAddress}</p>
              </div>
              
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                <strong>📦 주문 품목 리스트</strong>
                <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: '6px' }}>
                  {selectedOrderDetail.items?.map((item, idx) => (
                    <li key={idx} style={{ padding: '6px 0', borderBottom: '1px dashed var(--border-light)' }}>
                      {item.productName} ({item.quantity}개) - {(item.price * item.quantity).toLocaleString()}원
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', marginTop: '8px' }}>
                <span>총 주문 금액:</span>
                <span style={{ color: 'var(--accent)' }}>{selectedOrderDetail.totalPrice?.toLocaleString()}원</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. 테스트 환경 자동 완성 버튼 (로그인 아웃라인 상태일 때 하단 플로팅) */}
      {!user && !adminMode && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
          <button className="btn-secondary" onClick={handleSetupTestData} style={{ boxShadow: 'var(--shadow-md)', border: '1px solid var(--accent)', background: '#fff' }}>
            <Zap size={14} style={{ color: 'var(--accent)', fill: 'var(--accent)' }} /> 테스트 계정 & 쇼핑몰 데이터 1초 완성
          </button>
        </div>
      )}

      {/* 5. 글로벌 토스트 컴포넌트 */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000, background: '#1E293B', color: 'white', padding: '12px 18px', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 0.2s ease-out' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// [Component] ProductDetailView
// -------------------------------------------------------------
function ProductDetailView({ productId, products, onBack, onAddToCart }) {
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        if (isFirebaseInitialized) {
          const snap = await getDoc(doc(db, 'products', productId));
          if (snap.exists()) {
            setProduct(snap.data());
          }
        } else {
          const matched = products.find(p => p.id === productId);
          if (matched) {
            setProduct(matched);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, products]);

  if (loading) return <div style={{ padding: '80px', textAlign: 'center' }}>상품 로딩 중...</div>;
  if (!product) return <div style={{ padding: '80px', textAlign: 'center' }}>상품을 찾을 수 없습니다.</div>;

  const isSoldOut = product.stock === 0;

  return (
    <div className="detail-container animate-fade">
      <div className="detail-img-box">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} />
        ) : (
          <div style={{ width: '100%', height: '100%', backgroundColor: '#E2E8F0' }} />
        )}
      </div>
      
      <div className="detail-info-box">
        <button onClick={onBack} style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', marginBottom: '16px', background: 'none', border: 'none', cursor: 'pointer' }}>← 목록으로 이동</button>
        <h2 style={{ fontSize: '24px', fontWeight: 800 }}>{product.name}</h2>
        <p className="detail-price">{product.price.toLocaleString()}원</p>
        
        {!isSoldOut && (
          <div className="qty-selector">
            <span>수량 선택:</span>
            <button className="qty-btn" onClick={() => setQuantity(q => q > 1 ? q - 1 : 1)}>-</button>
            <span className="qty-val">{quantity}</span>
            <button className="qty-btn" onClick={() => setQuantity(q => q < product.stock ? q + 1 : q)}>+</button>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>남은 수량: {product.stock}개</span>
          </div>
        )}

        {isSoldOut ? (
          <button className="btn-secondary" style={{ color: 'var(--danger)', border: '1px solid var(--danger)', cursor: 'not-allowed' }} disabled>품절된 상품입니다</button>
        ) : (
          <button className="btn-accent" onClick={() => onAddToCart({ id: productId, ...product }, quantity)}>장바구니 담기</button>
        )}

        {/* HTML 렌더러 */}
        <div 
          className="detail-html-content"
          dangerouslySetInnerHTML={{ __html: product.description }}
        />
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// [Component] CartView
// -------------------------------------------------------------
function CartView({ cart, onQtyChange, onRemove, onClear, onOrder, onBack }) {
  const totalPrice = cart.reduce((acc, cur) => acc + cur.price * cur.quantity, 0);

  return (
    <div className="cart-container animate-fade">
      <button onClick={onBack} style={{ color: 'var(--text-muted)', marginBottom: '16px', background: 'none', border: 'none', cursor: 'pointer' }}>← 쇼핑 계속하기</button>
      <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>🛒 장바구니 목록</h2>

      {cart.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>장바구니가 텅 비어 있습니다.</div>
      ) : (
        <>
          {cart.map((item) => (
            <div key={item.id} className="card-shop cart-item-card animate-fade">
              <img src={item.imageUrl} alt={item.name} className="cart-item-img" />
              <div style={{ flexGrow: 1 }}>
                <h4 style={{ fontWeight: 'bold', fontSize: '15px' }}>{item.name}</h4>
                <p style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '14px', marginTop: '4px' }}>
                  {item.price.toLocaleString()}원
                </p>
              </div>

              {/* Qty Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="qty-btn" style={{ width: '28px', height: '28px' }} onClick={() => onQtyChange(item.id, -1)}>-</button>
                <span style={{ fontWeight: 'bold' }}>{item.quantity}</span>
                <button className="qty-btn" style={{ width: '28px', height: '28px' }} onClick={() => onQtyChange(item.id, 1)}>+</button>
              </div>

              <button 
                onClick={() => onRemove(item.id)} 
                style={{ color: 'var(--danger)', marginLeft: '12px', background: 'none', border: 'none', cursor: 'pointer' }}
                title="삭제"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          {/* 합계 결제 */}
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>총 결제 금액:</span>
            <span style={{ fontSize: '22px', fontWeight: 900, color: 'var(--accent)' }}>{totalPrice.toLocaleString()}원</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button className="btn-accent" style={{ flexGrow: 1 }} onClick={onOrder}>주문하기</button>
            <button className="btn-secondary" onClick={onClear}>비우기</button>
          </div>
        </>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// [Component] AdminDashboardPanel
// -------------------------------------------------------------
function AdminDashboardPanel({ products, orders, onTabChange }) {
  const activeProducts = products.filter(p => p.status === 'active').length;
  const inactiveProducts = products.filter(p => p.status === 'inactive').length;
  const totalOrders = orders.length;
  const shippedOrders = orders.filter(o => o.deliveryStatus === 'shipped').length;

  return (
    <div className="animate-fade">
      <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '24px' }}>📊 통합 대시보드</h2>
      
      <div className="stats-grid">
        <div className="card-shop stat-card" onClick={() => onTabChange('products')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-circle" style={{ backgroundColor: 'rgba(30, 41, 59, 0.1)' }}>
            <Package color="var(--primary)" />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>판매중 상품</p>
            <h3>{activeProducts}개</h3>
          </div>
        </div>

        <div className="card-shop stat-card" onClick={() => onTabChange('products')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-circle" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <Package color="var(--danger)" />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>판매 중지 상품</p>
            <h3>{inactiveProducts}개</h3>
          </div>
        </div>

        <div className="card-shop stat-card" onClick={() => onTabChange('orders')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-circle" style={{ backgroundColor: 'rgba(255, 107, 74, 0.1)' }}>
            <ClipboardList color="var(--accent)" />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>접수된 주문</p>
            <h3>{totalOrders}건</h3>
          </div>
        </div>

        <div className="card-shop stat-card" onClick={() => onTabChange('orders')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-circle" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <ClipboardList color="var(--success)" />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>발송 완료 주문</p>
            <h3>{shippedOrders}건</h3>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// [Component] AdminProductsPanel
// -------------------------------------------------------------
function AdminProductsPanel({ products, onAddClick, onEditClick, onDeleteClick, onToggleStatus }) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const selectedProd = products.find(p => p.id === selectedId);

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 900 }}>📦 상품 리스트 관리</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-accent" onClick={onAddClick}><Plus size={14} /> 상품 등록</button>
          <button 
            className="btn-primary" 
            disabled={!selectedId} 
            onClick={() => onEditClick(selectedProd)}
          >
            <Edit3 size={14} /> 수정
          </button>
          <button 
            className="btn-secondary" 
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
            disabled={!selectedId}
            onClick={() => onDeleteClick(selectedId)}
          >
            <Trash2 size={14} /> 삭제
          </button>
        </div>
      </div>

      {/* 검색 바 */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <input 
          type="text" 
          className="input-shop" 
          placeholder="상품 이름 검색..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: '36px' }}
        />
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
      </div>

      {/* 테이블 */}
      <div className="table-wrapper">
        <table className="table-shop">
          <thead>
            <tr>
              <th>선택</th>
              <th>대표 이미지</th>
              <th>상품 이름</th>
              <th>판매 기간</th>
              <th>판매 가격</th>
              <th>재고</th>
              <th>판매 상태 (토글)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr 
                key={p.id} 
                className={selectedId === p.id ? 'selected' : ''}
                onClick={() => setSelectedId(p.id)}
              >
                <td>
                  <input 
                    type="radio" 
                    name="admin_product_radio" 
                    checked={selectedId === p.id} 
                    onChange={() => setSelectedId(p.id)}
                  />
                </td>
                <td>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', backgroundColor: '#E2E8F0', borderRadius: '4px' }} />
                  )}
                </td>
                <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                <td>{p.startDate} ~ {p.endDate}</td>
                <td>{p.price?.toLocaleString()}원</td>
                <td>{p.stock}개</td>
                <td>
                  <label className="switch" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={p.status === 'active'} 
                      onChange={() => onToggleStatus(p.id, p.status)}
                    />
                    <span className="slider"></span>
                  </label>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>등록된 상품이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// [Component] AdminOrdersPanel
// -------------------------------------------------------------
function AdminOrdersPanel({ orders, onToggleStatus, onRowDoubleClick }) {
  const [search, setSearch] = useState('');
  const [payFilter, setPayFilter] = useState('all');
  const [shipFilter, setShipFilter] = useState('all');

  const filtered = orders.filter((o) => {
    const matchSearch = o.buyerName.toLowerCase().includes(search.toLowerCase()) || 
                        o.items?.some(i => i.productName.toLowerCase().includes(search.toLowerCase()));
    const matchPay = payFilter === 'all' || o.paymentStatus === payFilter;
    const matchShip = shipFilter === 'all' || o.deliveryStatus === shipFilter;
    return matchSearch && matchPay && matchShip;
  });

  return (
    <div className="animate-fade">
      <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '20px' }}>📋 주문 내역 관리</h2>

      {/* 검색 및 필터 패널 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        <div style={{ position: 'relative' }}>
          <input 
            type="text" 
            className="input-shop" 
            placeholder="구매자 이름 또는 상품명 검색..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
        </div>

        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Filter size={14} />
            <span>입금 상태:</span>
            <button 
              className={`btn-secondary ${payFilter === 'all' ? 'btn-primary' : ''}`} 
              style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={() => setPayFilter('all')}
            >
              전체
            </button>
            <button 
              className={`btn-secondary ${payFilter === 'unpaid' ? 'btn-primary' : ''}`} 
              style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={() => setPayFilter('unpaid')}
            >
              미입금
            </button>
            <button 
              className={`btn-secondary ${payFilter === 'paid' ? 'btn-primary' : ''}`} 
              style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={() => setPayFilter('paid')}
            >
              입금완료
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span>발송 상태:</span>
            <button 
              className={`btn-secondary ${shipFilter === 'all' ? 'btn-primary' : ''}`} 
              style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={() => setShipFilter('all')}
            >
              전체
            </button>
            <button 
              className={`btn-secondary ${shipFilter === 'pending' ? 'btn-primary' : ''}`} 
              style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={() => setShipFilter('pending')}
            >
              발송전
            </button>
            <button 
              className={`btn-secondary ${shipFilter === 'shipped' ? 'btn-primary' : ''}`} 
              style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={() => setShipFilter('shipped')}
            >
              발송완료
            </button>
          </div>
        </div>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>* 주문 행을 <strong>더블 클릭</strong>하시면 상세 배송 주소 등 상세 내역 다이얼로그가 열립니다.</p>

      {/* 테이블 */}
      <div className="table-wrapper">
        <table className="table-shop">
          <thead>
            <tr>
              <th>주문 리스트 & 개수</th>
              <th>총 금액</th>
              <th>구매자명</th>
              <th>입금 처리 (토글)</th>
              <th>발송 처리 (토글)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr 
                key={o.id}
                onDoubleClick={() => onRowDoubleClick(o)}
              >
                <td style={{ fontWeight: 'bold' }}>
                  {o.items?.map((item, idx) => (
                    <div key={idx}>{item.productName} ({item.quantity}개)</div>
                  ))}
                </td>
                <td>{o.totalPrice?.toLocaleString()}원</td>
                <td>{o.buyerName}</td>
                <td>
                  <button 
                    className={`btn-secondary`}
                    style={{ 
                      padding: '4px 10px', 
                      fontSize: '12px', 
                      backgroundColor: o.paymentStatus === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: o.paymentStatus === 'paid' ? 'var(--success)' : 'var(--danger)',
                      borderColor: o.paymentStatus === 'paid' ? 'var(--success)' : 'var(--danger)',
                      cursor: 'pointer'
                    }}
                    onClick={() => onToggleStatus(o.id, 'payment', o.paymentStatus)}
                  >
                    {o.paymentStatus === 'paid' ? '입금완료' : '미입금'}
                  </button>
                </td>
                <td>
                  <button 
                    className={`btn-secondary`}
                    style={{ 
                      padding: '4px 10px', 
                      fontSize: '12px', 
                      backgroundColor: o.deliveryStatus === 'shipped' ? 'rgba(30, 41, 59, 0.1)' : 'rgba(255, 107, 74, 0.1)',
                      color: o.deliveryStatus === 'shipped' ? 'var(--primary)' : 'var(--accent)',
                      borderColor: o.deliveryStatus === 'shipped' ? 'var(--primary)' : 'var(--accent)',
                      cursor: 'pointer'
                    }}
                    onClick={() => onToggleStatus(o.id, 'delivery', o.deliveryStatus)}
                  >
                    {o.deliveryStatus === 'shipped' ? '발송완료' : '발송전'}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>주문 내역이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// [Component] AdminStatsPanel
// -------------------------------------------------------------
function AdminStatsPanel({ statsData, orders, statsPeriod, onPeriodChange }) {
  const totalSales = statsData.reduce((acc, cur) => acc + cur.매출액, 0);
  const totalOrders = statsData.reduce((acc, cur) => acc + cur.주문건수, 0);

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 900 }}>📈 통계 분석 보고서</h2>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span>분석 기간:</span>
          <select 
            className="input-shop" 
            style={{ width: '120px', padding: '6px' }}
            value={statsPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
          >
            <option value="7">최근 7일</option>
            <option value="30">최근 30일</option>
          </select>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="card-shop stat-card">
          <div className="stat-icon-circle" style={{ backgroundColor: 'rgba(255, 107, 74, 0.1)' }}>
            <BarChart3 color="var(--accent)" />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>기간 내 총 매출액</p>
            <h3>{totalSales.toLocaleString()}원</h3>
          </div>
        </div>

        <div className="card-shop stat-card">
          <div className="stat-icon-circle" style={{ backgroundColor: 'rgba(30, 41, 59, 0.1)' }}>
            <ClipboardList color="var(--primary)" />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>기간 내 주문 건수</p>
            <h3>{totalOrders}건</h3>
          </div>
        </div>
      </div>

      {/* 차트 영역 */}
      <CardWrap title="일별 매출 추이 그래프">
        <div style={{ width: '100%', height: 300, marginTop: '16px', position: 'relative' }}>
          {statsData && statsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={statsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="매출액" 
                  stroke="var(--accent)" 
                  strokeWidth={3} 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="주문건수" 
                  stroke="var(--primary)" 
                  strokeWidth={2} 
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              데이터가 충분하지 않아 차트를 그릴 수 없습니다.
            </div>
          )}
        </div>
      </CardWrap>
    </div>
  );
}

function CardWrap({ title, children }) {
  return (
    <div className="card-shop" style={{ padding: '20px' }}>
      <h4 style={{ fontWeight: 'bold', fontSize: '15px' }}>{title}</h4>
      {children}
    </div>
  );
}
