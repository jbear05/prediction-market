import 'dart:convert';
import 'package:flutter/material.dart';
import '../utils/GlobalData.dart';
import '../utils/getAPI.dart';
import 'ResetPasswordScreen.dart';


class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const String baseUrl = 'https://predictionmarketucf.site';

  int selectedTab = 0;
  String selectedHomeSection = 'home';

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
  String selectedBetFilter = 'Active';
  String selectedMarketFilter = 'Current';
  String selectedSort = 'newest';

  List<Map<String, dynamic>> questions = [];
  List<Map<String, dynamic>> wagers = [];
  List<Map<String, dynamic>> myMarkets = [];

  bool isLoadingQuestions = true;
  bool isLoadingBets = true;
  bool isLoadingMarkets = true;
  bool isClaiming = false;
  bool claimEligible = true;

  String errorMessage = '';
  String nextClaimAt = '';

  int balance = GlobalData.balance;

  @override
  void initState() {
    super.initState();
    loadBalance();
    loadDailyClaimStatus();
    loadQuestions();
    loadMyBets();
    loadMyMarkets();
  }

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  // Converts an API response into a Map.
  Map<String, dynamic> decodeMap(String body) {
    return Map<String, dynamic>.from(jsonDecode(body));
  }

  // Converts a numeric API value into an integer.
  int toInt(dynamic value) {
    if (value is num) return value.toInt();
    return int.tryParse(value.toString()) ?? 0;
  }

  // Updates the balance using the backend.
  Future<void> loadBalance() async {
    try {
      final response = await ApiService.getJson(
        '$baseUrl/api/balance',
        authenticated: true,
      );

      if (response.statusCode == 200) {
        final data = decodeMap(response.body);
        final newBalance = toInt(data['balance']);

        if (!mounted) return;

        setState(() {
          balance = newBalance;
          GlobalData.balance = newBalance;
        });
      }
    } catch (e) {
      debugPrint('Balance error: $e');
    }
  }

  // Checks whether the user can claim daily coins.
  Future<void> loadDailyClaimStatus() async {
    try {
      final response = await ApiService.getJson(
        '$baseUrl/api/daily-claim',
        authenticated: true,
      );

      if (response.statusCode == 200) {
        final data = decodeMap(response.body);

        bool available = data['claimEligible'] == true;

        final next = data['nextClaimAt'];

        if (next != null) {
          final nextDate = DateTime.tryParse(next.toString());

          if (nextDate != null) {
            available = DateTime.now().isAfter(nextDate) ||
                DateTime.now().isAtSameMomentAs(nextDate);

            nextClaimAt = nextDate.toLocal().toString();
          }
        }

        if (!mounted) return;

        setState(() {
          claimEligible = available;
        });
      }
    } catch (e) {
      debugPrint('Daily claim status error: $e');
    }
  }

  // Claims daily coins.
  Future<void> claimDailyCoins() async {
    if (isClaiming || !claimEligible) return;

    setState(() {
      isClaiming = true;
    });

    try {
      final response = await ApiService.postJson(
        '$baseUrl/api/daily-claim',
        {},
        authenticated: true,
      );

      final data = decodeMap(response.body);

      if (response.statusCode == 200) {
        final updatedBalance = toInt(data['balance']);

        if (!mounted) return;

        setState(() {
          balance = updatedBalance;
          GlobalData.balance = updatedBalance;
          claimEligible = false;
          nextClaimAt = data['nextClaimAt']?.toString() ?? '';
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Daily coins claimed! Your balance is now $balance coins.',
            ),
          ),
        );
      } else {
        final message = data['message'] ??
            'Unable to claim daily coins.';

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message.toString())),
        );

        await loadDailyClaimStatus();
      }
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Something went wrong while claiming coins.'),
        ),
      );

      debugPrint('Daily claim error: $e');
    } finally {
      if (mounted) {
        setState(() {
          isClaiming = false;
        });
      }
    }
  }

  // Loads open markets for Browse Markets.
  Future<void> loadQuestions() async {
    setState(() {
      isLoadingQuestions = true;
      errorMessage = '';
    });

    try {
      Map<String, String> parameters = {
        'status': 'open',
        'sort': selectedSort,
        'page': '1',
        'limit': '50',
      };

      if (searchController.text.trim().isNotEmpty) {
        parameters['q'] = searchController.text.trim();
      }

      if (selectedCategory != 'All') {
        parameters['category'] = selectedCategory.toLowerCase();
      }

      final uri = Uri.parse('$baseUrl/api/questions')
          .replace(queryParameters: parameters);

      final response = await ApiService.getJson(uri.toString(),
      authenticated: true,
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to load markets');
      }

      final data = decodeMap(response.body);
      final List<dynamic> results = data['results'] ?? [];

      if (!mounted) return;

      setState(() {
        questions = results
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();

        isLoadingQuestions = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        errorMessage = 'Unable to load markets. Please try again.';
        isLoadingQuestions = false;
      });

      debugPrint('Questions error: $e');
    }
  }

  // Loads the logged-in user's wagers.
  Future<void> loadMyBets() async {
    setState(() {
      isLoadingBets = true;
    });

    try {
      final response = await ApiService.getJson(
        '$baseUrl/api/wagers',
        authenticated: true,
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to load wagers');
      }

      final dynamic decoded = jsonDecode(response.body);

      if (!mounted) return;

      setState(() {
        wagers = (decoded as List)
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();

        isLoadingBets = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        isLoadingBets = false;
      });

      debugPrint('My bets error: $e');
    }
  }

  // Loads markets created by the logged-in user.
  Future<void> loadMyMarkets() async {
    setState(() {
      isLoadingMarkets = true;
    });

    try {
      final uri = Uri.parse('$baseUrl/api/questions').replace(
        queryParameters: {
          'mine': 'true',
          'status': 'all',
          'sort': 'newest',
          'page': '1',
          'limit': '50',
        },
      );

      final response = await ApiService.getJson(
        uri.toString(),
        authenticated: true,
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to load your markets');
      }

      final data = decodeMap(response.body);
      final List<dynamic> results = data['results'] ?? [];

      if (!mounted) return;

      setState(() {
        myMarkets = results
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();

        isLoadingMarkets = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        isLoadingMarkets = false;
      });

      debugPrint('My markets error: $e');
    }
  }

  String formatDate(dynamic value) {
    if (value == null) return 'Unknown';

    try {
      final date = DateTime.parse(value.toString()).toLocal();

      return '${date.month}/${date.day}/${date.year}';
    } catch (e) {
      return 'Unknown';
    }
  }

  // HOME TAB

  Widget buildHome() {
    return RefreshIndicator(
      onRefresh: () async {
        await Future.wait([
          loadBalance(),
          loadDailyClaimStatus(),
          loadQuestions(),
          loadMyBets(),
          loadMyMarkets(),
        ]);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (selectedHomeSection == 'home') ...[
            const Text(
              'Home',
              style: TextStyle(
                fontSize: 30,
                fontWeight: FontWeight.bold,
                color: Color.fromARGB(255, 27, 51, 62),
              ),
            ),

            const SizedBox(height: 4),

            const Text(
              'Your coins, predictions, and created markets in one place.',
              style: TextStyle(color: Colors.grey),
            ),

            const SizedBox(height: 20),

            buildBalanceCard(),

            const SizedBox(height: 28),
          ],

          if (selectedHomeSection == 'bets' ||
              selectedHomeSection == 'home') ...[
            buildMyBets(),
            const SizedBox(height: 28),
          ],

          if (selectedHomeSection == 'markets' ||
              selectedHomeSection == 'home')
            buildMyMarkets(),
        ],
      ),
    );
  }

  Widget buildBalanceCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Balance',
            style: TextStyle(color: Colors.grey),
          ),

          const SizedBox(height: 4),

          Text(
            '$balance coins',
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Color.fromARGB(255, 27, 51, 62),
            ),
          ),

          const SizedBox(height: 4),

          const Text('Fictional currency only'),

          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            height: 46,
            child: ElevatedButton.icon(
              onPressed: claimEligible && !isClaiming
                  ? claimDailyCoins
                  : null,
              icon: isClaiming
                  ? const SizedBox(
                height: 18,
                width: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                ),
              )
                  : const Icon(Icons.card_giftcard),
              label: Text(
                isClaiming
                    ? 'Claiming...'
                    : claimEligible
                    ? 'Claim Daily Coins'
                    : 'Daily Coins Already Claimed',
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor:
                const Color.fromARGB(255, 53, 94, 59),
                foregroundColor: Colors.white,
              ),
            ),
          ),

          if (!claimEligible && nextClaimAt.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Next claim: ${formatDate(nextClaimAt)}',
              style: const TextStyle(
                fontSize: 12,
                color: Colors.grey,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget historyFilters({
    required List<String> filters,
    required String selectedFilter,
    required Function(String) onSelected,
  }) {
    return Row(
      children: filters.map((filter) {
        final selected = selectedFilter == filter;

        return Padding(
          padding: const EdgeInsets.only(right: 8),
          child: ChoiceChip(
            label: Text(filter),
            selected: selected,
            showCheckmark: false,
            onSelected: (_) => onSelected(filter),
            selectedColor: const Color.fromARGB(255, 53, 94, 59),
            labelStyle: TextStyle(
              color: selected ? Colors.white : Colors.black,
              fontWeight: FontWeight.w600,
            ),
          ),
        );
      }).toList(),
    );
  }

  // MY BETS

  Widget buildMyBets() {
    final filteredBets = wagers.where((wager) {
      final question = wager['question'];

      if (question is! Map) return false;

      final status = question['status']?.toString();

      if (selectedBetFilter == 'Active') {
        return status == 'open';
      }

      return status != 'open';
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'My Bets',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: Color.fromARGB(255, 27, 51, 62),
          ),
        ),

        const SizedBox(height: 12),

        historyFilters(
          filters: const ['Active', 'History'],
          selectedFilter: selectedBetFilter,
          onSelected: (filter) {
            setState(() {
              selectedBetFilter = filter;
            });
          },
        ),

        const SizedBox(height: 14),

        if (isLoadingBets)
          const Center(child: CircularProgressIndicator())
        else if (filteredBets.isEmpty)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Text(
                'No bets found.',
                style: TextStyle(color: Colors.grey),
              ),
            ),
          )
        else
          ...filteredBets.map((wager) {
            final question = Map<String, dynamic>.from(
              wager['question'],
            );

            return Card(
              color: Colors.white,
              margin: const EdgeInsets.only(bottom: 10),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      question['title'] ?? 'Unknown question',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),

                    const SizedBox(height: 10),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Prediction: ${wager['side'].toString().toUpperCase()}',
                          style: TextStyle(
                            color: wager['side'] == 'yes'
                                ? Colors.green
                                : Colors.red,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text('${wager['amount']} coins'),
                      ],
                    ),

                    const SizedBox(height: 6),

                    Text(
                      'Closes: ${formatDate(question['closesAt'])}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.grey,
                      ),
                    ),

                    if (wager['payout'] != null)
                      Text('Payout: ${wager['payout']} coins'),

                    Text(
                      'Status: ${question['status']}',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  // MY MARKETS

  Widget buildMyMarkets() {
    final filteredMarkets = myMarkets.where((market) {
      final status = market['status']?.toString();

      if (selectedMarketFilter == 'Current') {
        return status == 'pending' || status == 'open';
      }

      return status == 'rejected' ||
          status == 'closed' ||
          status == 'resolved' ||
          status == 'cancelled';
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'My Markets',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Color.fromARGB(255, 27, 51, 62),
              ),
            ),

            ElevatedButton.icon(
              onPressed: showCreateMarketDialog,
              icon: const Icon(Icons.add),
              label: const Text('Create Market'),
              style: ElevatedButton.styleFrom(
                backgroundColor:
                const Color.fromARGB(255, 53, 94, 59),
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),

        const SizedBox(height: 12),

        historyFilters(
          filters: const ['Current', 'History'],
          selectedFilter: selectedMarketFilter,
          onSelected: (filter) {
            setState(() {
              selectedMarketFilter = filter;
            });
          },
        ),

        const SizedBox(height: 14),

        if (isLoadingMarkets)
          const Center(child: CircularProgressIndicator())
        else if (filteredMarkets.isEmpty)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Text(
                'No markets found.',
                style: TextStyle(color: Colors.grey),
              ),
            ),
          )
        else
          ...filteredMarkets.map((market) {
            return Card(
              color: Colors.white,
              margin: const EdgeInsets.only(bottom: 10),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      market['title'] ?? 'Untitled market',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),

                    const SizedBox(height: 8),

                    Text(
                      'Closes: ${formatDate(market['closesAt'])}',
                    ),

                    const SizedBox(height: 5),

                    Text(
                      'Status: ${market['status']}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  // CREATE MARKET

  Future<void> showCreateMarketDialog() async {
    final titleController = TextEditingController();
    final descriptionController = TextEditingController();

    String category = 'other';
    DateTime? closingDate;

    await showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, updateDialog) {
            return AlertDialog(
              title: const Text('Create Market'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: titleController,
                      maxLength: 150,
                      decoration: const InputDecoration(
                        labelText: 'Question',
                        hintText: 'Will UCF win its next game?',
                      ),
                    ),

                    TextField(
                      controller: descriptionController,
                      maxLength: 2000,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Description / Resolution Criteria',
                      ),
                    ),

                    const SizedBox(height: 12),

                    DropdownButtonFormField<String>(
                      initialValue: category,
                      decoration: const InputDecoration(
                        labelText: 'Category',
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'sports',
                          child: Text('Sports'),
                        ),
                        DropdownMenuItem(
                          value: 'politics',
                          child: Text('Politics'),
                        ),
                        DropdownMenuItem(
                          value: 'tech',
                          child: Text('Tech'),
                        ),
                        DropdownMenuItem(
                          value: 'entertainment',
                          child: Text('Entertainment'),
                        ),
                        DropdownMenuItem(
                          value: 'campus',
                          child: Text('Campus'),
                        ),
                        DropdownMenuItem(
                          value: 'other',
                          child: Text('Other'),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          updateDialog(() {
                            category = value;
                          });
                        }
                      },
                    ),

                    const SizedBox(height: 16),

                    OutlinedButton.icon(
                      onPressed: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate: DateTime.now().add(
                            const Duration(days: 1),
                          ),
                          firstDate: DateTime.now().add(
                            const Duration(minutes: 1),
                          ),
                          lastDate: DateTime.now().add(
                            const Duration(days: 3650),
                          ),
                        );

                        if (date == null) return;

                        final time = await showTimePicker(
                          context: context,
                          initialTime: TimeOfDay.now(),
                        );

                        if (time == null) return;

                        updateDialog(() {
                          closingDate = DateTime(
                            date.year,
                            date.month,
                            date.day,
                            time.hour,
                            time.minute,
                          );
                        });
                      },
                      icon: const Icon(Icons.calendar_month),
                      label: Text(
                        closingDate == null
                            ? 'Choose closing date'
                            : closingDate.toString(),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    if (titleController.text.trim().isEmpty ||
                        descriptionController.text.trim().isEmpty ||
                        closingDate == null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Please complete all fields and choose a closing date.',
                          ),
                        ),
                      );
                      return;
                    }

                    if (!closingDate!.isAfter(DateTime.now())) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'The closing date must be in the future.',
                          ),
                        ),
                      );
                      return;
                    }

                    final response = await ApiService.postJson(
                      '$baseUrl/api/questions',
                      {
                        'title': titleController.text.trim(),
                        'description': descriptionController.text.trim(),
                        'category': category,
                        'closesAt': closingDate!.toUtc().toIso8601String(),
                      },
                      authenticated: true,
                    );

                    if (!mounted) return;

                    if (response.statusCode == 201) {
                      Navigator.pop(dialogContext);

                      await loadMyMarkets();

                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Market submitted! It will appear as pending until reviewed.',
                          ),
                        ),
                      );
                    } else {
                      String message = 'Unable to create market.';

                      try {
                        message = decodeMap(response.body)['message'] ??
                            message;
                      } catch (_) {}

                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(message)),
                      );
                    }
                  },
                  child: const Text('Submit Market'),
                ),
              ],
            );
          },
        );
      },
    );

    titleController.dispose();
    descriptionController.dispose();
  }
 // Yes / No buttons

  Future<void> showWagerDialog(
      Map<String, dynamic> question,
      String side,
      ) async {
    final int? amount = await showDialog<int>(
      context: context,
      builder: (dialogContext) {
        return WagerDialog(
          marketTitle: (question['title'] ?? 'Market').toString(),
          side: side,
          balance: balance,
        );
      },
    );

    if (!mounted || amount == null) return;

    await placeWager(question, side, amount);
  }


  Future<void> placeWager(
      Map<String, dynamic> question,
      String side,
      int amount,
      ) async {
    try {
      final questionId = question['_id'];

      if (questionId == null) {
        throw Exception('Market ID is missing.');
      }

      final response = await ApiService.postJson(
        '$baseUrl/api/questions/$questionId/place-wager',
        {
          'side': side,
          'amount': amount,
        },
        authenticated: true,
      );

      final data = decodeMap(response.body);

      if (response.statusCode == 200 ||
          response.statusCode == 201) {
        if (!mounted) return;

        final updatedBalance = toInt(data['balance']);

        setState(() {
          balance = updatedBalance;
          GlobalData.balance = updatedBalance;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Successfully placed $amount coins on ${side.toUpperCase()}!',
            ),
          ),
        );

        // Refresh the information after placing the wager.
        await Future.wait([
          loadBalance(),
          loadQuestions(),
          loadMyBets(),
        ]);
      } else {
        final message = data['message'] ??
            'Unable to place your bet.';

        if (!mounted) return;

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message.toString()),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;

      debugPrint('Place wager error: $e');

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Something went wrong while placing your bet.'),
        ),
      );
    }
  }

  // BROWSE MARKETS TAB

  Widget buildBrowseMarkets() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Browse Markets',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),

              const Text(
                'Find a question. Choose a side. Use fictional coins.',
                style: TextStyle(color: Colors.grey),
              ),

              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: selectedSort,
                decoration: InputDecoration(
                  labelText: 'Sort by',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                items: const [
                  DropdownMenuItem(
                    value: 'newest',
                    child: Text('Newest'),
                  ),
                  DropdownMenuItem(
                    value: 'popular',
                    child: Text('Most Popular'),
                  ),
                  DropdownMenuItem(
                    value: 'closing',
                    child: Text('Closing Soon'),
                  ),
                ],
                onChanged: (value) {
                  if (value == null) return;

                  setState(() {
                    selectedSort = value;
                  });

                  loadQuestions();
                },
              ),

              const SizedBox(height: 12),

              TextField(
                controller: searchController,
                decoration: InputDecoration(
                  hintText: 'Search titles or descriptions',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () {
                      searchController.clear();
                      loadQuestions();
                    },
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                onSubmitted: (_) => loadQuestions(),
              ),


              const SizedBox(height: 12),

              SingleChildScrollView(
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
              ),
            ],
          ),
        ),

        Expanded(
          child: isLoadingQuestions
              ? const Center(child: CircularProgressIndicator())
              : errorMessage.isNotEmpty
              ? Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(errorMessage),
                ElevatedButton(
                  onPressed: loadQuestions,
                  child: const Text('Retry'),
                ),
              ],
            ),
          )
              : questions.isEmpty
              ? const Center(child: Text('No markets found.'))
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

  Widget buildMarket(Map<String, dynamic> question) {
    final poolYes = toInt(question['poolYes']);
    final poolNo = toInt(question['poolNo']);

    return Card(
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              (question['category'] ?? 'other').toString().toUpperCase(),
              style: const TextStyle(
                color: Color.fromARGB(255, 53, 94, 59),
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),

            const SizedBox(height: 8),

            Text(
              question['title'] ?? 'Untitled Market',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 8),

            Text(question['description'] ?? ''),

            const SizedBox(height: 14),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('YES: $poolYes coins'),
                Text('NO: $poolNo coins'),
              ],
            ),

            const SizedBox(height: 8),

            Text(
              'Total pool: ${toInt(question['totalPool'])} coins',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),

            const SizedBox(height: 6),

            Text(
              'Closes: ${formatDate(question['closesAt'])}',
              style: const TextStyle(
                fontSize: 12,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      showWagerDialog(question, 'yes');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color.fromARGB(255, 53, 94, 59),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(6)
                      )
                    ),
                    child: const Text(
                      'YES',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),

                const SizedBox(width: 10),

                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      showWagerDialog(question, 'no');
                    },
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color.fromARGB(255, 53, 94, 59),
                      side: const BorderSide(
                        color: Color.fromARGB(255, 53, 94, 59),
                        width: 1.5,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    child: const Text(
                      'NO',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ACCOUNT TAB

  Widget buildAccount() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'Account',
          style: TextStyle(
            fontSize: 30,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),

        const Text(
          'Manage your account.',
          style: TextStyle(color: Colors.grey),
        ),

        const SizedBox(height: 20),

        Card(
          color: Colors.white,
          child: ListTile(
            leading: const Icon(Icons.person),
            title: Text(
              GlobalData.displayName.isEmpty
                  ? 'My Account'
                  : GlobalData.displayName,
            ),
            subtitle: Text(GlobalData.email),
          ),
        ),

        const SizedBox(height: 16),

        ListTile(
          leading: const Icon(Icons.receipt_long),
          title: const Text('View My Bets'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () {
            setState(() {
              selectedTab = 0;
              selectedHomeSection = 'bets';
              selectedBetFilter = 'Active';
            });
            loadMyBets();
          },
        ),

        ListTile(
          leading: const Icon(Icons.poll_outlined),
          title: const Text('View My Markets'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () {
            setState(() {
              selectedTab = 0;
              selectedHomeSection = 'markets';
              selectedMarketFilter = 'Current';
            });
            loadMyMarkets();
          },
        ),

        const Divider(),

        ListTile(
          leading: const Icon(Icons.lock_reset),
          title: const Text('Reset Password'),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const ResetPasswordScreen(),
              ),
            );
          },
        ),

        const SizedBox(height: 24),

        SizedBox(
          height: 48,
          child: ElevatedButton.icon(
            onPressed: () {
              GlobalData.userId = '';
              GlobalData.email = '';
              GlobalData.displayName = '';
              GlobalData.token = '';
              GlobalData.balance = 0;

              Navigator.pushNamedAndRemoveUntil(
                context,
                '/login',
                    (route) => false,
              );
            },
            icon: const Icon(Icons.logout),
            label: const Text('Log Out'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade700,
              foregroundColor: Colors.white,
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      buildHome(),
      buildBrowseMarkets(),
      buildAccount(),
    ];

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
                    '$balance',
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
        child: IndexedStack(
          index: selectedTab,
          children: pages,
        ),
      ),

      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedTab,
        onDestinationSelected: (index) {
          setState(() {
            selectedTab = index;

            if (index == 0) {
              selectedHomeSection = 'home';
            }
          });

          if (index == 1) {
            loadQuestions();
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.search),
            label: 'Browse Markets',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Account',
          ),
        ],
      ),
    );
  }
}

