import 'dart:convert';
import 'package:flutter/material.dart';
import '../utils/GlobalData.dart';
import '../utils/getAPI.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {

  static const String baseUrl = 'https://predictionmarketucf.site';

  final TextEditingController searchController = TextEditingController();
  final List<String> categories = [
    'All',
    'Sports',
    'Politics',
    'Tech',
    'Entertainment',
    'Campus',
    'Other',
  ];

  String selectedCategory = 'All';
  String selectedSection = 'Open Markets';
  String selectedBetFilter = 'Active';
  String selectedMarketFilter = 'Active';

  List<Map<String, dynamic>> questions = [];

  bool isLoading = true;
  String errorMessage = '';

  @override
  void initState() {
    super.initState();
    loadQuestions();
  }

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  Future<void> loadQuestions() async {
    setState(() {
      isLoading = true;
      errorMessage = '';
    });

    try {
      Map<String, String> parameters = {
        'status': 'open',
        'sort': 'newest',
        'page': '1',
        'limit': '20',
      };

      if (searchController.text
          .trim()
          .isNotEmpty) {
        parameters['q'] = searchController.text.trim();
      }

      if (selectedCategory != 'All') {
        parameters['category'] = selectedCategory.toLowerCase();
      }

      final uri = Uri.parse('$baseUrl/api/questions')
          .replace(queryParameters: parameters);

      final response = await ApiService.getJson(uri.toString());

      if (response.statusCode != 200) {
        throw Exception('Failed to load markets: ${response.statusCode}');
      }

      final Map<String, dynamic> decoded =
      Map<String, dynamic>.from(jsonDecode(response.body));
      final List<dynamic> questionList = decoded['results'] ?? [];

      if (!mounted) return;
      setState(() {
        questions = questionList.whereType<Map>().map((item) =>
        Map<String, dynamic>.from(item)).toList();
        isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        errorMessage = 'Unable to load markets. Please try again.';
        isLoading = false;
      });
      debugPrint('HomeScreen error: $e');
    }
  }

  String closingTimes(dynamic value) {
    if (value == null) return 'Unknown';

    try {
      final date = DateTime.parse(value.toString()).toLocal();
      return '${date.month}/${date.day}/${date.year}';
    } catch (e) {
      return 'Unknown';
    }
  }

  Widget buildNavigation() {
    final sections = ['Open Markets', 'My Bets', 'My Markets'];

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: sections.map((section) {
          final isSelected = selectedSection == section;

          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: ChoiceChip(
                label: Text(section),
                selected: isSelected,
                showCheckmark: false,
                onSelected: (_) {
                  setState(() {
                    selectedSection = section;
                  });
                },
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget historyFilters({
    required String selectedFilter,
    required Function(String) onSelected,
  }) {
    return Row(
      children: ['Active', 'History'].map((filter) {
        return Padding(
          padding: const EdgeInsets.only(right: 8),
          child: ChoiceChip(
            label: Text(filter),
            selected: selectedFilter == filter,
            onSelected: (_) {
              onSelected(filter);
            },
          ),
        );
      }).toList(),
    );
  }

  Widget buildMarketSection() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Welcome, ${GlobalData.displayName.isNotEmpty ? GlobalData
                    .displayName : 'User'}!',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 16),

              // Search bar
              TextField(
                controller: searchController,
                decoration: InputDecoration(
                  hintText: 'Search markets...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () {
                      searchController.clear();
                      loadQuestions();
                    },
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onSubmitted: (_) => loadQuestions(),
              ),

              const SizedBox(height: 12),

              // Category filters
              categoryFilters(),

              const SizedBox(height: 16),

              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Open Markets',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),

              const SizedBox(height: 13),
            ],
          ),
        ),

        // Market feed
        Expanded(
          child: isLoading
              ? const Center(
            child: CircularProgressIndicator(),
          )
              : errorMessage.isNotEmpty
              ? Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(errorMessage),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: loadQuestions,
                  child: const Text('Retry'),
                ),
              ],
            ),
          )
              : questions.isEmpty
              ? const Center(
            child: Text('No markets found.'),
          )
              : RefreshIndicator(
            onRefresh: loadQuestions,
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
              ),
              itemCount: questions.length,
              itemBuilder: (context, index) {
                return buildMarket(questions[index]);
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget categoryFilters() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: categories.map((category) {
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(category),
              selected: selectedCategory == category,
              onSelected: (_) {
                setState(() {
                  selectedCategory = category;
                });
                loadQuestions();
              },
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget buildMarket(Map<String, dynamic> question) {
    final title = question['title'] ?? 'Untitled Market';
    final description = question['description'] ?? '';
    final category = question['category'] ?? 'Other';

    final poolYes = question['poolYes'] ?? 0;
    final poolNo = question['poolNo'] ?? 0;
    final totalPool = question['totalPool'] ?? (poolYes + poolNo);

    final closesAt = closingTimes(question['closesAt']);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              category.toString().toUpperCase(),
              style: TextStyle(
                color: Theme
                    .of(context)
                    .colorScheme
                    .primary,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),

            const SizedBox(height: 8),

            Text(
              title.toString(),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),

            if (description
                .toString()
                .isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(description.toString()),
            ],

            const SizedBox(height: 16),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _poolIndicator(
                  'YES',
                  poolYes,
                  Colors.green,
                ),
                _poolIndicator(
                  'NO',
                  poolNo,
                  Colors.red,
                ),
              ],
            ),

            const SizedBox(height: 12),

            Text(
              'Total pool: $totalPool coins',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
              ),
            ),

            const SizedBox(height: 6),

            Text(
              'Wagering closes: $closesAt',
              style: const TextStyle(
                color: Colors.grey,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Yes / No bars
  Widget _poolIndicator(String label, dynamic amount, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 8,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        '$label: $amount coins',
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  // My bets
  Widget buildMyBets() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'My Bets',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),

          historyFilters(
            selectedFilter: selectedBetFilter,
            onSelected: (filter) {
              setState(() {
                selectedBetFilter = filter;
              });
            },
          ),
          const SizedBox(height: 20),

          // Placeholder table headings
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              columns: const [
                DataColumn(label: Text('Question')),
                DataColumn(label: Text('Your prediction')),
                DataColumn(label: Text('Coins wagered')),
                DataColumn(label: Text('Wagering closes')),
                DataColumn(label: Text('Market status')),
              ],
              rows: const [],
            ),
          ),
          const SizedBox(height: 24),

          Center(
            child: Column(
              children: [
                const Icon(
                  Icons.receipt_long_outlined,
                  size: 48,
                  color: Colors.grey,
                ),
                const SizedBox(height: 12),

                Text(
                  selectedBetFilter == 'Active'
                      ? 'You have no active bets yet.'
                      : 'You have no betting history yet.',
                  style: const TextStyle(
                    fontSize: 16,
                    color: Colors.grey,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 6),

                const Text(
                  'Your wagers would appear here, if you had some...',
                  style: TextStyle(
                    color: Colors.grey,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // My Markets
  Widget buildMyMarkets() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'My Markets',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Color.fromARGB(255, 27, 51, 62),
            ),
          ),

          const SizedBox(height: 12),

          historyFilters(
            selectedFilter: selectedMarketFilter,
            onSelected: (filter) {
              setState(() {
                selectedMarketFilter = filter;
              });
            },
          ),

          const SizedBox(height: 20),

          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              columns: const [
                DataColumn(label: Text('Question')),
                DataColumn(label: Text('Wagering closes')),
                DataColumn(label: Text('Market status')),
              ],
              rows: const [],
            ),
          ),

          const SizedBox(height: 24),

          Center(
            child: Column(
              children: [
                const Icon(
                  Icons.poll_outlined,
                  size: 48,
                  color: Colors.grey,
                ),

                const SizedBox(height: 12),

                Text(
                  selectedMarketFilter == 'Active'
                      ? 'You have no active markets.'
                      : 'You have no market history yet.',
                  style: const TextStyle(
                    fontSize: 16,
                    color: Colors.grey,
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 6),

                const Text(
                  'Markets you create will appear here.',
                  style: TextStyle(color: Colors.grey),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color.fromARGB(255, 245, 245, 245),

      appBar: AppBar(
        backgroundColor: const Color.fromARGB(255, 53, 94, 59),
        foregroundColor: Colors.white,
        title: const Text(
          'Prediction Market',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Row(
                children: [
                  const Icon(Icons.monetization_on),
                  const SizedBox(width: 5),
                  Text(
                    '${GlobalData.balance}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),

      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: buildNavigation(),
            ),
            Expanded(
              child: selectedSection == 'Open Markets'
                  ? buildMarketSection()
                  : selectedSection == 'My Bets'
                  ? SingleChildScrollView(child: buildMyBets(),)
                  : SingleChildScrollView(child: buildMyMarkets(),),
            ),
          ],
        ),
      ),
    );
  }
}
