
import 'package:flutter/material.dart';
import '../utils/getAPI.dart';
import 'NewPasswordScreen.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() =>
      _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  static const String baseUrl = 'https://predictionmarketucf.site';

  final TextEditingController emailController =
      TextEditingController();

  bool isLoading = false;
  String errorMessage = '';

  @override
  void dispose() {
    emailController.dispose();
    super.dispose();
  }

  // Send password reset code to email
  Future<void> sendResetCode() async {
    if (emailController.text.trim().isEmpty) {
      setState(() {
        errorMessage = 'Please enter your email address.';
      });
      return;
    }

    setState(() {
      isLoading = true;
      errorMessage = '';
    });

    try {
      final response = await ApiService.postJson(
        '$baseUrl/api/password/reset',
        {
          'email': emailController.text.trim(),
        },
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => NewPasswordScreen(
              email: emailController.text.trim(),
            ),
          ),
        );
      } else {
        setState(() {
          errorMessage =
              'Unable to send reset code. Please try again.';
        });
      }
    } catch (e) {
      if (!mounted) return;

      setState(() {
        errorMessage =
            'Something went wrong. Please try again.';
      });

      debugPrint('Password reset error: $e');
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

            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [

                const Icon(
                  Icons.lock_reset,
                  size: 85,
                  color: Color.fromARGB(255, 53, 94, 59),
                ),

                const SizedBox(height: 25),

                const Text(
                  'Forgot Your Password?',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: Color.fromARGB(255, 27, 51, 62),
                  ),
                ),

                const SizedBox(height: 15),

                const Text(
                  'Enter the email address associated with '
                  'your account. We will send you a '
                  'verification code to reset your password.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    color: Color.fromARGB(255, 27, 51, 62),
                  ),
                ),

                const SizedBox(height: 35),

                // Email input
                TextFormField(
                  controller: emailController,
                  keyboardType: TextInputType.emailAddress,

                  decoration: InputDecoration(
                    hintText: 'Enter your email',
                    prefixIcon: const Icon(Icons.email_outlined),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(6),
                    ),

                    contentPadding:
                        const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                  ),
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

                // Send reset code button
                SizedBox(
                  height: 48,
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed:
                        isLoading ? null : sendResetCode,

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
                            'Send Verification Code',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                ),

                const SizedBox(height: 20),

                // Return to login
                TextButton(
                  onPressed: () {
                    Navigator.pop(context);
                  },
                  child: const Text(
                    'Back to Login',
                    style: TextStyle(
                      color: Color.fromARGB(255, 53, 94, 59),
                      fontSize: 15,
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
    );
  }
}
