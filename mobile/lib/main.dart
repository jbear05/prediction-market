import 'package:flutter/material.dart';
import 'package:prediction_market/routes/routes.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  // This widget is the root of the application.

  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Prediction Market App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: .fromSeed(seedColor: Color.fromARGB(255, 53, 94, 59))
      ),
      routes: Routes.getroutes
    );
  }
}
