
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../utils/getAPI.dart';

class VerifyEmailScreen extends StatefulWidget {
  final String email;

  const VerifyEmailScreen({
    super.key,
    required this.email,
  });

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  static const String baseUrl = 'https://predictionmarketucf.site';

  final TextEditingController codeController = TextEditingController();

  bool isLoading = false;
  bool isResending = false;
  String errorMessage = '';

  @override
  void dispose() {
    codeController.dispose();
    super.dispose();
  }

  // Verify the 6-digit email code
  Future<void> verifyCode() async {
    if (codeController.text.length != 6) {
      setState(() {
        errorMessage = 'Please enter the 6-digit verification code.';
      });
      return;
    }

    setState(() {
      isLoading = true;
      errorMessage = '';
    });

    try {
      final response = await ApiService.postJson(
        '$baseUrl/api/verify',
        {
          'email': widget.email,
          'authCode': codeController.text.trim(),
        },
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Email successfully verified!'),
          ),
        );

        Navigator.pushNamedAndRemoveUntil(
          context,
          '/login',
              (route) => false,
        );
      } else {
        final decoded = jsonDecode(response.body);

        setState(() {
          errorMessage = decoded['message'] ??
              'Verification failed. Please try again.';
        });
      }
    } catch (e) {
      if (!mounted) return;

      setState(() {
        errorMessage = 'Unable to verify your email. Please try again.';
      });

      debugPrint('Verification error: $e');
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
    }
  }

  // Request another verification code
  Future<void> resendCode() async {
    setState(() {
      isResending = true;
      errorMessage = '';
    });

    try {
      final response = await ApiService.postJson(
        '$baseUrl/api/verify/resend',
        {
          'email': widget.email,
        },
      );

      if (!mounted) return;

      if (response.statusCode >= 200 &&
          response.statusCode < 300) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('A new verification code has been sent.'),
          ),
        );
      } else {
        final decoded = jsonDecode(response.body);

        setState(() {
          errorMessage = decoded['message'] ??
              'Unable to resend the verification code.';
        });
      }
    } catch (e) {
      if (!mounted) return;

      setState(() {
        errorMessage = 'Unable to resend the code. Please try again.';
      });

      debugPrint('Resend code error: $e');
    } finally {
      if (mounted) {
        setState(() {
          isResending = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color.fromARGB(255, 245, 245, 245),

      appBar: AppBar(
        backgroundColor: const Color.fromARGB(255, 53, 94, 59),
        foregroundColor: Colors.white,
        title: const Text(
          'Email Verification',
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
                  Icons.mark_email_read_outlined,
                  size: 85,
                  color: Color.fromARGB(255, 53, 94, 59),
                ),

                const SizedBox(height: 25),

                const Text(
                  'Verify Your Email',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: Color.fromARGB(255, 27, 51, 62),
                  ),
                ),

                const SizedBox(height: 15),

                const Text(
                  'We sent a 6-digit verification code to:',
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

                const SizedBox(height: 35),

                // Verification code input
                TextFormField(
                  controller: codeController,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  maxLength: 6,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                  ],

                  style: const TextStyle(
                    fontSize: 24,
                    letterSpacing: 12,
                    fontWeight: FontWeight.bold,
                  ),

                  decoration: InputDecoration(
                    hintText: '000000',
                    counterText: '',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(6),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 15,
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

                const SizedBox(height: 25),

                // Verify button
                SizedBox(
                  height: 48,
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: isLoading ? null : verifyCode,
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
                      'Verify Email',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 15),

                // Resend code button
                TextButton(
                  onPressed: isResending ? null : resendCode,
                  child: isResending
                      ? const CircularProgressIndicator()
                      : const Text(
                    'Resend Verification Code',
                    style: TextStyle(
                      color: Color.fromARGB(255, 53, 94, 59),
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
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
