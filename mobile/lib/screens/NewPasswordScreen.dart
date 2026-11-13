
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../utils/getAPI.dart';
import 'PasswordResetSuccessScreen.dart';

class NewPasswordScreen extends StatefulWidget {
  final String email;

  const NewPasswordScreen({
    super.key,
    required this.email,
  });

  @override
  State<NewPasswordScreen> createState() =>
      _NewPasswordScreenState();
}

class _NewPasswordScreenState extends State<NewPasswordScreen> {
  static const String baseUrl = 'https://predictionmarketucf.site';

  final TextEditingController codeController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController confirmPasswordController =
  TextEditingController();

  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  bool obscurePassword = true;
  bool obscureConfirmPassword = true;
  bool isLoading = false;
  String errorMessage = '';

  @override
  void dispose() {
    codeController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    super.dispose();
  }

  // Submit the new password
  Future<void> updatePassword() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      isLoading = true;
      errorMessage = '';
    });

    try {
      final response = await ApiService.postJson(
        '$baseUrl/api/password/update',
        {
          'email': widget.email,
          'authCode': codeController.text.trim(),
          'newPassword': passwordController.text,
        },
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) =>
            const PasswordResetSuccessScreen(),
          ),
        );
      } else {
        final decoded = jsonDecode(response.body);

        setState(() {
          errorMessage = decoded['message'] ??
              'Unable to reset password. Please try again.';
        });
      }
    } catch (e) {
      if (!mounted) return;

      setState(() {
        errorMessage =
        'Something went wrong. Please try again.';
      });

      debugPrint('Update password error: $e');
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
    return Scaffold(
      backgroundColor:
      const Color.fromARGB(255, 245, 245, 245),

      appBar: AppBar(
        backgroundColor:
        const Color.fromARGB(255, 53, 94, 59),
        foregroundColor: Colors.white,
        title: const Text(
          'Reset Password',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),

      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(25),

            child: Form(
              key: _formKey,

              child: Column(
                children: [

                  const Icon(
                    Icons.lock_reset,
                    size: 85,
                    color: Color.fromARGB(255, 53, 94, 59),
                  ),

                  const SizedBox(height: 25),

                  const Text(
                    'Create a New Password',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                      color: Color.fromARGB(255, 27, 51, 62),
                    ),
                  ),

                  const SizedBox(height: 15),

                  const Text(
                    'Enter the verification code sent to your email '
                        'and choose a new password.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 16),
                  ),

                  const SizedBox(height: 8),

                  Text(
                    widget.email,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color.fromARGB(255, 53, 94, 59),
                    ),
                  ),

                  const SizedBox(height: 30),

                  // Verification code
                  TextFormField(
                    controller: codeController,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                    ],
                    textAlign: TextAlign.center,

                    decoration: InputDecoration(
                      labelText: 'Verification Code',
                      hintText: 'Enter 6-digit code',
                      counterText: '',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(6),
                      ),
                      contentPadding:
                      const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                    ),

                    validator: (value) {
                      if (value == null || value.length != 6) {
                        return 'Please enter the 6-digit code.';
                      }
                      return null;
                    },
                  ),

                  const SizedBox(height: 15),

                  // New password
                  TextFormField(
                    controller: passwordController,
                    obscureText: obscurePassword,

                    decoration: InputDecoration(
                      hintText: 'New Password',
                      prefixIcon: const Icon(Icons.lock_outlined),
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

                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(6),
                      ),

                      contentPadding:
                      const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                    ),

                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter a new password.';
                      }
                      return null;
                    },
                  ),

                  const SizedBox(height: 15),

                  // Confirm new password
                  TextFormField(
                    controller: confirmPasswordController,
                    obscureText: obscureConfirmPassword,

                    decoration: InputDecoration(
                      hintText: 'Confirm New Password',
                      prefixIcon: const Icon(Icons.lock_outlined),
                      suffixIcon: IconButton(
                        icon: Icon(
                          obscureConfirmPassword
                              ? Icons.visibility_off
                              : Icons.visibility,
                        ),
                        onPressed: () {
                          setState(() {
                            obscureConfirmPassword =
                            !obscureConfirmPassword;
                          });
                        },
                      ),

                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(6),
                      ),

                      contentPadding:
                      const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                    ),

                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please confirm your new password.';
                      }

                      if (value != passwordController.text) {
                        return 'Passwords do not match.';
                      }

                      return null;
                    },
                  ),

                  const SizedBox(height: 15),

                  // Error message
                  if (errorMessage.isNotEmpty)
                    Text(
                      errorMessage,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.red,
                        fontSize: 14,
                      ),
                    ),

                  const SizedBox(height: 35),

                  // Update password button
                  SizedBox(
                    height: 48,
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed:
                      isLoading ? null : updatePassword,

                      style: ElevatedButton.styleFrom(
                        backgroundColor:
                        const Color.fromARGB(255, 53, 94, 59),
                        foregroundColor:
                        const Color.fromARGB(255, 245, 245, 245),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(6),
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
                        'Reset Password',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),

                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
