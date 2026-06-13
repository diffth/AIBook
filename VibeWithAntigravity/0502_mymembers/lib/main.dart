import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';

// Firebase 웹/모바일 겸용 수동 옵션 설정 (mymembers-664eb2)
const firebaseOptions = FirebaseOptions(
  apiKey: "AIzaSyA_YOUR_API_KEY_MASKED_HERE",
  authDomain: "mymembers-664eb2.firebaseapp.com",
  projectId: "mymembers-664eb2",
  storageBucket: "mymembers-664eb2.firebasestorage.app",
  messagingSenderId: "809003928378",
  appId: "1:809003928378:web:08d0ec5ad0729cb6221e03",
);

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp(options: firebaseOptions);
  } catch (e) {
    debugPrint("Firebase 초기화 오류: $e");
  }
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppStateProvider()),
      ],
      child: const MyMembersApp(),
    ),
  );
}

class MyMembersApp extends StatelessWidget {
  const MyMembersApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MyMembers',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1877F2), // 클래식 블루
          primary: const Color(0xFF1877F2),
          secondary: const Color(0xFF42B72A), // 세컨더리 그린
          background: const Color(0xFFF0F2F5), // 페이스북 배경색 느낌의 연그레이
        ),

        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.grey[100],
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF1877F2),
            foregroundColor: Colors.white,
            minimumSize: const Size(double.infinity, 50),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
        ),
      ),
      home: const SplashView(),
    );
  }
}

// -------------------------------------------------------------
// [State Management] AppStateProvider
// -------------------------------------------------------------
class AppStateProvider extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  User? _user;
  Map<String, dynamic>? _userMeta;
  bool _isLoading = false;

  User? get user => _user;
  Map<String, dynamic>? get userMeta => _userMeta;
  bool get isLoading => _isLoading;

  // Real-time streams 및 lists
  List<Map<String, dynamic>> students = [];
  List<Map<String, dynamic>> attendanceToday = [];
  List<Map<String, dynamic>> chatRooms = [];
  List<Map<String, dynamic>> currentMessages = [];
  
  StreamSubscription? _studentsSub;
  StreamSubscription? _attendanceTodaySub;
  StreamSubscription? _chatRoomsSub;
  StreamSubscription? _messagesSub;

  AppStateProvider() {
    _auth.authStateChanges().listen((User? u) async {
      _user = u;
      if (u != null) {
        await loadUserMeta(u.uid);
      } else {
        _userMeta = null;
        _cancelAllSubscriptions();
      }
      notifyListeners();
    });
  }

  void setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  // 사용자 메타데이터 로딩
  Future<void> loadUserMeta(String uid) async {
    try {
      // 1. 관리자 가상 세션 우회
      if (uid == 'admin_virtual_uid') {
        _userMeta = {
          'uid': 'admin_virtual_uid',
          'email': 'admin@members.com',
          'name': '최고관리자',
          'role': 'admin',
          'status': 'active'
        };
        _initAdminStreams();
        notifyListeners();
        return;
      }

      DocumentSnapshot doc = await _db.collection('users').doc(uid).get();
      if (doc.exists) {
        _userMeta = doc.data() as Map<String, dynamic>;
        if (_userMeta?['role'] == 'admin') {
          _initAdminStreams();
        }
      } else {
        // 비정상 진입 방어
        _userMeta = null;
      }
    } catch (e) {
      debugPrint("loadUserMeta 에러: $e");
    }
    notifyListeners();
  }

  // 1:1 상담방 가상 로그인 어드민 및 학생용 수동 로그인 세팅
  void setVirtualAdminSession() {
    _user = null; // Firebase Auth 상태와는 독립적으로 관리
    _userMeta = {
      'uid': 'admin_virtual_uid',
      'email': 'admin@members.com',
      'name': '최고관리자',
      'role': 'admin',
      'status': 'active'
    };
    _initAdminStreams();
    notifyListeners();
  }

  // 관리자 실시간 스트림 바인딩
  void _initAdminStreams() {
    _cancelAllSubscriptions();

    // 1. 전체 학생 스트림
    _studentsSub = _db.collection('users')
        .where('role', isEqualTo: 'student')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .listen((snap) {
      students = snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
      notifyListeners();
    });

    // 2. 전체 당일 출석 현황 스트림
    final todayStr = DateTime.now().toIso8601String().substring(0, 10);
    _attendanceTodaySub = _db.collection('attendance')
        .where('date', isEqualTo: todayStr)
        .snapshots()
        .listen((snap) {
      attendanceToday = snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
      notifyListeners();
    });

    // 3. 채팅방 리스트 스트림
    _chatRoomsSub = _db.collection('chat_rooms')
        .orderBy('lastMessageTime', descending: true)
        .snapshots()
        .listen((snap) {
      chatRooms = snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
      notifyListeners();
    });
  }

  // 실시간 1:1 채팅방 메시지 구독
  void subscribeMessages(String roomId) {
    _messagesSub?.cancel();
    _messagesSub = _db.collection('chat_rooms')
        .doc(roomId)
        .collection('messages')
        .orderBy('createdAt', descending: false)
        .snapshots()
        .listen((snap) {
      currentMessages = snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
      notifyListeners();
    });
  }

  void unsubscribeMessages() {
    _messagesSub?.cancel();
    currentMessages = [];
  }

  void _cancelAllSubscriptions() {
    _studentsSub?.cancel();
    _attendanceTodaySub?.cancel();
    _chatRoomsSub?.cancel();
    _messagesSub?.cancel();
    students = [];
    attendanceToday = [];
    chatRooms = [];
    currentMessages = [];
  }

  // 로그아웃
  Future<void> logout() async {
    _cancelAllSubscriptions();
    await _auth.signOut();
    _user = null;
    _userMeta = null;
    notifyListeners();
  }
}

