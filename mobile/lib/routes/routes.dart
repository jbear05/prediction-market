import 'package:flutter/material.dart';
import 'package:prediction_market/screens/LoginScreen.dart';
import 'package:prediction_market/screens/HomeScreen.dart';
import 'package:prediction_market/screens/RegisterScreen.dart';

class Routes {
  static const String LOGINSCREEN = '/login';
  static const String HOMESCREEN = '/home';
  static const String REGISTERSCREEN = '/register';

  // Define routes for pages in the app
  static Map<String, Widget Function(BuildContext)> get getroutes => {
    '/':(context) => LoginScreen(),
    LOGINSCREEN: (context) => LoginScreen(),
    HOMESCREEN: (context) => HomeScreen(),
    REGISTERSCREEN: (context) => RegisterScreen(),
  };
}