class WagerDialog extends StatefulWidget {
  final String marketTitle;
  final String side;
  final int balance;

  const WagerDialog({
    super.key,
    required this.marketTitle,
    required this.side,
    required this.balance,
  });

  @override
  State<WagerDialog> createState() => _WagerDialogState();
}

class _WagerDialogState extends State<WagerDialog> {
  final TextEditingController amountController =
  TextEditingController();

  final GlobalKey<FormState> formKey =
  GlobalKey<FormState>();

  @override
  void dispose() {
    amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      scrollable: true,
      title: Text('Bet ${widget.side.toUpperCase()}'),
      content: Form(
        key: formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.marketTitle),

            const SizedBox(height: 12),

            Text('Your balance: ${widget.balance} coins'),

            const SizedBox(height: 12),

            TextFormField(
              controller: amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Amount of coins',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter an amount.';
                }

                final enteredAmount =
                int.tryParse(value.trim());

                if (enteredAmount == null || enteredAmount < 1) {
                  return 'Enter a valid amount.';
                }

                if (enteredAmount > widget.balance) {
                  return 'You do not have enough coins.';
                }

                return null;
              },
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () {
            Navigator.pop(context);
          },
          child: const Text('Cancel'),
        ),

        ElevatedButton(
          onPressed: () {
            if (formKey.currentState!.validate()) {
              final amount = int.parse(
                amountController.text.trim(),
              );

              Navigator.pop(context, amount);
            }
          },
          child: const Text('Place Bet'),
        ),
      ],
    );
  }
}

