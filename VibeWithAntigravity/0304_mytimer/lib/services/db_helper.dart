import 'dart:async';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import '../models/timer_models.dart';

class DbHelper {
  static final DbHelper instance = DbHelper._init();
  static Database? _database;

  // In-memory fallback for Web platform (Chrome execution)
  static final List<ComplexTimer> _webDb = [];
  static int _webIdCounter = 100;

  DbHelper._init() {
    if (kIsWeb) {
      _seedWebData();
    }
  }

  void _seedWebData() {
    _webDb.addAll([
      ComplexTimer(
        id: 1,
        name: '복싱 (12라운드)',
        description: '3분 파이팅 및 30초 휴식의 복싱 기본 루틴',
        routines: [
          Routine(
            id: 10,
            complexTimerId: 1,
            name: '라운드',
            repeatCount: 12,
            orderIndex: 0,
            stages: [
              Stage(id: 100, routineId: 10, name: '준비', durationSeconds: 10, soundEffect: 'beep.mp3', orderIndex: 0),
              Stage(id: 101, routineId: 10, name: '파이팅', durationSeconds: 180, soundEffect: 'bell.mp3', orderIndex: 1),
              Stage(id: 102, routineId: 10, name: '휴식', durationSeconds: 30, soundEffect: 'whistle.mp3', orderIndex: 2),
            ],
          )
        ],
      ),
      ComplexTimer(
        id: 2,
        name: '타바타 기초',
        description: '20초 고강도 운동과 10초 휴식을 반복하는 타바타 프로그램',
        routines: [
          Routine(
            id: 20,
            complexTimerId: 2,
            name: '세트',
            repeatCount: 8,
            orderIndex: 0,
            stages: [
              Stage(id: 200, routineId: 20, name: '운동', durationSeconds: 20, soundEffect: 'alarm.mp3', orderIndex: 0),
              Stage(id: 201, routineId: 20, name: '휴식', durationSeconds: 10, soundEffect: 'beep.mp3', orderIndex: 1),
            ],
          )
        ],
      ),
    ]);
  }

  Future<Database> get database async {
    if (kIsWeb) {
      throw UnsupportedError("SQLite is not supported on Web. Using in-memory fallback.");
    }
    if (_database != null) return _database!;
    _database = await _initDB('mytimer.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
      onConfigure: _onConfigure,
    );
  }

  Future _onConfigure(Database db) async {
    await db.execute('PRAGMA foreign_keys = ON');
  }

  Future _createDB(Database db, int version) async {
    const idType = 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const textType = 'TEXT NOT NULL';
    const integerType = 'INTEGER NOT NULL';

    await db.execute('''
      CREATE TABLE complex_timers (
        id $idType,
        name $textType,
        description TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE routines (
        id $idType,
        complex_timer_id INTEGER NOT NULL,
        name $textType,
        repeat_count $integerType,
        order_index $integerType,
        FOREIGN KEY (complex_timer_id) REFERENCES complex_timers (id) ON DELETE CASCADE
      )
    ''');

    await db.execute('''
      CREATE TABLE stages (
        id $idType,
        routine_id INTEGER NOT NULL,
        name $textType,
        duration_seconds $integerType,
        sound_effect $textType,
        order_index $integerType,
        FOREIGN KEY (routine_id) REFERENCES routines (id) ON DELETE CASCADE
      )
    ''');

    await _seedInitialData(db);
  }

