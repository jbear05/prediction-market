import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:prediction_market/screens/ResetPasswordScreen.dart';
import '../utils/GlobalData.dart';
import '../utils/getAPI.dart';
import 'package:http/http.dart' as http;

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {

  // Input controllers
  final TextEditingController emailController =
  TextEditingController();
  final TextEditingController passwordController =
  TextEditingController();

  final GlobalKey<FormState> _formKey =
      GlobalKey<FormState>();
  String errorMessage = '';
  bool isLoading = false;
  bool obscurePassword = true;

  static const String baseUrl = 'https://predictionmarketucf.site';

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  Future<void> loginUser() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    setState(() {
      errorMessage = '';
      isLoading = true;
    });

    Map<String, dynamic> payload = {
      "email": emailController.text.trim(),
      "rawPassword": passwordController.text,
    };

    try {
      String url = '$baseUrl/api/login';

      // Send login request and check for an empty response
      http.Response response = await ApiService.postJson(url, payload);
      if (response.body.trim().isEmpty) {
        throw Exception("No response from server.");
      }

      Map<String, dynamic> jsonObject =
      Map<String, dynamic>.from(jsonDecode(response.body));

      if (jsonObject["error"] == "EMAIL_NOT_VERIFIED") {
        setState(() {
          errorMessage = jsonObject["message"] ??
              "Please verify your email before logging in.";
        });
        return;
      }

      if (response.statusCode != 200) {
        setState(() {
          errorMessage = jsonObject["message"] ??
              "Login failed. Please check your credentials.";
        });
        return;
      }

      if (jsonObject["token"] == null ||
          jsonObject["token"].toString().isEmpty) {
        setState(() {
          errorMessage = "Login failed. No authentication token received.";
        });
        return;
      }
      // Store user information
      GlobalData.userId = jsonObject["userId"].toString();
      GlobalData.email = emailController.text.trim();
      GlobalData.token = jsonObject["token"].toString();

      // These fields are optional until the backend returns them
      if (jsonObject["displayName"] != null) {
        GlobalData.displayName = jsonObject["displayName"].toString();
      }
      if (jsonObject["balance"] != null) {
        GlobalData.balance = (jsonObject["balance"] as num).toInt();
      }
      if (jsonObject["role"] != null) {
        GlobalData.role = jsonObject["role"].toString();
      }

      // Navigate to HomeScreen
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/home');
    } catch (e) {
      if (!mounted) return;

      setState(() {
        errorMessage = "Unable to log in. Please try again.";
      });

      debugPrint("Login error: $e");
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
    }
  }
  @override
  Widget build(BuildContext context) {
    return Scaffold(backgroundColor:
    Color.fromARGB(255, 245, 245, 245), body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 420),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 70,),
            child: Form(
              key: _formKey,
              child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [

                // Title
                const Text(
                  'Prediction Market',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.bold,
                    color: Color.fromARGB(255, 27, 51, 62),
                  ),
                ),
                const SizedBox(height: 60),

                // Header
                const Text(
                  'Login',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.bold,
                    color: Color.fromARGB(255, 53, 94, 59),
                  ),
                ),
                const SizedBox(height: 45),

                // Email
                const Text(
                  'Email',
                  style: TextStyle(
                    fontSize: 20,
                    color: Color.fromARGB(255, 53, 94, 59),
                  ),
                ),

                const SizedBox(height: 5),
                TextFormField(
                  controller: emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    filled: true,
                    prefixIcon: const Icon(Icons.email_outlined),
                    fillColor: Color.fromARGB(255, 245, 245, 245),
                    border: OutlineInputBorder(),
                    hintText: 'Enter your email',
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                  ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please Enter Your Email';
                      }
                      return null;
                    }
                ),

                const SizedBox(height: 15),

                const Text(
                  'Password',
                  style: TextStyle(
                    fontSize: 20,
                    color: Color.fromARGB(255, 53, 94, 59),
                  ),
                ),
                const SizedBox(height: 5),
                TextFormField(
                  obscureText: obscurePassword,
                  controller: passwordController,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(
                        obscurePassword
                            ? Icons.visibility_off
                            : Icons.visibility,
                      ),
                      onPressed: () {
                        setState(() {
                          obscurePassword = !obscurePassword;
                        });
                      },
                    ),
                    filled: true,
                    fillColor: Color.fromARGB(255, 245, 245, 245),
                    border: OutlineInputBorder(),
                    hintText: 'Enter your password',
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                  ),
                  validator: (value) {

                    if (value == null || value.isEmpty) {
                      return 'Please Enter Your Password';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 15),

                // Error message
                if (errorMessage.isNotEmpty)
                  Text(errorMessage,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.red, fontSize: 14,),
                  ),
                const SizedBox(height: 65),

                // Login button
                SizedBox(

                  height: 48,
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: isLoading ? null : loginUser,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color.fromARGB(255, 53, 94, 59),
                      foregroundColor: Color.fromARGB(255, 245, 245, 245),
                      shape: RoundedRectangleBorder(
                        borderRadius:
                        BorderRadius.circular(6),
                      ),
                    ),
                    child: isLoading
                        ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                        : const Text(
                      'Login',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 20),

                TextButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) =>
                      const ResetPasswordScreen(),)
                    );
                  },
                  child: const Text(
                    'Forgot Password?',
                    style: TextStyle(
                      color: Color.fromARGB(255, 27, 51, 62),
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
                const Text(
                  "New here?",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color.fromARGB(255, 27, 51, 62),
                  ),
                ),

                // Register button
                TextButton(
                  onPressed: () {
                      Navigator.pushNamed(context, '/register');
                  },
                  child: const Text(
                  'Register',
                  style: TextStyle(
                  color: Color.fromARGB(255, 53, 94, 59),
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  decoration: TextDecoration.underline,
                ),
                  ),
                ),
              ],
              ),
            ),
          ),
        ),
      ),
    ),
    );
  }
}