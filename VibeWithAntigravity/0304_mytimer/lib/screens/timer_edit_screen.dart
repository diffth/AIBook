import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/timer_models.dart';
import '../providers/timer_provider.dart';

class TimerEditScreen extends StatefulWidget {
  final ComplexTimer? timer;

  const TimerEditScreen({super.key, this.timer});

  @override
  State<TimerEditScreen> createState() => _TimerEditScreenState();
}

class _TimerEditScreenState extends State<TimerEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late String _name;
  late String _description;
  late String _routineName;
  late int _repeatCount;
  late List<Stage> _stages;

  final List<String> _soundOptions = [
    'alarm.mp3',
    'beep.mp3',
    'bell.mp3',
    'chime.mp3',
    'ding.mp3',
    'whistle.mp3',
  ];

  @override
  void initState() {
    super.initState();
    final t = widget.timer;
    if (t != null) {
      _name = t.name;
      _description = t.description;
      if (t.routines.isNotEmpty) {
        _routineName = t.routines.first.name;
        _repeatCount = t.routines.first.repeatCount;
        _stages = List.from(t.routines.first.stages);
      } else {
        _routineName = '라운드';
        _repeatCount = 8;
        _stages = [];
      }
    } else {
      _name = '';
      _description = '';
      _routineName = '라운드';
      _repeatCount = 8;
      _stages = [
        Stage(name: '운동', durationSeconds: 30, soundEffect: 'beep.mp3', orderIndex: 0),
        Stage(name: '휴식', durationSeconds: 10, soundEffect: 'whistle.mp3', orderIndex: 1),
      ];
    }
  }

  void _showStageDialog({Stage? stage, int? index}) {
    final isEdit = stage != null;
    final nameController = TextEditingController(text: isEdit ? stage.name : '');
    int durationMin = isEdit ? (stage.durationSeconds ~/ 60) : 0;
    int durationSec = isEdit ? (stage.durationSeconds % 60) : 30;
    String selectedSound = isEdit ? stage.soundEffect : 'beep.mp3';

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            return AlertDialog(
              backgroundColor: const Color(0xFF1D2333),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: Colors.white10),
              ),
              title: Text(
                isEdit ? '단계 수정' : '새 단계 추가',
                style: GoogleFonts.rajdhani(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: nameController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        labelText: '단계 이름 (예: 파이팅, 휴식)',
                        labelStyle: TextStyle(color: Colors.white54),
                        enabledBorder: UnderlineInputBorder(
                          borderSide: BorderSide(color: Colors.white24),
                        ),
                        focusedBorder: UnderlineInputBorder(
                          borderSide: BorderSide(color: Color(0xFF00FFC2)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text('동작 시간', style: TextStyle(color: Colors.white70, fontSize: 14)),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Min picker
                        DropdownButton<int>(
                          dropdownColor: const Color(0xFF1D2333),
                          value: durationMin,
                          items: List.generate(60, (index) => index)
                              .map((m) => DropdownMenuItem(
                                    value: m,
                                    child: Text('$m 분', style: const TextStyle(color: Colors.white)),
                                  ))
                              .toList(),
                          onChanged: (val) {
                            if (val != null) setStateDialog(() => durationMin = val);
                          },
                        ),
                        const SizedBox(width: 20),
                        // Sec picker
                        DropdownButton<int>(
                          dropdownColor: const Color(0xFF1D2333),
                          value: durationSec,
                          items: List.generate(60, (index) => index)
                              .map((s) => DropdownMenuItem(
                                    value: s,
                                    child: Text('$s 초', style: const TextStyle(color: Colors.white)),
                                  ))
                              .toList(),
                          onChanged: (val) {
                            if (val != null) setStateDialog(() => durationSec = val);
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    const Text('종료 알림음', style: TextStyle(color: Colors.white70, fontSize: 14)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButton<String>(
                            dropdownColor: const Color(0xFF1D2333),
                            isExpanded: true,
                            value: selectedSound,
                            items: _soundOptions
                                .map((s) => DropdownMenuItem(
                                      value: s,
                                      child: Text(s.replaceAll('.mp3', '').toUpperCase(),
                                          style: const TextStyle(color: Colors.white)),
                                    ))
                                .toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setStateDialog(() => selectedSound = val);
                              }
                            },
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.volume_up, color: Color(0xFF00FFC2)),
                          onPressed: () {
                            Provider.of<TimerProvider>(context, listen: false)
                                .playPreviewSound(selectedSound);
                          },
                        )
                      ],
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('취소', style: TextStyle(color: Colors.white54)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00FFC2),
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onPressed: () {
                    final name = nameController.text.trim();
                    if (name.isEmpty) return;
                    final duration = (durationMin * 60) + durationSec;
                    if (duration <= 0) return;

                    final newStage = Stage(
                      id: isEdit ? stage.id : null,
                      routineId: isEdit ? stage.routineId : null,
                      name: name,
                      durationSeconds: duration,
                      soundEffect: selectedSound,
                      orderIndex: isEdit ? stage.orderIndex : _stages.length,
                    );

                    setState(() {
                      if (isEdit && index != null) {
                        _stages[index] = newStage;
                      } else {
                        _stages.add(newStage);
                      }
                    });

                    Navigator.pop(ctx);
                  },
                  child: Text(isEdit ? '수정' : '추가'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _saveTimer() {
    if (!_formKey.currentState!.validate()) return;
    if (_stages.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('최소 한 개 이상의 타이머 단계를 추가해야 합니다.')),
      );
      return;
    }

    _formKey.currentState!.save();

    final routine = Routine(
      id: widget.timer?.routines.firstOrNull?.id,
      complexTimerId: widget.timer?.id,
      name: _routineName,
      repeatCount: _repeatCount,
      orderIndex: 0,
      stages: _stages,
    );

    final timer = ComplexTimer(
      id: widget.timer?.id,
      name: _name,
      description: _description,
      routines: [routine],
    );

    Provider.of<TimerProvider>(context, listen: false).saveTimer(timer);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final themeColor = const Color(0xFF00FFC2); // Neon Cyan

    return Scaffold(
      backgroundColor: const Color(0xFF0C101B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0C101B),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          widget.timer == null ? '타이머 만들기' : '타이머 편집',
          style: GoogleFonts.rajdhani(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.check, color: themeColor, size: 28),
            onPressed: _saveTimer,
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  // Basic information section
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF131826),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Column(
                      children: [
                        TextFormField(
                          initialValue: _name,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            labelText: '타이머 이름',
                            labelStyle: const TextStyle(color: Colors.white54),
                            focusedBorder: UnderlineInputBorder(
                              borderSide: BorderSide(color: themeColor),
                            ),
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return '타이머 이름을 입력해주세요.';
                            }
                            return null;
                          },
                          onSaved: (value) => _name = value ?? '',
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          initialValue: _description,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            labelText: '간단 설명 (옵션)',
                            labelStyle: const TextStyle(color: Colors.white54),
                            focusedBorder: UnderlineInputBorder(
                              borderSide: BorderSide(color: themeColor),
                            ),
                          ),
                          onSaved: (value) => _description = value ?? '',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Routine parameters section
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF131826),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '루틴 반복 설정',
                          style: GoogleFonts.rajdhani(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              flex: 2,
                              child: TextFormField(
                                initialValue: _routineName,
                                style: const TextStyle(color: Colors.white),
                                decoration: InputDecoration(
                                  labelText: '루틴 이름',
                                  labelStyle: const TextStyle(color: Colors.white54),
                                  focusedBorder: UnderlineInputBorder(
                                    borderSide: BorderSide(color: themeColor),
                                  ),
                                ),
                                onSaved: (value) => _routineName = value ?? '라운드',
                              ),
                            ),
                            const SizedBox(width: 24),
                            Expanded(
                              flex: 3,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('반복 횟수 (세트/라운드)',
                                      style: TextStyle(color: Colors.white54, fontSize: 12)),
                                  Row(
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.remove_circle_outline, color: Colors.white70),
                                        onPressed: () {
                                          if (_repeatCount > 1) {
                                            setState(() => _repeatCount--);
                                          }
                                        },
                                      ),
                                      Text(
                                        '$_repeatCount',
                                        style: GoogleFonts.orbitron(
                                            color: themeColor,
                                            fontSize: 20,
                                            fontWeight: FontWeight.bold),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.add_circle_outline, color: Colors.white70),
                                        onPressed: () {
                                          if (_repeatCount < 99) {
                                            setState(() => _repeatCount++);
                                          }
                                        },
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Stage list header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '세부 단계 목록 (${_stages.length}개)',
                        style: GoogleFonts.rajdhani(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      TextButton.icon(
                        icon: Icon(Icons.add, color: themeColor, size: 20),
                        label: Text('단계 추가', style: TextStyle(color: themeColor)),
                        onPressed: () => _showStageDialog(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  if (_stages.isEmpty)
                    Container(
                      height: 100,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.02),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white10),
                      ),
                      child: const Text(
                        '추가된 단계가 없습니다. 단계를 추가해 주세요.',
                        style: TextStyle(color: Colors.white38),
                      ),
                    )
                  else
                    // We wrap list in a widget since ReorderableListView needs height constraint if inside another scrollable
                    // But to support drag and drop inside ListView, we can use a nested ListView with shrinkWrap and physics
                    ReorderableListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _stages.length,
                      itemBuilder: (context, index) {
                        final s = _stages[index];
                        final durationStr = s.durationSeconds >= 60
                            ? '${s.durationSeconds ~/ 60}m ${s.durationSeconds % 60}s'
                            : '${s.durationSeconds}s';
                        return Container(
                          key: ValueKey('stage_$index'),
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF131826),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white10),
                          ),
                          child: ListTile(
                            leading: ReorderableDragStartListener(
                              index: index,
                              child: const Icon(Icons.drag_handle, color: Colors.white30),
                            ),
                            title: Text(
                              s.name,
                              style: const TextStyle(
                                  color: Colors.white, fontWeight: FontWeight.w600),
                            ),
                            subtitle: Row(
                              children: [
                                Text(
                                  durationStr,
                                  style: GoogleFonts.orbitron(
                                      color: themeColor, fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(width: 12),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.05),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.music_note, size: 12, color: Colors.white54),
                                      const SizedBox(width: 4),
                                      Text(
                                        s.soundEffect.replaceAll('.mp3', '').toUpperCase(),
                                        style: const TextStyle(color: Colors.white54, fontSize: 10),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined, color: Colors.white70, size: 20),
                                  onPressed: () => _showStageDialog(stage: s, index: index),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
                                  onPressed: () {
                                    setState(() {
                                      _stages.removeAt(index);
                                    });
                                  },
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                      onReorder: (oldIndex, newIndex) {
                        setState(() {
                          if (newIndex > oldIndex) {
                            newIndex -= 1;
                          }
                          final item = _stages.removeAt(oldIndex);
                          _stages.insert(newIndex, item);
                        });
                      },
                    ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