  Future<void> _seedInitialData(Database db) async {
    final boxingId = await db.insert('complex_timers', {
      'name': '복싱 (12라운드)',
      'description': '3분 파이팅 및 30초 휴식의 복싱 기본 루틴',
    });

    final boxingRoutineId = await db.insert('routines', {
      'complex_timer_id': boxingId,
      'name': '라운드',
      'repeat_count': 12,
      'order_index': 0,
    });

    await db.insert('stages', {
      'routine_id': boxingRoutineId,
      'name': '준비',
      'duration_seconds': 10,
      'sound_effect': 'beep.mp3',
      'order_index': 0,
    });

    await db.insert('stages', {
      'routine_id': boxingRoutineId,
      'name': '파이팅',
      'duration_seconds': 180,
      'sound_effect': 'bell.mp3',
      'order_index': 1,
    });

    await db.insert('stages', {
      'routine_id': boxingRoutineId,
      'name': '휴식',
      'duration_seconds': 30,
      'sound_effect': 'whistle.mp3',
      'order_index': 2,
    });

    final tabataId = await db.insert('complex_timers', {
      'name': '타바타 기초',
      'description': '20초 고강도 운동과 10초 휴식을 반복하는 타바타 프로그램',
    });

    final tabataRoutineId = await db.insert('routines', {
      'complex_timer_id': tabataId,
      'name': '세트',
      'repeat_count': 8,
      'order_index': 0,
    });

    await db.insert('stages', {
      'routine_id': tabataRoutineId,
      'name': '운동',
      'duration_seconds': 20,
      'sound_effect': 'alarm.mp3',
      'order_index': 0,
    });

    await db.insert('stages', {
      'routine_id': tabataRoutineId,
      'name': '휴식',
      'duration_seconds': 10,
      'sound_effect': 'beep.mp3',
      'order_index': 1,
    });
  }

  Future<List<ComplexTimer>> getComplexTimers() async {
    if (kIsWeb) {
      return List.from(_webDb);
    }

    final db = await instance.database;
    final timerMaps = await db.query('complex_timers', orderBy: 'id DESC');
    List<ComplexTimer> timers = [];

    for (var timerMap in timerMaps) {
      final timerId = timerMap['id'] as int;
      final routineMaps = await db.query(
        'routines',
        where: 'complex_timer_id = ?',
        whereArgs: [timerId],
        orderBy: 'order_index ASC',
      );

      List<Routine> routines = [];
      for (var routineMap in routineMaps) {
        final routineId = routineMap['id'] as int;
        final stageMaps = await db.query(
          'stages',
          where: 'routine_id = ?',
          whereArgs: [routineId],
          orderBy: 'order_index ASC',
        );

        final stages = stageMaps.map((map) => Stage.fromMap(map)).toList();
        routines.add(Routine.fromMap(routineMap, stages: stages));
      }

      timers.add(ComplexTimer.fromMap(timerMap, routines: routines));
    }

    return timers;
  }

  Future<void> saveComplexTimer(ComplexTimer timer) async {
    if (kIsWeb) {
      if (timer.id != null) {
        final idx = _webDb.indexWhere((t) => t.id == timer.id);
        if (idx != -1) {
          _webDb[idx] = timer;
        }
      } else {
        final newId = _webIdCounter++;
        final updatedRoutines = timer.routines.map((r) {
          final newRId = _webIdCounter++;
          final updatedStages = r.stages.map((s) {
            return s.copyWith(id: _webIdCounter++, routineId: newRId);
          }).toList();
          return r.copyWith(id: newRId, complexTimerId: newId, stages: updatedStages);
        }).toList();

        _webDb.add(timer.copyWith(id: newId, routines: updatedRoutines));
      }
      return;
    }

    final db = await instance.database;
    await db.transaction((txn) async {
      int timerId;
      if (timer.id != null) {
        timerId = timer.id!;
        await txn.update(
          'complex_timers',
          timer.toMap(),
          where: 'id = ?',
          whereArgs: [timerId],
        );
        await txn.delete(
          'routines',
          where: 'complex_timer_id = ?',
          whereArgs: [timerId],
        );
      } else {
        timerId = await txn.insert('complex_timers', timer.toMap());
      }

      for (int i = 0; i < timer.routines.length; i++) {
        final routine = timer.routines[i];
        final routineId = await txn.insert(
          'routines',
          routine.copyWith(orderIndex: i).toMap(timerId),
        );

        for (int j = 0; j < routine.stages.length; j++) {
          final stage = routine.stages[j];
          await txn.insert(
            'stages',
            stage.copyWith(orderIndex: j).toMap(routineId),
          );
        }
      }
    });
  }

  Future<void> deleteComplexTimer(int id) async {
    if (kIsWeb) {
      _webDb.removeWhere((t) => t.id == id);
      return;
    }

    final db = await instance.database;
    await db.delete(
      'complex_timers',
      where: 'id = ?',
      whereArgs: [id],
    );
  }
}
