import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/timer_models.dart';
import '../providers/timer_provider.dart';
import 'timer_edit_screen.dart';
import 'timer_play_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    // Fetch timers on load
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TimerProvider>(context, listen: false).loadTimers();
    });
  }

  String _formatDuration(int totalSeconds) {
    final minutes = totalSeconds ~/ 60;
    final seconds = totalSeconds % 60;
    if (minutes > 0) {
      return '${minutes}분 ${seconds > 0 ? '$seconds초' : ''}';
    }
    return '$seconds초';
  }

  void _confirmDelete(BuildContext context, ComplexTimer timer) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1D2333),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Colors.redAccent, width: 1),
        ),
        title: Text(
          '타이머 삭제',
          style: GoogleFonts.rajdhani(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        content: Text(
          '"${timer.name}" 타이머를 삭제하시겠습니까?',
          style: const TextStyle(color: Colors.white70, fontSize: 16),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('취소', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            onPressed: () {
              if (timer.id != null) {
                Provider.of<TimerProvider>(context, listen: false)
                    .deleteTimer(timer.id!);
              }
              Navigator.pop(ctx);
            },
            child: const Text('삭제'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeColor = const Color(0xFF00FFC2); // Neon Cyan
    return Scaffold(
      backgroundColor: const Color(0xFF0C101B), // Dark background
      appBar: AppBar(
        backgroundColor: const Color(0xFF0C101B),
        elevation: 0,
        title: Text(
          'MY TIMERS',
          style: GoogleFonts.orbitron(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            letterSpacing: 2,
            color: themeColor,
          ),
        ),
        centerTitle: true,
      ),
      body: Consumer<TimerProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return Center(
              child: CircularProgressIndicator(color: themeColor),
            );
          }

          if (provider.timers.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.timer_outlined, size: 72, color: Colors.white24),
                  const SizedBox(height: 16),
                  Text(
                    '저장된 타이머가 없습니다.',
                    style: TextStyle(
                      color: Colors.white38,
                      fontSize: 16,
                      fontFamily: GoogleFonts.rajdhani().fontFamily,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '하단의 + 버튼을 눌러 새 타이머를 만들어보세요!',
                    style: TextStyle(
                      color: Colors.white24,
                      fontSize: 14,
                      fontFamily: GoogleFonts.rajdhani().fontFamily,
                    ),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            itemCount: provider.timers.length,
            itemBuilder: (context, index) {
              final timer = provider.timers[index];
              return Container(
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFF131826),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white10),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 5),
                    )
                  ],
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => TimerPlayScreen(timer: timer),
                        ),
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  timer.name,
                                  style: GoogleFonts.rajdhani(
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: themeColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                      color: themeColor.withOpacity(0.3)),
                                ),
                                child: Text(
                                  _formatDuration(timer.totalDurationSeconds),
                                  style: GoogleFonts.orbitron(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: themeColor,
                                  ),
                                ),
                              )
                            ],
                          ),
                          if (timer.description.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              timer.description,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white60,
                                fontSize: 14,
                              ),
                            ),
                          ],
                          const SizedBox(height: 12),
                          const Divider(color: Colors.white10, height: 1),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.loop_rounded,
                                      size: 16, color: Colors.white54),
                                  const SizedBox(width: 6),
                                  Text(
                                    timer.routines.isNotEmpty
                                        ? '${timer.routines.first.name} ${timer.routines.first.repeatCount}회 반복'
                                        : '루틴 정보 없음',
                                    style: const TextStyle(
                                        color: Colors.white54, fontSize: 13),
                                  ),
                                ],
                              ),
                              Row(
                                children: [
                                  IconButton(
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    icon: const Icon(Icons.edit_outlined,
                                        size: 20, color: Colors.white70),
                                    onPressed: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) =>
                                              TimerEditScreen(timer: timer),
                                        ),
                                      );
                                    },
                                  ),
                                  const SizedBox(width: 16),
                                  IconButton(
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    icon: const Icon(Icons.delete_outline_rounded,
                                        size: 20, color: Colors.redAccent),
                                    onPressed: () =>
                                        _confirmDelete(context, timer),
                                  ),
                                ],
                              )
                            ],
                          )
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: themeColor,
        elevation: 8,
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const TimerEditScreen(),
            ),
          );
        },
        child: const Icon(Icons.add, color: Colors.black, size: 28),
      ),
    );
  }
}
