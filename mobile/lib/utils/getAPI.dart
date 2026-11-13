import 'package:http/http.dart' as http;
import 'dart:convert';
import 'GlobalData.dart';

class ApiService {
  static Future<http.Response> getJson(
      String url, {
        bool authenticated = false,
      }) async {
    Map<String, String> headers = {
      "Accept": "application/json",
    };

    if (authenticated) {
      headers["Authorization"] = "Bearer ${GlobalData.token}";
    }

    return await http.get(
      Uri.parse(url),
      headers: headers,
    );
  }
  static Future<http.Response> postJson(
      String url,
      Map<String, dynamic> outgoing, {
        bool authenticated = false,
      }) async {

    Map<String, String> headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
    };

    if (authenticated) {
      headers['Authorization'] = 'Bearer ${GlobalData.token}';
    }
    return await http.post(
      Uri.parse(url),
      body: jsonEncode(outgoing),
      headers: headers,
    );
  }

}