class ComplexTimer {
  final int? id;
  final String name;
  final String description;
  final List<Routine> routines;

  ComplexTimer({
    this.id,
    required this.name,
    this.description = '',
    required this.routines,
  });

  // Calculate the total duration of this complex timer
  int get totalDurationSeconds {
    int total = 0;
    for (var routine in routines) {
      int routineDuration = 0;
      for (var stage in routine.stages) {
        routineDuration += stage.durationSeconds;
      }
      total += routineDuration * routine.repeatCount;
    }
    return total;
  }

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'name': name,
      'description': description,
    };
  }

  factory ComplexTimer.fromMap(Map<String, dynamic> map, {List<Routine> routines = const []}) {
    return ComplexTimer(
      id: map['id'] as int?,
      name: map['name'] as String? ?? '',
      description: map['description'] as String? ?? '',
      routines: routines,
    );
  }

  ComplexTimer copyWith({
    int? id,
    String? name,
    String? description,
    List<Routine>? routines,
  }) {
    return ComplexTimer(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      routines: routines ?? this.routines,
    );
  }
}

class Routine {
  final int? id;
  final int? complexTimerId;
  final String name;
  final int repeatCount;
  final int orderIndex;
  final List<Stage> stages;

  Routine({
    this.id,
    this.complexTimerId,
    required this.name,
    required this.repeatCount,
    required this.orderIndex,
    required this.stages,
  });

  Map<String, dynamic> toMap(int parentId) {
    return {
      if (id != null) 'id': id,
      'complex_timer_id': parentId,
      'name': name,
      'repeat_count': repeatCount,
      'order_index': orderIndex,
    };
  }

  factory Routine.fromMap(Map<String, dynamic> map, {List<Stage> stages = const []}) {
    return Routine(
      id: map['id'] as int?,
      complexTimerId: map['complex_timer_id'] as int?,
      name: map['name'] as String? ?? '',
      repeatCount: map['repeat_count'] as int? ?? 1,
      orderIndex: map['order_index'] as int? ?? 0,
      stages: stages,
    );
  }

  Routine copyWith({
    int? id,
    int? complexTimerId,
    String? name,
    int? repeatCount,
    int? orderIndex,
    List<Stage>? stages,
  }) {
    return Routine(
      id: id ?? this.id,
      complexTimerId: complexTimerId ?? this.complexTimerId,
      name: name ?? this.name,
      repeatCount: repeatCount ?? this.repeatCount,
      orderIndex: orderIndex ?? this.orderIndex,
      stages: stages ?? this.stages,
    );
  }
}

class Stage {
  final int? id;
  final int? routineId;
  final String name;
  final int durationSeconds;
  final String soundEffect;
  final int orderIndex;

  Stage({
    this.id,
    this.routineId,
    required this.name,
    required this.durationSeconds,
    this.soundEffect = 'beep.mp3',
    required this.orderIndex,
  });

  Map<String, dynamic> toMap(int parentId) {
    return {
      if (id != null) 'id': id,
      'routine_id': parentId,
      'name': name,
      'duration_seconds': durationSeconds,
      'sound_effect': soundEffect,
      'order_index': orderIndex,
    };
  }

  factory Stage.fromMap(Map<String, dynamic> map) {
    return Stage(
      id: map['id'] as int?,
      routineId: map['routine_id'] as int?,
      name: map['name'] as String? ?? '',
      durationSeconds: map['duration_seconds'] as int? ?? 0,
      soundEffect: map['sound_effect'] as String? ?? 'beep.mp3',
      orderIndex: map['order_index'] as int? ?? 0,
    );
  }

  Stage copyWith({
    int? id,
    int? routineId,
    String? name,
    int? durationSeconds,
    String? soundEffect,
    int? orderIndex,
  }) {
    return Stage(
      id: id ?? this.id,
      routineId: routineId ?? this.routineId,
      name: name ?? this.name,
      durationSeconds: durationSeconds ?? this.durationSeconds,
      soundEffect: soundEffect ?? this.soundEffect,
      orderIndex: orderIndex ?? this.orderIndex,
    );
  }
}
