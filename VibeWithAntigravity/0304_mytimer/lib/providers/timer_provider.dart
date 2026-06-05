import 'dart:async';
import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import '../models/timer_models.dart';
import '../services/db_helper.dart';

enum TimerStatus { idle, running, paused, completed }

class TimerProvider with ChangeNotifier {
  // DB list
  List<ComplexTimer> _timers = [];
  bool _isLoading = false;

  List<ComplexTimer> get timers => _timers;
  bool get isLoading => _isLoading;

  // Active Timer Playback State
  ComplexTimer? _activeTimer;
  TimerStatus _status = TimerStatus.idle;
  Timer? _ticker;

  // Ticker tracker indices
  int _currentRoutineIndex = 0;
  int _currentRepeatCount = 1; // 1-indexed (e.g. Round 1 of 12)
  int _currentStageIndex = 0;
  int _stageRemainingSeconds = 0;
  int _totalElapsedSeconds = 0;

  // Audio Player
  final AudioPlayer _audioPlayer = AudioPlayer();
  double _volume = 1.0;

  ComplexTimer? get activeTimer => _activeTimer;
  TimerStatus get status => _status;
  int get currentRoutineIndex => _currentRoutineIndex;
  int get currentRepeatCount => _currentRepeatCount;
  int get currentStageIndex => _currentStageIndex;
  int get stageRemainingSeconds => _stageRemainingSeconds;
  int get totalElapsedSeconds => _totalElapsedSeconds;
  double get volume => _volume;

  // Getters for active items
  Routine? get currentRoutine {
    if (_activeTimer == null || _currentRoutineIndex >= _activeTimer!.routines.length) return null;
    return _activeTimer!.routines[_currentRoutineIndex];
  }

  Stage? get currentStage {
    final r = currentRoutine;
    if (r == null || _currentStageIndex >= r.stages.length) return null;
    return r.stages[_currentStageIndex];
  }

  // --- Database Actions ---
  Future<void> loadTimers() async {
    _isLoading = true;
    notifyListeners();
    try {
      _timers = await DbHelper.instance.getComplexTimers();
    } catch (e) {
      debugPrint("DB load error: $e");
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> saveTimer(ComplexTimer timer) async {
    await DbHelper.instance.saveComplexTimer(timer);
    await loadTimers();
  }

  Future<void> deleteTimer(int id) async {
    await DbHelper.instance.deleteComplexTimer(id);
    await loadTimers();
  }

  // --- Timer Playback Control Actions ---
  Future<void> playPreviewSound(String soundEffect) async {
    try {
      await _audioPlayer.stop();
      await _audioPlayer.setVolume(_volume);
      await _audioPlayer.play(AssetSource('sounds/$soundEffect'));
    } catch (e) {
      debugPrint("Sound preview error: $e");
    }
  }

  void setVolume(double value) {
    _volume = value.clamp(0.0, 1.0);
    _audioPlayer.setVolume(_volume);
    notifyListeners();
  }

  void startTimer(ComplexTimer timer) {
    if (timer.routines.isEmpty || timer.routines.first.stages.isEmpty) return;

    // Reset runtime states
    _activeTimer = timer;
    _status = TimerStatus.running;
    _currentRoutineIndex = 0;
    _currentRepeatCount = 1;
    _currentStageIndex = 0;
    _stageRemainingSeconds = timer.routines[0].stages[0].durationSeconds;
    _totalElapsedSeconds = 0;

    // Enable wakelock to keep screen on during workouts
    WakelockPlus.enable();

    _startTicker();
    notifyListeners();
  }

  void pauseTimer() {
    if (_status == TimerStatus.running) {
      _ticker?.cancel();
      _status = TimerStatus.paused;
      notifyListeners();
    }
  }

  void resumeTimer() {
    if (_status == TimerStatus.paused) {
      _status = TimerStatus.running;
      _startTicker();
      notifyListeners();
    }
  }

  void stopTimer() {
    _ticker?.cancel();
    _ticker = null;
    _status = TimerStatus.idle;
    _activeTimer = null;
    WakelockPlus.disable();
    notifyListeners();
  }

  void _startTicker() {
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(seconds: 1), (timer) {
      _tick();
    });
  }

  void _tick() {
    if (_status != TimerStatus.running) return;

    if (_stageRemainingSeconds > 1) {
      _stageRemainingSeconds--;
      _totalElapsedSeconds++;
      notifyListeners();
    } else {
      // Current stage finished! Play designated sound
      final finishedStage = currentStage;
      if (finishedStage != null) {
        _playSound(finishedStage.soundEffect);
      }

      _totalElapsedSeconds++;
      _moveToNextStage();
    }
  }

  Future<void> _playSound(String assetName) async {
    try {
      await _audioPlayer.stop();
      await _audioPlayer.setVolume(_volume);
      await _audioPlayer.play(AssetSource('sounds/$assetName'));
    } catch (e) {
      debugPrint("Playback sound error: $e");
    }
  }

  void _moveToNextStage() {
    final r = currentRoutine;
    if (r == null) return;

    // Move to next stage in same routine
    if (_currentStageIndex + 1 < r.stages.length) {
      _currentStageIndex++;
      _stageRemainingSeconds = r.stages[_currentStageIndex].durationSeconds;
      notifyListeners();
      return;
    }

    // Last stage of routine: check if we repeat the routine
    if (_currentRepeatCount < r.repeatCount) {
      _currentRepeatCount++;
      _currentStageIndex = 0; // Back to first stage of routine
      _stageRemainingSeconds = r.stages[0].durationSeconds;
      notifyListeners();
      return;
    }

    // Finished all repeats of current routine: check next routine
    if (_currentRoutineIndex + 1 < _activeTimer!.routines.length) {
      _currentRoutineIndex++;
      _currentRepeatCount = 1;
      _currentStageIndex = 0;
      _stageRemainingSeconds = _activeTimer!.routines[_currentRoutineIndex].stages[0].durationSeconds;
      notifyListeners();
      return;
    }

    // All routines completed!
    _ticker?.cancel();
    _ticker = null;
    _status = TimerStatus.completed;
    _stageRemainingSeconds = 0;
    WakelockPlus.disable();
    _playSound('bell.mp3'); // Default victory/end sound
    notifyListeners();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _audioPlayer.dispose();
    WakelockPlus.disable();
    super.dispose();
  }
}
