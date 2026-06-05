import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/timer_models.dart';
import '../providers/timer_provider.dart';

class TimerPlayScreen extends StatefulWidget {
  final ComplexTimer timer;

  const TimerPlayScreen({super.key, required this.timer});

  @override
  State<TimerPlayScreen> createState() => _TimerPlayScreenState();
}

class _TimerPlayScreenState extends State<TimerPlayScreen> {
  @override
  void initState() {
    super.initState();
    // Auto-start timer on load
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TimerProvider>(context, listen: false).startTimer(widget.timer);
    });
  }

  @override
  void dispose() {
    // Ensure timer stops and screen wakelock releases when leaving screen
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Use context.read since we are in dispose lifecycle (non-reactive)
      // but to be safe we can use a reference or call it inside a try-catch
      try {
        final provider = Provider.of<TimerProvider>(context, listen: false);
        if (provider.status != TimerStatus.idle) {
          provider.stopTimer();
        }
      } catch (_) {}
    });
    super.dispose();
  }

  Color _getStageColor(String stageName) {
    final name = stageName.toLowerCase();
    if (name.contains('준비') || name.contains('prepare') || name.contains('ready')) {
      return const Color(0xFFFFB000); // Neon Gold/Amber
    } else if (name.contains('휴식') || name.contains('rest') || name.contains('break')) {
      return const Color(0xFFD000FF); // Neon Violet/Purple
    } else {
      return const Color(0xFF00FFC2); // Neon Mint/Cyan
    }
  }

  String _formatTime(int totalSeconds) {
    final minutes = totalSeconds ~/ 60;
    final seconds = totalSeconds % 60;
    final minStr = minutes.toString().padLeft(2, '0');
    final secStr = seconds.toString().padLeft(2, '0');
    return '$minStr:$secStr';
  }

  void _onBackPressed() {
    final provider = Provider.of<TimerProvider>(context, listen: false);
    if (provider.status == TimerStatus.completed || provider.status == TimerStatus.idle) {
      provider.stopTimer();
      Navigator.pop(context);
      return;
    }

    // Show confirm dialog
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1D2333),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Colors.white10),
        ),
        title: Text(
          '운동 종료',
          style: GoogleFonts.rajdhani(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        content: const Text(
          '진행 중인 운동을 멈추고 나가시겠습니까?',
          style: TextStyle(color: Colors.white70, fontSize: 16),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('계속하기', style: TextStyle(color: Color(0xFF00FFC2))),
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
              provider.stopTimer();
              Navigator.pop(ctx); // pop dialog
              Navigator.pop(context); // pop play screen
            },
            child: const Text('종료하고 나가기'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _onBackPressed();
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF0C101B),
        body: Consumer<TimerProvider>(
          builder: (context, provider, child) {
            final stage = provider.currentStage;
            final routine = provider.currentRoutine;
            final stageName = stage?.name ?? '준비';
            final stageColor = _getStageColor(stageName);

            // Calculate progress for current stage
            double progress = 1.0;
            if (stage != null && stage.durationSeconds > 0) {
              progress = provider.stageRemainingSeconds / stage.durationSeconds;
            }

            if (provider.status == TimerStatus.completed) {
              return _buildCompletedUI(provider);
            }

            return Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    stageColor.withOpacity(0.08),
                    const Color(0xFF0C101B),
                  ],
                ),
              ),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                  child: Column(
                    children: [
                      // Header (Back button and Timer Name)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.close, color: Colors.white, size: 28),
                            onPressed: _onBackPressed,
                          ),
                          Text(
                            provider.activeTimer?.name ?? '',
                            style: GoogleFonts.rajdhani(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 48), // Spacer to balance leading button
                        ],
                      ),
                      const Spacer(),

                      // Repetition / Round text indicator
                      if (routine != null)
                        Text(
                          '${routine.name} ${provider.currentRepeatCount} / ${routine.repeatCount}',
                          style: GoogleFonts.rajdhani(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1,
                            color: Colors.white,
                          ),
                        ),
                      const SizedBox(height: 8),

                      // Stage Name Label (Prepare, Fight, Rest)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                        decoration: BoxDecoration(
                          color: stageColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(30),
                          border: Border.all(color: stageColor.withOpacity(0.3), width: 1.5),
                          boxShadow: [
                            BoxShadow(
                              color: stageColor.withOpacity(0.1),
                              blurRadius: 10,
                              spreadRadius: 2,
                            )
                          ],
                        ),
                        child: Text(
                          stageName.toUpperCase(),
                          style: GoogleFonts.orbitron(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2,
                            color: stageColor,
                          ),
                        ),
                      ),
                      const Spacer(),

                      // Circular countdown timer display
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          // Outer neon glowing circle
                          Container(
                            width: 280,
                            height: 280,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white.withOpacity(0.03),
                                width: 12,
                              ),
                            ),
                          ),
                          // Custom progress spinner
                          SizedBox(
                            width: 280,
                            height: 280,
                            child: CircularProgressIndicator(
                              value: progress,
                              strokeWidth: 12,
                              color: stageColor,
                              backgroundColor: Colors.transparent,
                            ),
                          ),
                          // Timer Text digits
                          Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _formatTime(provider.stageRemainingSeconds),
                                style: GoogleFonts.orbitron(
                                  fontSize: 68,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                  shadows: [
                                    Shadow(
                                      color: stageColor.withOpacity(0.5),
                                      blurRadius: 15,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '남은 시간',
                                style: TextStyle(
                                  color: Colors.white38,
                                  fontSize: 14,
                                  fontFamily: GoogleFonts.rajdhani().fontFamily,
                                  letterSpacing: 1.5,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const Spacer(),

                      // Overall stats display
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildStatItem('진행시간', _formatTime(provider.totalElapsedSeconds)),
                          _buildStatItem('남은 단계', '${widget.timer.routines.isNotEmpty ? (widget.timer.routines.first.stages.length - provider.currentStageIndex - 1) : 0}개'),
                        ],
                      ),
                      const Spacer(),

                      // Playback control buttons
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Stop button
                          IconButton(
                            iconSize: 56,
                            icon: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.white.withOpacity(0.05),
                                border: Border.all(color: Colors.white24),
                              ),
                              child: const Icon(Icons.stop_rounded, color: Colors.white70),
                            ),
                            onPressed: _onBackPressed,
                          ),
                          const SizedBox(width: 32),
                          // Play/Pause button
                          IconButton(
                            iconSize: 72,
                            icon: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: stageColor,
                                boxShadow: [
                                  BoxShadow(
                                    color: stageColor.withOpacity(0.3),
                                    blurRadius: 15,
                                    spreadRadius: 3,
                                  )
                                ],
                              ),
                              child: Icon(
                                provider.status == TimerStatus.running
                                    ? Icons.pause_rounded
                                    : Icons.play_arrow_rounded,
                                color: Colors.black,
                              ),
                            ),
                            onPressed: () {
                              if (provider.status == TimerStatus.running) {
                                provider.pauseTimer();
                              } else {
                                provider.resumeTimer();
                              }
                            },
                          ),
                        ],
                      ),
                      const Spacer(),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(color: Colors.white38, fontSize: 13),
        ),
        const SizedBox(height: 6),
        Text(
          value,
          style: GoogleFonts.orbitron(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildCompletedUI(TimerProvider provider) {
    final themeColor = const Color(0xFF00FFC2);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: themeColor.withOpacity(0.1),
              border: Border.all(color: themeColor, width: 2),
            ),
            child: Icon(Icons.emoji_events, size: 80, color: themeColor),
          ),
          const SizedBox(height: 32),
          Text(
            'WORKOUT COMPLETED!',
            style: GoogleFonts.orbitron(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            '오늘도 수고하셨습니다!',
            style: GoogleFonts.rajdhani(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 48),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF131826),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem('총 운동시간', _formatTime(provider.totalElapsedSeconds)),
              ],
            ),
          ),
          const SizedBox(height: 48),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: themeColor,
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(30),
              ),
              elevation: 8,
            ),
            onPressed: () {
              provider.stopTimer();
              Navigator.pop(context);
            },
            child: Text(
              '메인 화면으로',
              style: GoogleFonts.rajdhani(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
