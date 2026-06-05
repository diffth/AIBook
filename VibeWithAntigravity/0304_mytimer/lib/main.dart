import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/timer_provider.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => TimerProvider(),
      child: MaterialApp(
        title: '메탈펄스 타이머 (MetalPulse Timer)',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          brightness: Brightness.dark,
          scaffoldBackgroundColor: const Color(0xFF0C101B),
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF00FFC2), // Neon Cyan
            secondary: Color(0xFFBD00FF), // Neon Purple
            surface: Color(0xFF131826),
            error: Colors.redAccent,
          ),
          textTheme: const TextTheme(
            bodyLarge: TextStyle(color: Colors.white),
            bodyMedium: TextStyle(color: Colors.white70),
          ),
        ),
        home: const HomeScreen(),
      ),
    );
  }
}