// -------------------------------------------------------------
// [View] 1. SplashView
// -------------------------------------------------------------
class SplashView extends StatefulWidget {
  const SplashView({super.key});

  @override
  State<SplashView> createState() => _SplashViewState();
}

class _SplashViewState extends State<SplashView> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _scaleAnimation = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    // 2초간 노출 후 화면 분기
    Timer(const Duration(seconds: 2), () {
      final state = Provider.of<AppStateProvider>(context, listen: false);
      if (state.userMeta != null) {
        _navigateByRole(state.userMeta!['role']);
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginView()),
        );
      }
    });
  }

  void _navigateByRole(String role) {
    if (role == 'admin') {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const AdminMainLayout()),
      );
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const StudentHomeView()),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: ScaleTransition(
          scale: _scaleAnimation,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.supervised_user_circle_rounded,
                  size: 56,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'MyMembers',
                style: TextStyle(
                  fontFamily: 'Outfit',
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '회원 및 출결 관리 매니지먼트',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// -------------------------------------------------------------
// [View] 2. LoginView
// -------------------------------------------------------------
class LoginView extends StatefulWidget {
  const LoginView({super.key});

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscureText = true;

  // 테스트 자동 환경 완성 헬퍼
  Future<void> _setupTestData() async {
    final state = Provider.of<AppStateProvider>(context, listen: false);
    state.setLoading(true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('⚙️ 테스트 환경용 데이터를 생성하고 가상 로그인합니다...')),
    );

    try {
      final db = FirebaseFirestore.instance;
      
      // 1. 관리자 가상 세션 수립
      state.setVirtualAdminSession();

      // 2. 가상 학생 데이터 3명 Firestore 생성
      final mockStudents = [
        {'uid': 'student_001', 'name': '김철수', 'email': 'chulsoo@members.com', 'phone': '010-1111-2222', 'role': 'student', 'status': 'active'},
        {'uid': 'student_002', 'name': '이영희', 'email': 'younghee@members.com', 'phone': '010-3333-4444', 'role': 'student', 'status': 'active'},
        {'uid': 'student_003', 'name': '박민수', 'email': 'minsoo@members.com', 'phone': '010-5555-6666', 'role': 'student', 'status': 'active'},
      ];

      for (var s in mockStudents) {
        await db.collection('users').doc(s['uid']).set({
          ...s,
          'createdAt': FieldValue.serverTimestamp(),
        });
      }

      // 3. 샘플 출결 기록
      final todayStr = DateTime.now().toIso8601String().substring(0, 10);
      await db.collection('attendance').doc('att_chulsoo').set({
        'uid': 'student_001',
        'name': '김철수',
        'date': todayStr,
        'checkInTime': Timestamp.now(),
        'status': 'present',
        'memo': '정상 등교'
      });

      // 4. 샘플 채팅방 및 메시지 개설
      await db.collection('chat_rooms').doc('student_001').set({
        'id': 'student_001',
        'studentUid': 'student_001',
        'studentName': '김철수',
        'lastMessage': '안녕하세요, 출결 인정에 대해 문의 드립니다!',
        'lastMessageTime': Timestamp.now(),
        'unreadCountByAdmin': 1,
        'unreadCountByStudent': 0,
      });

      await db.collection('chat_rooms').doc('student_001').collection('messages').add({
        'senderUid': 'student_001',
        'senderName': '김철수',
        'text': '안녕하세요, 출결 인정에 대해 문의 드립니다!',
        'createdAt': FieldValue.serverTimestamp(),
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('🎉 가상 관리자 세션 로그인 완료! 메인 화면으로 이동합니다.')),
      );

      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const AdminMainLayout()),
      );

    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('❌ 생성 에러: $e')),
      );
    } finally {
      state.setLoading(false);
    }
  }

  // Firebase 일반 로그인 시도
  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;
    
    final state = Provider.of<AppStateProvider>(context, listen: false);
    state.setLoading(true);

    try {
      // 1. Firebase Auth 로그인
      UserCredential cred = await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: _emailController.text.trim(),
        password: _passwordController.text.trim(),
      );

      // 2. 가입 유저 정보 확인 및 분기
      await state.loadUserMeta(cred.user!.uid);
      if (state.userMeta != null) {
        if (state.userMeta!['status'] == 'inactive') {
          // 정지 회원 방어
          await state.logout();
          throw '🚫 정지 또는 비활성화 처리된 계정입니다. 관리자에게 문의하세요.';
        }

        final role = state.userMeta!['role'];
        if (role == 'admin') {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const AdminMainLayout()),
          );
        } else {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const StudentHomeView()),
          );
        }
      } else {
        await state.logout();
        throw '회원 정보를 데이터베이스에서 찾을 수 없습니다.';
      }

    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('❌ 로그인 오류: $e')),
      );
    } finally {
      state.setLoading(false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppStateProvider>(context);
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(Icons.supervised_user_circle_rounded, size: 72, color: theme.colorScheme.primary),
              const SizedBox(height: 16),
              const Text(
                'MyMembers',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 32),
              
              Form(
                key: _formKey,
                child: Column(
                  children: [
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.email_outlined),
                        hintText: '이메일 주소',
                      ),
                      validator: (val) => val == null || !val.contains('@') ? '올바른 이메일을 입력하세요.' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscureText,
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.lock_outline_rounded),
                        hintText: '비밀번호',
                        suffixIcon: IconButton(
                          icon: Icon(_obscureText ? Icons.visibility_off : Icons.visibility),
                          onPressed: () => setState(() => _obscureText = !_obscureText),
                        ),
                      ),
                      validator: (val) => val == null || val.length < 6 ? '6자리 이상의 비밀번호를 입력하세요.' : null,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              state.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : ElevatedButton(
                      onPressed: _handleLogin,
                      child: const Text('로그인'),
                    ),
              
              const SizedBox(height: 60),
              
              // 1초 테스트 환경 자동 가입 버튼
              OutlinedButton.icon(
                onPressed: _setupTestData,
                icon: const Icon(Icons.flash_on_rounded),
                label: const Text('테스트 계정 & 데이터 1초 완성'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: theme.colorScheme.primary,
                  side: BorderSide(color: theme.colorScheme.primary, width: 1.5),
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// -------------------------------------------------------------
// [View] 3. Student View: StudentHomeView (학생 홈)
// -------------------------------------------------------------
class StudentHomeView extends StatefulWidget {
  const StudentHomeView({super.key});

  @override
  State<StudentHomeView> createState() => _StudentHomeViewState();
}

class _StudentHomeViewState extends State<StudentHomeView> {
  int _currentIndex = 0;

  final List<Widget> _children = [
    const StudentHomeTab(),
    const StudentHistoryTab(),
    const StudentChatTab(),
    const StudentProfileTab(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(child: _children[_currentIndex]),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Theme.of(context).colorScheme.primary,
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: '홈'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_month_outlined), activeIcon: Icon(Icons.calendar_month), label: '출결'),
          BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), activeIcon: Icon(Icons.chat_bubble), label: '채팅'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: '내 정보'),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// [Tab] StudentHomeTab (출석 체크 홈)
// -------------------------------------------------------------
class StudentHomeTab extends StatefulWidget {
  const StudentHomeTab({super.key});

  @override
  State<StudentHomeTab> createState() => _StudentHomeTabState();
}

class _StudentHomeTabState extends State<StudentHomeTab> {
  bool _checkedToday = false;
  String _todayStatus = '미출석';
  String _todayTime = '--:--';
  double _monthlyRate = 0.0;
  bool _isActionLoading = false;

  @override
  void initState() {
    super.initState();
    _checkTodayAttendance();
    _calculateMonthlyRate();
  }

  // 오늘의 출석 여부 로드
  Future<void> _checkTodayAttendance() async {
    final state = Provider.of<AppStateProvider>(context, listen: false);
    final uid = state.user?.uid ?? 'student_001';
    final todayStr = DateTime.now().toIso8601String().substring(0, 10);

    try {
      final snap = await FirebaseFirestore.instance
          .collection('attendance')
          .where('uid', isEqualTo: uid)
          .where('date', isEqualTo: todayStr)
          .get();

      if (snap.docs.isNotEmpty) {
        final data = snap.docs.first.data();
        final DateTime checkIn = (data['checkInTime'] as Timestamp).toDate();
        setState(() {
          _checkedToday = true;
          _todayStatus = data['status'] == 'present'
              ? '출석 완료'
              : data['status'] == 'late'
                  ? '지각'
                  : '결석';
          _todayTime = "${checkIn.hour.toString().padLeft(2, '0')}:${checkIn.minute.toString().padLeft(2, '0')}";
        });
      }
    } catch (e) {
      debugPrint(e.toString());
    }
  }

  // 한달 출석률 간이 집계
  Future<void> _calculateMonthlyRate() async {
    final state = Provider.of<AppStateProvider>(context, listen: false);
    final uid = state.user?.uid ?? 'student_001';

    try {
      final snap = await FirebaseFirestore.instance
          .collection('attendance')
          .where('uid', isEqualTo: uid)
          .get();

      if (snap.docs.isNotEmpty) {
        final total = snap.docs.length;
        final presentCount = snap.docs
            .where((doc) => doc.data()['status'] == 'present' || doc.data()['status'] == 'late')
            .length;

        setState(() {
          _monthlyRate = presentCount / total;
        });
      }
    } catch (e) {
      debugPrint(e.toString());
    }
  }

  // 출석체크 액션 처리
  Future<void> _doCheckIn() async {
    if (_checkedToday) return;

    setState(() => _isActionLoading = true);
    final state = Provider.of<AppStateProvider>(context, listen: false);
    final uid = state.user?.uid ?? 'student_001';
    final name = state.userMeta?['name'] ?? '김철수';
    final now = DateTime.now();
    final todayStr = now.toIso8601String().substring(0, 10);

    // 판정 조건: 09시 이전 출석, 9시~9시30분 지각, 이후 결석
    String status = 'present';
    String statusKo = '출석 완료';
    if (now.hour > 9 || (now.hour == 9 && now.minute > 30)) {
      status = 'absent';
      statusKo = '결석';
    } else if (now.hour == 9 && now.minute > 0) {
      status = 'late';
      statusKo = '지각';
    }

    try {
      await FirebaseFirestore.instance.collection('attendance').add({
        'uid': uid,
        'name': name,
        'date': todayStr,
        'checkInTime': Timestamp.now(),
        'status': status,
        'memo': '모바일 수동 출석체크'
      });

      setState(() {
        _checkedToday = true;
        _todayStatus = statusKo;
        _todayTime = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";
      });

      _calculateMonthlyRate();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('🎉 오늘의 출석체크($_todayStatus)가 등록되었습니다!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('❌ 출석체크 실패: $e')),
      );
    } finally {
      setState(() => _isActionLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppStateProvider>(context);
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 탑 헤더 프로필
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                  child: Text(
                    (state.userMeta?['name'] ?? '철')[0],
                    style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.primary),
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '안녕하세요,',
                      style: TextStyle(color: Colors.grey[600], fontSize: 13),
                    ),
                    Text(
                      '${state.userMeta?['name'] ?? '김철수'} 학생',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 28),

            // 오늘 출석 체크 카드
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('오늘의 등교 상태', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Chip(
                          label: Text(_todayStatus),
                          backgroundColor: _checkedToday
                              ? theme.colorScheme.secondary.withOpacity(0.1)
                              : Colors.orange.withOpacity(0.1),
                          labelStyle: TextStyle(
                            color: _checkedToday ? theme.colorScheme.secondary : Colors.orange,
                            fontWeight: FontWeight.bold,
                          ),
                          side: BorderSide.none,
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _todayTime,
                      style: TextStyle(
                        fontSize: 40,
                        fontWeight: FontWeight.w900,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                    const SizedBox(height: 20),
                    _isActionLoading
                        ? const CircularProgressIndicator()
                        : ElevatedButton(
                            onPressed: _checkedToday ? null : _doCheckIn,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _checkedToday ? Colors.grey[300] : theme.colorScheme.primary,
                              foregroundColor: _checkedToday ? Colors.grey[600] : Colors.white,
                            ),
                            child: Text(_checkedToday ? '출석체크 완료' : '출석체크 하기'),
                          ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // 요약 누적 출석률 현황 카드
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('이번 달 누적 출석률', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          const SizedBox(height: 4),
                          Text(
                            '지각을 포함한 현재 출석 집계율입니다.',
                            style: TextStyle(color: Colors.grey[500], fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          width: 65,
                          height: 65,
                          child: CircularProgressIndicator(
                            value: _monthlyRate,
                            strokeWidth: 6,
                            backgroundColor: Colors.grey[200],
                            valueColor: AlwaysStoppedAnimation<Color>(theme.colorScheme.primary),
                          ),
                        ),
                        Text(
                          '${(_monthlyRate * 100).toInt()}%',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// -------------------------------------------------------------
// [Tab] StudentHistoryTab (본인 출결 캘린더 조회)
// -------------------------------------------------------------
class StudentHistoryTab extends StatefulWidget {
  const StudentHistoryTab({super.key});

  @override
  State<StudentHistoryTab> createState() => _StudentHistoryTabState();
}

class _StudentHistoryTabState extends State<StudentHistoryTab> {
  List<Map<String, dynamic>> _records = [];

  @override
  void initState() {
    super.initState();
    _loadHistoryData();
  }

  Future<void> _loadHistoryData() async {
    final state = Provider.of<AppStateProvider>(context, listen: false);
    final uid = state.user?.uid ?? 'student_001';

    try {
      final snap = await FirebaseFirestore.instance
          .collection('attendance')
          .where('uid', isEqualTo: uid)
          .orderBy('date', descending: true)
          .get();

      setState(() {
        _records = snap.docs.map((doc) => doc.data()).toList();
      });
    } catch (e) {
      debugPrint(e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(title: const Text('출결 이력 조회', style: TextStyle(fontWeight: FontWeight.bold)), centerTitle: true),
      body: _records.isEmpty
          ? const Center(child: Text('출결 기록이 아직 없습니다.'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _records.length,
              itemBuilder: (context, idx) {
                final r = _records[idx];
                final String status = r['status'] ?? 'present';
                final String date = r['date'] ?? '';
                final Timestamp? checkIn = r['checkInTime'] as Timestamp?;
                final String timeStr = checkIn != null
                    ? "${checkIn.toDate().hour.toString().padLeft(2, '0')}:${checkIn.toDate().minute.toString().padLeft(2, '0')}"
                    : '--:--';

                Color statusColor = theme.colorScheme.primary;
                String statusKo = '출석';
                if (status == 'late') {
                  statusColor = Colors.orange;
                  statusKo = '지각';
                } else if (status == 'absent') {
                  statusColor = Colors.red;
                  statusKo = '결석';
                }

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: statusColor.withOpacity(0.1),
                      child: Icon(Icons.check_circle_outline_rounded, color: statusColor),
                    ),
                    title: Text(date, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text(r['memo'] ?? '등교 정보 없음'),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          statusKo,
                          style: TextStyle(fontWeight: FontWeight.bold, color: statusColor, fontSize: 15),
                        ),
                        Text(
                          timeStr,
                          style: const TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}

// -------------------------------------------------------------
// [Tab] StudentChatTab (학생 1:1 상담 채팅방)
// -------------------------------------------------------------
class StudentChatTab extends StatefulWidget {
  const StudentChatTab({super.key});

  @override
  State<StudentChatTab> createState() => _StudentChatTabState();
}

class _StudentChatTabState extends State<StudentChatTab> {
  final TextEditingController _msgController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  String _roomId = '';

  @override
  void initState() {
    super.initState();
    final state = Provider.of<AppStateProvider>(context, listen: false);
    // 학생의 roomId는 항상 본인의 UID로 고정 설정하여 1:1 방으로 구성
    _roomId = state.user?.uid ?? 'student_001';
    state.subscribeMessages(_roomId);
    _ensureChatRoomExists();
  }

  @override
  void dispose() {
    final state = Provider.of<AppStateProvider>(context, listen: false);
    state.unsubscribeMessages();
    super.dispose();
  }

  // 채팅방 자동 개설 처리
  Future<void> _ensureChatRoomExists() async {
    final state = Provider.of<AppStateProvider>(context, listen: false);
    final name = state.userMeta?['name'] ?? '김철수';
    
    final roomDoc = FirebaseFirestore.instance.collection('chat_rooms').doc(_roomId);
    final docSnap = await roomDoc.get();

    if (!docSnap.exists) {
      await roomDoc.set({
        'id': _roomId,
        'studentUid': _roomId,
        'studentName': name,
        'lastMessage': '채팅방이 개설되었습니다.',
        'lastMessageTime': FieldValue.serverTimestamp(),
        'unreadCountByAdmin': 0,
        'unreadCountByStudent': 0
      });
    }
  }

  // 메시지 전송
  Future<void> _sendMessage() async {
    final text = _msgController.text.trim();
    if (text.isEmpty) return;

    _msgController.clear();
    final state = Provider.of<AppStateProvider>(context, listen: false);
    final name = state.userMeta?['name'] ?? '김철수';

    final roomDoc = FirebaseFirestore.instance.collection('chat_rooms').doc(_roomId);

    // 1. 하위 메시지 추가
    await roomDoc.collection('messages').add({
      'senderUid': _roomId,
      'senderName': name,
      'text': text,
      'createdAt': FieldValue.serverTimestamp(),
    });

    // 2. 채팅방 요약 정보 업데이트 (어드민에 안읽음 알림 +1)
    await roomDoc.update({
      'lastMessage': text,
      'lastMessageTime': FieldValue.serverTimestamp(),
      'unreadCountByAdmin': FieldValue.increment(1)
    });

    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppStateProvider>(context);
    final theme = Theme.of(context);

    // 메시지가 수집되면 하단으로 자동 스크롤
    if (state.currentMessages.isNotEmpty) {
      _scrollToBottom();
    }

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        title: const Text('관리자 1:1 실시간 상담', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: state.currentMessages.length,
              itemBuilder: (context, idx) {
                final m = state.currentMessages[idx];
                final isMe = m['senderUid'] == _roomId;

                return Align(
                  alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isMe ? theme.colorScheme.primary : Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(12),
                        topRight: const Radius.circular(12),
                        bottomLeft: isMe ? const Radius.circular(12) : Radius.zero,
                        bottomRight: isMe ? Radius.zero : const Radius.circular(12),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.02),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.7),
                    child: Text(
                      m['text'] ?? '',
                      style: TextStyle(
                        color: isMe ? Colors.white : Colors.black87,
                        fontSize: 14,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _msgController,
                    decoration: const InputDecoration(
                      hintText: '메시지를 입력하세요...',
                      fillColor: Color(0xFFF0F2F5),
                      filled: true,
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _sendMessage,
                  icon: Icon(Icons.send_rounded, color: theme.colorScheme.primary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// [Tab] StudentProfileTab (프로필 / 비밀번호 변경)
// -------------------------------------------------------------
class StudentProfileTab extends StatelessWidget {
  const StudentProfileTab({super.key});

  void _showPasswordChangeDialog(BuildContext context) {
    final TextEditingController oldPwCtrl = TextEditingController();
    final TextEditingController newPwCtrl = TextEditingController();
    final _pwFormKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('비밀번호 변경', style: TextStyle(fontWeight: FontWeight.bold)),
          content: Form(
            key: _pwFormKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: oldPwCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(hintText: '현재 비밀번호'),
                  validator: (v) => v == null || v.isEmpty ? '비밀번호를 입력하세요.' : null,
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: newPwCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(hintText: '새 비밀번호 (6자 이상)'),
                  validator: (v) => v == null || v.length < 6 ? '6자 이상 입력하세요.' : null,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('취소'),
            ),
            TextButton(
              onPressed: () async {
                if (!_pwFormKey.currentState!.validate()) return;
                
                try {
                  User? user = FirebaseAuth.instance.currentUser;
                  if (user != null) {
                    // Firebase Auth 비밀번호 업데이트 (재인증이 필요할 수도 있음)
                    await user.updatePassword(newPwCtrl.text.trim());
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('🎉 비밀번호가 변경되었습니다.')),
                    );
                  }
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('❌ 실패: $e')),
                  );
                }
              },
              child: const Text('변경'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppStateProvider>(context);
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            const SizedBox(height: 20),
            CircleAvatar(
              radius: 40,
              backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
              child: Icon(Icons.person, size: 48, color: theme.colorScheme.primary),
            ),
            const SizedBox(height: 16),
            Text(
              state.userMeta?['name'] ?? '김철수',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            Text(
              state.userMeta?['email'] ?? 'student@members.com',
              style: TextStyle(color: Colors.grey[600], fontSize: 14),
            ),
            const SizedBox(height: 32),

            Card(
              child: ListView(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  ListTile(
                    leading: const Icon(Icons.phone_outlined),
                    title: const Text('전화번호'),
                    trailing: Text(state.userMeta?['phone'] ?? '010-0000-0000'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.security_outlined),
                    title: const Text('비밀번호 변경'),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                    onTap: () => _showPasswordChangeDialog(context),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            ElevatedButton.icon(
              onPressed: () async {
                await state.logout();
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const LoginView()),
                );
              },
              icon: const Icon(Icons.logout),
              label: const Text('로그아웃'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            ),
          ],
        ),
      ),
    );
  }
}

// -------------------------------------------------------------
// [View] 4. Admin View: AdminMainLayout (관리자 통합 메인)
// -------------------------------------------------------------
class AdminMainLayout extends StatefulWidget {
  const AdminMainLayout({super.key});

  @override
  State<AdminMainLayout> createState() => _AdminMainLayoutState();
}

class _AdminMainLayoutState extends State<AdminMainLayout> {
  int _currentIndex = 0;

  final List<Widget> _tabs = [
    const AdminDashboardTab(),
    const AdminMembersTab(),
    const AdminAttendanceTab(),
    const AdminChatListTab(),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'MyMembers 어드민',
          style: TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Outfit'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.redAccent),
            tooltip: '로그아웃',
            onPressed: () async {
              final state = Provider.of<AppStateProvider>(context, listen: false);
              await state.logout();
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => const LoginView()),
              );
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(color: Colors.grey[200], height: 1.0),
        ),
      ),
      body: _tabs[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (idx) => setState(() => _currentIndex = idx),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: theme.colorScheme.primary,
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: '대시보드'),
          BottomNavigationBarItem(icon: Icon(Icons.people_outline), activeIcon: Icon(Icons.people), label: '학생 명부'),
          BottomNavigationBarItem(icon: Icon(Icons.co_present_outlined), activeIcon: Icon(Icons.co_present), label: '출결 관리'),
          BottomNavigationBarItem(icon: Icon(Icons.chat_outlined), activeIcon: Icon(Icons.chat), label: '문의 채팅'),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// [Admin Tab] 1. AdminDashboardTab (대시보드 통계)
// -------------------------------------------------------------
class AdminDashboardTab extends StatelessWidget {
  const AdminDashboardTab({super.key});

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppStateProvider>(context);
    final theme = Theme.of(context);

    // 통계 계산
    final totalStudents = state.students.length;
    final presentToday = state.attendanceToday.where((a) => a['status'] == 'present').length;
    final lateToday = state.attendanceToday.where((a) => a['status'] == 'late').length;
    final absentToday = totalStudents - (presentToday + lateToday);
    final unreadChats = state.chatRooms.fold<int>(0, (prev, room) => prev + (room['unreadCountByAdmin'] as int? ?? 0));

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '학원/클래스 통계 현황',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 16),

            // 주요 지표 요약 2x2 그리드
            Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    context,
                    '전체 등록 인원',
                    '$totalStudents명',
                    Icons.people,
                    theme.colorScheme.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatCard(
                    context,
                    '읽지 않은 문의',
                    '$unreadChats건',
                    Icons.chat_bubble_outline,
                    unreadChats > 0 ? Colors.redAccent : Colors.grey,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    context,
                    '오늘 출석 인원',
                    '$presentToday명',
                    Icons.check_circle_outline,
                    theme.colorScheme.secondary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatCard(
                    context,
                    '오늘 지각 인원',
                    '$lateToday명',
                    Icons.warning_amber_rounded,
                    Colors.orange,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // 오늘 출석 분포 차트 카드
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('오늘 출결 시각화', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 20),
                    // 커스텀 심플 분포 차트 막대
                    Row(
                      children: [
                        _buildRatioBar(presentToday, totalStudents, theme.colorScheme.secondary),
                        _buildRatioBar(lateToday, totalStudents, Colors.orange),
                        _buildRatioBar(absentToday > 0 ? absentToday : 0, totalStudents, Colors.redAccent),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildLegendItem('출석 ($presentToday)', theme.colorScheme.secondary),
                        _buildLegendItem('지각 ($lateToday)', Colors.orange),
                        _buildLegendItem('결석 (${absentToday > 0 ? absentToday : 0})', Colors.redAccent),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(BuildContext context, String title, String val, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withOpacity(0.1),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                  Text(val, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRatioBar(int count, int total, Color color) {
    final double flexVal = total == 0 ? 1 : (count / total);
    if (flexVal == 0) return const SizedBox.shrink();
    return Expanded(
      flex: (flexVal * 100).toInt(),
      child: Container(
        height: 14,
        color: color,
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

// -------------------------------------------------------------
// [Admin Tab] 2. AdminMembersTab (학생 명부 리스트 / 가입 승인)
// -------------------------------------------------------------
class AdminMembersTab extends StatefulWidget {
  const AdminMembersTab({super.key});

  @override
  State<AdminMembersTab> createState() => _AdminMembersTabState();
}

class _AdminMembersTabState extends State<AdminMembersTab> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  // 신규 학생 등록 모달 팝업
  void _showAddStudentModal(BuildContext context) {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final _addFormKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('신규 학생 정보 등록', style: TextStyle(fontWeight: FontWeight.bold)),
          content: Form(
            key: _addFormKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(hintText: '이름'),
                    validator: (v) => v == null || v.isEmpty ? '이름을 입력하세요.' : null,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(hintText: '이메일'),
                    validator: (v) => v == null || !v.contains('@') ? '올바른 이메일을 입력하세요.' : null,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: phoneCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(hintText: '전화번호 (예: 010-1234-5678)'),
                    validator: (v) => v == null || v.isEmpty ? '전화번호를 입력하세요.' : null,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('취소'),
            ),
            TextButton(
              onPressed: () async {
                if (!_addFormKey.currentState!.validate()) return;

                final state = Provider.of<AppStateProvider>(context, listen: false);
                state.setLoading(true);
                Navigator.pop(context);

                try {
                  // Firestore에 직접 유저 문서 삽입 (Firebase Auth 계정은 최초 로그인 시 혹은 어드민이 패스워드 설정 시 세팅)
                  // 여기서는 가상 관리를 지원하기 위해 고유 UID를 생성하여 직접 삽입합니다.
                  final newUid = "std_${DateTime.now().millisecondsSinceEpoch}";
                  await FirebaseFirestore.instance.collection('users').doc(newUid).set({
                    'uid': newUid,
                    'name': nameCtrl.text.trim(),
                    'email': emailCtrl.text.trim(),
                    'phone': phoneCtrl.text.trim(),
                    'role': 'student',
                    'status': 'active',
                    'createdAt': FieldValue.serverTimestamp(),
                  });

                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('🎉 학생 등록이 정상 완료되었습니다.')),
                  );
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('❌ 등록 실패: $e')),
                  );
                } finally {
                  state.setLoading(false);
                }
              },
              child: const Text('등록'),
            ),
          ],
        );
      },
    );
  }

  // 학생 편집/정지/삭제 모달
  void _showEditStudentModal(BuildContext context, Map<String, dynamic> std) {
    final statusCtrl = ValueNotifier<String>(std['status'] ?? 'active');

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('${std['name']} 학생 정보 편집', style: const TextStyle(fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                title: const Text('이메일'),
                subtitle: Text(std['email'] ?? ''),
              ),
              ListTile(
                title: const Text('전화번호'),
                subtitle: Text(std['phone'] ?? ''),
              ),
              const Divider(),
              ValueListenableBuilder<String>(
                valueListenable: statusCtrl,
                builder: (context, val, _) {
                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('계정 상태 설정', style: TextStyle(fontWeight: FontWeight.bold)),
                      DropdownButton<String>(
                        value: val,
                        items: const [
                          DropdownMenuItem(value: 'active', child: Text('정상 (Active)')),
                          DropdownMenuItem(value: 'inactive', child: Text('정지 (Blocked)')),
                        ],
                        onChanged: (v) {
                          if (v != null) statusCtrl.value = v;
                        },
                      ),
                    ],
                  );
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () async {
                // 삭제 처리
                Navigator.pop(context);
                await FirebaseFirestore.instance.collection('users').doc(std['id']).delete();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('🗑️ 학생 정보가 영구 삭제되었습니다.')),
                );
              },
              style: TextButton.styleFrom(foregroundColor: Colors.redAccent),
              child: const Text('학생 탈퇴(삭제)'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('취소'),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(context);
                await FirebaseFirestore.instance.collection('users').doc(std['id']).update({
                  'status': statusCtrl.value,
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('💾 설정이 저장되었습니다.')),
                );
              },
              child: const Text('저장'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppStateProvider>(context);
    final theme = Theme.of(context);

    // 검색어 필터 적용
    final filtered = state.students.where((s) {
      final name = (s['name'] ?? '').toString().toLowerCase();
      final email = (s['email'] ?? '').toString().toLowerCase();
      return name.contains(_searchQuery) || email.contains(_searchQuery);
    }).toList();

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      body: Column(
        children: [
          // 상단 검색바
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.search),
                hintText: '학생 이름 또는 이메일 검색...',
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
              ),
              onChanged: (v) => setState(() => _searchQuery = v.trim().toLowerCase()),
            ),
          ),

          // 학생 목록뷰
          Expanded(
            child: filtered.isEmpty
                ? const Center(child: Text('검색 결과와 일치하는 학생이 없습니다.'))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: filtered.length,
                    itemBuilder: (context, idx) {
                      final std = filtered[idx];
                      final bool isBlocked = std['status'] == 'inactive';

                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        color: isBlocked ? Colors.grey[200] : Colors.white,
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: isBlocked ? Colors.grey : theme.colorScheme.primary.withOpacity(0.1),
                            child: Icon(Icons.person, color: isBlocked ? Colors.white : theme.colorScheme.primary),
                          ),
                          title: Text(
                            std['name'] ?? '이름없음',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              decoration: isBlocked ? TextDecoration.lineThrough : null,
                            ),
                          ),
                          subtitle: Text(std['phone'] ?? std['email'] ?? ''),
                          trailing: isBlocked
                              ? const Chip(label: Text('정지'), backgroundColor: Colors.redAccent, labelStyle: TextStyle(color: Colors.white, fontSize: 11))
                              : const Icon(Icons.chevron_right_rounded),
                          onTap: () => _showEditStudentModal(context, std),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddStudentModal(context),
        child: const Icon(Icons.add),
      ),
    );
  }
}

// -------------------------------------------------------------
// [Admin Tab] 3. AdminAttendanceTab (출결 관리 및 수동 변경)
// -------------------------------------------------------------
class AdminAttendanceTab extends StatefulWidget {
  const AdminAttendanceTab({super.key});

  @override
  State<AdminAttendanceTab> createState() => _AdminAttendanceTabState();
}

class _AdminAttendanceTabState extends State<AdminAttendanceTab> {
  DateTime _selectedDate = DateTime.now();
  List<Map<String, dynamic>> _attendRecords = [];

  @override
  void initState() {
    super.initState();
    _loadSelectedDateAttendance();
  }

  Future<void> _loadSelectedDateAttendance() async {
    final dateStr = _selectedDate.toIso8601String().substring(0, 10);
    try {
      final snap = await FirebaseFirestore.instance
          .collection('attendance')
          .where('date', isEqualTo: dateStr)
          .get();

      setState(() {
        _attendRecords = snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
      });
    } catch (e) {
      debugPrint(e.toString());
    }
  }

  Future<void> _showDatePicker() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2025),
      lastDate: DateTime(2030),
    );

    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
      _loadSelectedDateAttendance();
    }
  }

  // 출결 보정 다이얼로그
  void _showEditAttendanceModal(BuildContext context, Map<String, dynamic>? record, Map<String, dynamic> std) {
    final statusCtrl = ValueNotifier<String>(record?['status'] ?? 'absent');
    final memoCtrl = TextEditingController(text: record?['memo'] ?? '');

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('${std['name']} 출결 정보 보정', style: const TextStyle(fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ValueListenableBuilder<String>(
                valueListenable: statusCtrl,
                builder: (context, val, _) {
                  return DropdownButtonFormField<String>(
                    value: val,
                    decoration: const InputDecoration(labelText: '출결 상태'),
                    items: const [
                      DropdownMenuItem(value: 'present', child: Text('출석')),
                      DropdownMenuItem(value: 'late', child: Text('지각')),
                      DropdownMenuItem(value: 'absent', child: Text('결석')),
                    ],
                    onChanged: (v) {
                      if (v != null) statusCtrl.value = v;
                    },
                  );
                },
              ),
              const SizedBox(height: 10),
              TextField(
                controller: memoCtrl,
                decoration: const InputDecoration(labelText: '사유/메모'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('취소'),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(context);
                final dateStr = _selectedDate.toIso8601String().substring(0, 10);

                if (record != null) {
                  // 기존 기록 수정
                  await FirebaseFirestore.instance.collection('attendance').doc(record['id']).update({
                    'status': statusCtrl.value,
                    'memo': memoCtrl.text.trim(),
                  });
                } else {
                  // 신규 기록 강제 삽입
                  await FirebaseFirestore.instance.collection('attendance').add({
                    'uid': std['uid'],
                    'name': std['name'],
                    'date': dateStr,
                    'checkInTime': Timestamp.now(),
                    'status': statusCtrl.value,
                    'memo': memoCtrl.text.trim(),
                  });
                }

                _loadSelectedDateAttendance();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('💾 출결 상태가 정상 반영되었습니다.')),
                );
              },
              child: const Text('적용'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppStateProvider>(context);
    final theme = Theme.of(context);
    final dateStr = _selectedDate.toIso8601String().substring(0, 10);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      body: Column(
        children: [
          // 날짜 선택 바
          InkWell(
            onTap: _showDatePicker,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
              color: Colors.white,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.calendar_month, color: theme.colorScheme.primary),
                      const SizedBox(width: 8),
                      Text(
                        '조회 날짜: $dateStr',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    ],
                  ),
                  const Icon(Icons.arrow_drop_down),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),

          // 통합 명부 출결 매치업 리스트
          Expanded(
            child: state.students.isEmpty
                ? const Center(child: Text('등록된 학생이 없습니다.'))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: state.students.length,
                    itemBuilder: (context, idx) {
                      final std = state.students[idx];
                      // 현재 선택된 날짜의 해당 학생 출결 기록 매핑 검색
                      final record = _attendRecords.firstWhere(
                        (a) => a['uid'] == std['uid'],
                        orElse: () => {},
                      );

                      final bool hasRecord = record.isNotEmpty;
                      final String status = record['status'] ?? 'absent';
                      final String memo = record['memo'] ?? (hasRecord ? '기록 없음' : '결석');

                      Color statusColor = Colors.redAccent;
                      String statusKo = '결석';
                      if (hasRecord) {
                        if (status == 'present') {
                          statusColor = theme.colorScheme.secondary;
                          statusKo = '출석';
                        } else if (status == 'late') {
                          statusColor = Colors.orange;
                          statusKo = '지각';
                        }
                      }

                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text(std['name'] ?? '이름없음', style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text('사유: $memo'),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: statusColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              statusKo,
                              style: TextStyle(color: statusColor, fontWeight: FontWeight.bold),
                            ),
                          ),
                          onTap: () => _showEditAttendanceModal(context, hasRecord ? record : null, std),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// [Admin Tab] 4. AdminChatListTab (상담방 리스트)
// -------------------------------------------------------------
class AdminChatListTab extends StatelessWidget {
  const AdminChatListTab({super.key});

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppStateProvider>(context);
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      body: state.chatRooms.isEmpty
          ? const Center(child: Text('상담 요청 중인 채팅방이 없습니다.'))
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: state.chatRooms.length,
              itemBuilder: (context, idx) {
                final room = state.chatRooms[idx];
                final String studentName = room['studentName'] ?? '익명학생';
                final String lastMsg = room['lastMessage'] ?? '';
                final int unread = room['unreadCountByAdmin'] as int? ?? 0;

                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                      child: Text(
                        studentName[0],
                        style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.primary),
                      ),
                    ),
                    title: Text(studentName, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text(lastMsg, maxLines: 1, overflow: TextOverflow.ellipsis),
                    trailing: unread > 0
                        ? CircleAvatar(
                            radius: 10,
                            backgroundColor: Colors.redAccent,
                            child: Text(
                              '$unread',
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          )
                        : const Icon(Icons.chevron_right_rounded),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => AdminChatDetailView(roomId: room['id'], studentName: studentName),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
    );
  }
}

// -------------------------------------------------------------
// [View] AdminChatDetailView (관리자 1:1 상담 대화방 상세)
// -------------------------------------------------------------
class AdminChatDetailView extends StatefulWidget {
  final String roomId;
  final String studentName;

  const AdminChatDetailView({super.key, required this.roomId, required this.studentName});

  @override
  State<AdminChatDetailView> createState() => _AdminChatDetailViewState();
}

class _AdminChatDetailViewState extends State<AdminChatDetailView> {
  final TextEditingController _msgController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    final state = Provider.of<AppStateProvider>(context, listen: false);
    state.subscribeMessages(widget.roomId);
    _clearUnreadCount();
  }

  @override
  void dispose() {
    final state = Provider.of<AppStateProvider>(context, listen: false);
    state.unsubscribeMessages();
    super.dispose();
  }

  // 어드민이 진입하면 미읽음 카운트를 0으로 초기화
  Future<void> _clearUnreadCount() async {
    await FirebaseFirestore.instance.collection('chat_rooms').doc(widget.roomId).update({
      'unreadCountByAdmin': 0
    });
  }

  // 답장 전송
  Future<void> _sendReply() async {
    final text = _msgController.text.trim();
    if (text.isEmpty) return;

    _msgController.clear();
    final roomDoc = FirebaseFirestore.instance.collection('chat_rooms').doc(widget.roomId);

    // 1. 하위 메시지 추가
    await roomDoc.collection('messages').add({
      'senderUid': 'admin',
      'senderName': '최고관리자',
      'text': text,
      'createdAt': FieldValue.serverTimestamp(),
    });

    // 2. 채팅방 요약 정보 업데이트
    await roomDoc.update({
      'lastMessage': text,
      'lastMessageTime': FieldValue.serverTimestamp(),
      'unreadCountByStudent': FieldValue.increment(1)
    });

    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppStateProvider>(context);
    final theme = Theme.of(context);

    if (state.currentMessages.isNotEmpty) {
      _scrollToBottom();
    }

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        title: Text('${widget.studentName} 학생과의 1:1 상담'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: state.currentMessages.length,
              itemBuilder: (context, idx) {
                final m = state.currentMessages[idx];
                final isMe = m['senderUid'] == 'admin';

                return Align(
                  alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isMe ? theme.colorScheme.primary : Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(12),
                        topRight: const Radius.circular(12),
                        bottomLeft: isMe ? const Radius.circular(12) : Radius.zero,
                        bottomRight: isMe ? Radius.zero : const Radius.circular(12),
                      ),
                    ),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.7),
                    child: Text(
                      m['text'] ?? '',
                      style: TextStyle(
                        color: isMe ? Colors.white : Colors.black87,
                        fontSize: 14,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _msgController,
                    decoration: const InputDecoration(
                      hintText: '답장을 입력하세요...',
                      fillColor: Color(0xFFF0F2F5),
                      filled: true,
                    ),
                    onSubmitted: (_) => _sendReply(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _sendReply,
                  icon: Icon(Icons.send_rounded, color: theme.colorScheme.primary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
