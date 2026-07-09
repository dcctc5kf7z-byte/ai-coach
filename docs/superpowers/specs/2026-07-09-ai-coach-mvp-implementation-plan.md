# AI成长教练 MVP 实现计划

> 基于设计文档：[2026-07-09-ai-coach-mvp-design.md](2026-07-09-ai-coach-mvp-design.md)  
> 日期：2026-07-09  
> 预估总工期：29天

---

## 前置准备（开始前完成）

### P0.1 Apple开发者账号注册
- **操作**：访问 https://developer.apple.com/programs/enroll/
- **费用**：$99/年
- **时间**：审核需1-2周，**立即开始**
- **产出**：获得开发者账号，可访问App Store Connect

### P0.2 Supabase项目创建
- **操作**：访问 https://supabase.com，注册并创建项目
- **选择**：新加坡节点（离国内近，海外用户访问也快）
- **产出**：获得 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`

### P0.3 DeepSeek API申请
- **操作**：访问 https://platform.deepseek.com，注册并充值
- **费用**：预充$10即可
- **产出**：获得 `DEEPSEEK_API_KEY`

### P0.4 Notion页面创建
- **操作**：创建两个公开页面
  - 隐私政策（Privacy Policy）
  - 服务条款（Terms of Service）
- **产出**：两个公开URL

### P0.5 开发环境配置
```bash
# 安装Flutter SDK
# https://docs.flutter.dev/get-started/install

# 安装Xcode（Mac必须）
# 从App Store安装

# 安装CocoaPods
sudo gem install cocoapods

# 验证环境
flutter doctor
```

---

## Phase 1：项目初始化（第1-3天）

### T1.1 创建Flutter项目
```bash
flutter create --org com.yourcompany ai_coach
cd ai_coach
```

**产出**：基础Flutter项目结构

### T1.2 配置项目依赖

在 `pubspec.yaml` 中添加：

```yaml
dependencies:
  flutter:
    sdk: flutter
  # Supabase
  supabase_flutter: ^2.0.0
  # 状态管理
  provider: ^6.1.0
  # 路由
  go_router: ^14.0.0
  # 本地存储
  shared_preferences: ^2.2.0
  # HTTP请求（备用）
  http: ^1.1.0
  # Apple IAP
  in_app_purchase: ^3.2.0
  # 加载动画
  flutter_spinkit: ^5.2.0
```

**产出**：依赖配置完成

### T1.3 初始化Supabase连接

创建 `lib/config/supabase_config.dart`：

```dart
class SupabaseConfig {
  static const String supabaseUrl = 'YOUR_SUPABASE_URL';
  static const String supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
}
```

在 `main.dart` 中初始化：

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: SupabaseConfig.supabaseUrl,
    anonKey: SupabaseConfig.supabaseAnonKey,
  );
  
  runApp(const MyApp());
}
```

**产出**：Supabase连接就绪

### T1.4 配置应用基本信息

修改 `ios/Runner/Info.plist`：

```xml
<key>CFBundleDisplayName</key>
<string>AI Coach</string>
<key>CFBundleIdentifier</key>
<string>com.yourcompany.aicoach</string>
```

**产出**：App名称和Bundle ID配置完成

### T1.5 创建项目目录结构

```
lib/
├── config/           # 配置文件
├── models/           # 数据模型
├── services/         # 服务层（Supabase、AI、支付）
├── providers/        # 状态管理
├── screens/          # 页面
├── widgets/          # 可复用组件
└── utils/            # 工具函数
```

**产出**：目录结构创建完成

---

## Phase 2：注册/登录 + GDPR（第4-5天）

### T2.1 创建数据模型

创建 `lib/models/user_model.dart`：

```dart
class UserModel {
  final String id;
  final String email;
  final String subscriptionStatus; // trial, free, pro
  final bool gdprConsent;
  final DateTime? trialExpiresAt;
  final DateTime? deletedAt;

  UserModel({
    required this.id,
    required this.email,
    this.subscriptionStatus = 'trial',
    this.gdprConsent = false,
    this.trialExpiresAt,
    this.deletedAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      email: json['email'],
      subscriptionStatus: json['subscription_status'] ?? 'trial',
      gdprConsent: json['gdpr_consent'] ?? false,
      trialExpiresAt: json['trial_expires_at'] != null 
          ? DateTime.parse(json['trial_expires_at']) 
          : null,
      deletedAt: json['deleted_at'] != null 
          ? DateTime.parse(json['deleted_at']) 
          : null,
    );
  }
}
```

**产出**：UserModel

### T2.2 创建认证服务

创建 `lib/services/auth_service.dart`：

```dart
class AuthService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // 邮箱注册
  Future<AuthResponse> signUp({
    required String email,
    required String password,
  }) async {
    return await _supabase.auth.signUp(
      email: email,
      password: password,
    );
  }

  // 邮箱登录
  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    return await _supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  // 登出
  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }

  // 获取当前用户
  User? get currentUser => _supabase.auth.currentUser;

  // 监听认证状态
  Stream<AuthState> get authStateChanges => 
      _supabase.auth.onAuthStateChange;
}
```

**产出**：AuthService

### T2.3 创建GDPR同意弹窗

创建 `lib/widgets/gdpr_consent_dialog.dart`：

```dart
class GdprConsentDialog extends StatelessWidget {
  final VoidCallback onAccept;
  final VoidCallback onDecline;

  const GdprConsentDialog({
    required this.onAccept,
    required this.onDecline,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Privacy & Terms'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'By continuing, you agree to our Privacy Policy and Terms of Service.',
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TextButton(
                onPressed: () => _launchUrl('YOUR_PRIVACY_POLICY_URL'),
                child: const Text('Privacy Policy'),
              ),
              const Text(' | '),
              TextButton(
                onPressed: () => _launchUrl('YOUR_TERMS_URL'),
                child: const Text('Terms of Service'),
              ),
            ],
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: onDecline,
          child: const Text('Decline'),
        ),
        ElevatedButton(
          onPressed: onAccept,
          child: const Text('Accept'),
        ),
      ],
    );
  }
}
```

**产出**：GDPR弹窗组件

### T2.4 创建登录页面

创建 `lib/screens/login_screen.dart`：

```dart
class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _authService = AuthService();
  bool _isLoading = false;
  bool _isSignUp = false;

  Future<void> _handleSubmit() async {
    setState(() => _isLoading = true);
    
    try {
      if (_isSignUp) {
        // 注册
        await _authService.signUp(
          email: _emailController.text,
          password: _passwordController.text,
        );
        // 显示GDPR弹窗
        _showGdprDialog();
      } else {
        // 登录
        await _authService.signIn(
          email: _emailController.text,
          password: _passwordController.text,
        );
        // 导航到主页
        context.go('/home');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'AI Coach',
              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 32),
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: 'Email',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _passwordController,
              decoration: const InputDecoration(
                labelText: 'Password',
                border: OutlineInputBorder(),
              ),
              obscureText: true,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _handleSubmit,
                child: _isLoading
                    ? const CircularProgressIndicator()
                    : Text(_isSignUp ? 'Sign Up' : 'Sign In'),
              ),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () => setState(() => _isSignUp = !_isSignUp),
              child: Text(_isSignUp
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Sign Up"),
            ),
          ],
        ),
      ),
    );
  }
}
```

**产出**：登录/注册页面

### T2.5 创建用户服务（写入GDPR同意状态）

创建 `lib/services/user_service.dart`：

```dart
class UserService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // 创建用户记录
  Future<void> createUser({
    required String userId,
    required String email,
  }) async {
    await _supabase.from('users').insert({
      'id': userId,
      'email': email,
      'subscription_status': 'trial',
      'gdpr_consent': true,
      'consent_granted_at': DateTime.now().toIso8601String(),
      'trial_expires_at': DateTime.now().add(Duration(days: 3)).toIso8601String(),
    });
  }

  // 获取用户信息
  Future<UserModel?> getUser(String userId) async {
    final response = await _supabase
        .from('users')
        .select()
        .eq('id', userId)
        .maybeSingle();
    
    return response != null ? UserModel.fromJson(response) : null;
  }

  // 更新最后活跃时间
  Future<void> updateLastActive(String userId) async {
    await _supabase
        .from('users')
        .update({'last_active_at': DateTime.now().toIso8601String()})
        .eq('id', userId);
  }
}
```

**产出**：UserService

### T2.6 编写测试

创建 `test/services/auth_service_test.dart`：

```dart
void main() {
  group('AuthService', () {
    test('signUp should create new user', () async {
      // 测试注册逻辑
    });

    test('signIn should authenticate user', () async {
      // 测试登录逻辑
    });
  });
}
```

**产出**：认证服务测试

---

## Phase 3：目标设定 + AI诊断（第6-8天）

### T3.1 创建目标数据模型

创建 `lib/models/goal_model.dart`：

```dart
class GoalModel {
  final String id;
  final String userId;
  final String title;
  final String category; // career, health, finance, custom
  final String? description;
  final String status; // active, completed, paused
  final DateTime createdAt;

  GoalModel({
    required this.id,
    required this.userId,
    required this.title,
    required this.category,
    this.description,
    this.status = 'active',
    required this.createdAt,
  });

  factory GoalModel.fromJson(Map<String, dynamic> json) {
    return GoalModel(
      id: json['id'],
      userId: json['user_id'],
      title: json['title'],
      category: json['category'],
      description: json['description'],
      status: json['status'] ?? 'active',
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'title': title,
      'category': category,
      'description': description,
      'status': status,
    };
  }
}
```

**产出**：GoalModel

### T3.2 创建目标设定页面

创建 `lib/screens/goal_setup_screen.dart`：

```dart
class GoalSetupScreen extends StatefulWidget {
  @override
  _GoalSetupScreenState createState() => _GoalSetupScreenState();
}

class _GoalSetupScreenState extends State<GoalSetupScreen> {
  String _selectedCategory = 'career';
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  final List<Map<String, dynamic>> _categories = [
    {'value': 'career', 'label': 'Career Development', 'icon': Icons.work},
    {'value': 'health', 'label': 'Health & Fitness', 'icon': Icons.fitness_center},
    {'value': 'finance', 'label': 'Financial Planning', 'icon': Icons.account_balance},
    {'value': 'custom', 'label': 'Custom Goal', 'icon': Icons.star},
  ];

  void _handleNext() {
    if (_titleController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a goal title')),
      );
      return;
    }

    // 导航到AI诊断页面
    context.push('/diagnosis', extra: {
      'category': _selectedCategory,
      'title': _titleController.text,
      'description': _descriptionController.text,
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Set Your Goal')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'What do you want to improve?',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),
            // 类别选择
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: _categories.map((cat) {
                final isSelected = _selectedCategory == cat['value'];
                return ChoiceChip(
                  label: Text(cat['label']),
                  selected: isSelected,
                  onSelected: (selected) {
                    setState(() => _selectedCategory = cat['value']);
                  },
                  avatar: Icon(cat['icon']),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
            // 目标标题
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Goal Title',
                hintText: 'e.g., Get PMP certification in 3 months',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            // 目标描述（可选）
            TextField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
            const Spacer(),
            // 下一步按钮
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _handleNext,
                child: const Text('Next: AI Diagnosis'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

**产出**：目标设定页面

### T3.3 创建AI服务

创建 `lib/services/ai_service.dart`：

```dart
class AIService {
  final String _apiKey;
  final String _baseUrl = 'https://api.deepseek.com/v1';

  AIService(this._apiKey);

  // 发送诊断对话
  Future<String> sendDiagnosisMessage({
    required List<Map<String, String>> messages,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/chat/completions'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_apiKey',
      },
      body: jsonEncode({
        'model': 'deepseek-chat',
        'messages': [
          {
            'role': 'system',
            'content': '''You are a rational life coach specializing in helping single individuals achieve their personal growth goals. 

Your coaching style is:
- Structured and methodical
- Data-driven with clear action plans
- Direct but supportive
- Focused on accountability

When diagnosing a goal, you must ask exactly 3 questions:
1. About their current baseline and available time
2. About past obstacles and challenges
3. About their motivation and what success means to them

After the 3 questions, generate a structured weekly plan in this format:
## Your Growth Blueprint
### Week 1: [Theme]
- Task 1: [Specific action]
- Task 2: [Specific action]
### Week 2: [Theme]
...

Keep plans realistic and specific to single individuals (considering they manage everything alone).'''
          },
          ...messages,
        ],
        'temperature': 0.7,
        'max_tokens': 2000,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['choices'][0]['message']['content'];
    } else {
      throw Exception('Failed to get AI response: ${response.statusCode}');
    }
  }

  // 生成完整计划
  Future<String> generateFullPlan({
    required String category,
    required String title,
    required String description,
    required String diagnosisAnswers,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/chat/completions'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_apiKey',
      },
      body: jsonEncode({
        'model': 'deepseek-chat',
        'messages': [
          {
            'role': 'system',
            'content': '''You are a rational life coach. Generate a detailed, actionable growth plan based on the user's goal and diagnosis answers.

The plan must be:
- Broken down into weekly milestones
- Each week has 3-5 specific, measurable tasks
- Tasks should be realistic for someone managing life alone
- Include time estimates for each task
- Progressive difficulty

Output format:
{
  "title": "Plan Title",
  "weeks": [
    {
      "week_number": 1,
      "theme": "Week Theme",
      "tasks": [
        {
          "title": "Task Title",
          "description": "Detailed description",
          "estimated_minutes": 30,
          "due_day": 1
        }
      ]
    }
  ]
}

Return ONLY valid JSON.'''
          },
          {
            'role': 'user',
            'content': '''Goal: $title
Category: $category
Description: $description
Diagnosis Answers: $diagnosisAnswers

Please generate a comprehensive growth plan.'''
          },
        ],
        'temperature': 0.7,
        'max_tokens': 3000,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['choices'][0]['message']['content'];
    } else {
      throw Exception('Failed to generate plan: ${response.statusCode}');
    }
  }
}
```

**产出**：AI服务

### T3.4 创建诊断对话页面

创建 `lib/screens/diagnosis_screen.dart`：

```dart
class DiagnosisScreen extends StatefulWidget {
  final String category;
  final String title;
  final String? description;

  const DiagnosisScreen({
    required this.category,
    required this.title,
    this.description,
  });

  @override
  _DiagnosisScreenState createState() => _DiagnosisScreenState();
}

class _DiagnosisScreenState extends State<DiagnosisScreen> {
  final List<Map<String, String>> _messages = [];
  final _userInputController = TextEditingController();
  final _aiService = AIService('YOUR_DEEPSEEK_API_KEY');
  int _questionCount = 0;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // 发送初始消息，让AI开始诊断
    _sendMessage('I want to improve in ${widget.category}: ${widget.title}');
  }

  Future<void> _sendMessage(String userMessage) async {
    setState(() {
      _messages.add({'role': 'user', 'content': userMessage});
      _isLoading = true;
    });

    try {
      final aiResponse = await _aiService.sendDiagnosisMessage(
        messages: _messages,
      );

      setState(() {
        _messages.add({'role': 'assistant', 'content': aiResponse});
        _questionCount++;
      });

      // 如果已经问了3个问题，导航到计划预览
      if (_questionCount >= 3) {
        _navigateToPlanPreview();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _navigateToPlanPreview() {
    // 提取诊断答案
    final diagnosisAnswers = _messages
        .where((m) => m['role'] == 'user')
        .map((m) => m['content'])
        .join('\n');

    context.push('/plan-preview', extra: {
      'category': widget.category,
      'title': widget.title,
      'description': widget.description,
      'diagnosisAnswers': diagnosisAnswers,
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Diagnosis (${_questionCount}/3)'),
      ),
      body: Column(
        children: [
          // 对话列表
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                final isUser = message['role'] == 'user';
                
                return Align(
                  alignment: isUser 
                      ? Alignment.centerRight 
                      : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.75,
                    ),
                    decoration: BoxDecoration(
                      color: isUser 
                          ? Colors.blue[100] 
                          : Colors.grey[200],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(message['content'] ?? ''),
                  ),
                );
              },
            ),
          ),
          
          // 加载指示器
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: CircularProgressIndicator(),
            ),
          
          // 输入框（3个问题问完后禁用）
          if (_questionCount < 3)
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _userInputController,
                      decoration: const InputDecoration(
                        hintText: 'Type your answer...',
                        border: OutlineInputBorder(),
                      ),
                      enabled: !_isLoading,
                    ),
                  ),
                  const SizedBox(width: 12),
                  IconButton(
                    onPressed: _isLoading
                        ? null
                        : () {
                            if (_userInputController.text.isNotEmpty) {
                              _sendMessage(_userInputController.text);
                              _userInputController.clear();
                            }
                          },
                    icon: const Icon(Icons.send),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
```

**产出**：诊断对话页面

### T3.5 编写测试

创建 `test/services/ai_service_test.dart`：

```dart
void main() {
  group('AIService', () {
    test('sendDiagnosisMessage should return AI response', () async {
      // 测试诊断消息发送
    });

    test('generateFullPlan should return valid JSON plan', () async {
      // 测试计划生成
    });
  });
}
```

**产出**：AI服务测试

---

## Phase 4：计划生成 + 付费墙（第9-11天）

### T4.1 创建计划数据模型

创建 `lib/models/plan_model.dart`：

```dart
class PlanModel {
  final String id;
  final String goalId;
  final Map<String, dynamic> content;
  final int version;
  final bool isActive;
  final DateTime createdAt;

  PlanModel({
    required this.id,
    required this.goalId,
    required this.content,
    this.version = 1,
    this.isActive = true,
    required this.createdAt,
  });

  factory PlanModel.fromJson(Map<String, dynamic> json) {
    return PlanModel(
      id: json['id'],
      goalId: json['goal_id'],
      content: json['content'] is String 
          ? jsonDecode(json['content']) 
          : json['content'],
      version: json['version'] ?? 1,
      isActive: json['is_active'] ?? true,
      createdAt: DateTime.parse(json['created_at']),
    );
  }
}
```

**产出**：PlanModel

### T4.2 创建计划预览页面（含付费墙）

创建 `lib/screens/plan_preview_screen.dart`：

```dart
class PlanPreviewScreen extends StatefulWidget {
  final String category;
  final String title;
  final String? description;
  final String diagnosisAnswers;

  const PlanPreviewScreen({
    required this.category,
    required this.title,
    this.description,
    required this.diagnosisAnswers,
  });

  @override
  _PlanPreviewScreenState createState() => _PlanPreviewScreenState();
}

class _PlanPreviewScreenState extends State<PlanPreviewScreen> {
  final _aiService = AIService('YOUR_DEEPSEEK_API_KEY');
  Map<String, dynamic>? _planData;
  bool _isLoading = true;
  bool _showPaywall = false;

  @override
  void initState() {
    super.initState();
    _generatePlan();
  }

  Future<void> _generatePlan() async {
    try {
      final planJson = await _aiService.generateFullPlan(
        category: widget.category,
        title: widget.title,
        description: widget.description ?? '',
        diagnosisAnswers: widget.diagnosisAnswers,
      );

      setState(() {
        _planData = jsonDecode(planJson);
        _isLoading = false;
        _showPaywall = true; // 生成完成后显示付费墙
      });
    } catch (e) {
      // 降级处理：使用通用模板
      setState(() {
        _planData = _getDefaultPlan();
        _isLoading = false;
        _showPaywall = true;
      });
    }
  }

  Map<String, dynamic> _getDefaultPlan() {
    // 通用模板降级
    return {
      'title': 'Your Growth Plan',
      'weeks': [
        {
          'week_number': 1,
          'theme': 'Getting Started',
          'tasks': [
            {'title': 'Define clear objectives', 'estimated_minutes': 30},
            {'title': 'Set up your environment', 'estimated_minutes': 45},
          ]
        },
      ]
    };
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Your Growth Blueprint')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                // 计划预览内容
                SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 标题
                      Text(
                        '🎉 Your Growth Blueprint is Ready!',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 24),
                      
                      // 计划缩略预览（只显示前2周）
                      ..._buildPlanPreview(),
                      
                      // 如果有更多周，显示模糊提示
                      if ((_planData?['weeks'] as List?)?.length ?? 0) > 2)
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.grey[100],
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            '🔒 Unlock full plan to see all weeks...',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      
                      const SizedBox(height: 100), // 为底部付费墙留空间
                    ],
                  ),
                ),
                
                // 付费墙底部弹出
                if (_showPaywall)
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: _buildPaywall(),
                  ),
              ],
            ),
    );
  }

  List<Widget> _buildPlanPreview() {
    final weeks = _planData?['weeks'] as List? ?? [];
    final previewWeeks = weeks.take(2).toList(); // 只显示前2周
    
    return previewWeeks.map((week) {
      return Card(
        margin: const EdgeInsets.only(bottom: 16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Week ${week['week_number']}: ${week['theme']}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              ...(week['tasks'] as List).map((task) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      const Icon(Icons.circle, size: 8),
                      const SizedBox(width: 8),
                      Expanded(child: Text(task['title'])),
                      Text(
                        '${task['estimated_minutes']} min',
                        style: const TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ],
          ),
        ),
      );
    }).toList();
  }

  Widget _buildPaywall() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Unlock Full Plan & Unlimited Adjustments',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          const Text(
            'Get complete weekly plan + AI coaching conversations',
            style: TextStyle(color: Colors.grey),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          
          // 解锁按钮
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () {
                // TODO: 调用IAP购买
                context.push('/subscription');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
              ),
              child: const Text(
                'Unlock - \$9.99/month',
                style: TextStyle(fontSize: 16),
              ),
            ),
          ),
          const SizedBox(height: 12),
          
          // 试用按钮
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton(
              onPressed: () {
                // 开始3天试用
                _startTrial();
              },
              child: const Text(
                'Try Free for 3 Days',
                style: TextStyle(fontSize: 16),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _startTrial() async {
    // 更新用户状态为试用
    final userService = UserService();
    final userId = Supabase.instance.client.auth.currentUser?.id;
    
    if (userId != null) {
      await _supabase
          .from('users')
          .update({
            'subscription_status': 'trial',
            'trial_expires_at': DateTime.now()
                .add(const Duration(days: 3))
                .toIso8601String(),
          })
          .eq('id', userId);
      
      // 导航到主界面
      context.go('/home');
    }
  }
}
```

**产出**：计划预览页面（含付费墙）

### T4.3 创建计划服务

创建 `lib/services/plan_service.dart`：

```dart
class PlanService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // 保存计划
  Future<PlanModel> savePlan({
    required String goalId,
    required Map<String, dynamic> content,
  }) async {
    final response = await _supabase
        .from('plans')
        .insert({
          'goal_id': goalId,
          'content': content,
          'version': 1,
          'is_active': true,
        })
        .select()
        .single();

    return PlanModel.fromJson(response);
  }

  // 获取目标的当前计划
  Future<PlanModel?> getActivePlan(String goalId) async {
    final response = await _supabase
        .from('plans')
        .select()
        .eq('goal_id', goalId)
        .eq('is_active', true)
        .maybeSingle();

    return response != null ? PlanModel.fromJson(response) : null;
  }

  // 更新计划（生成新版本）
  Future<PlanModel> updatePlan({
    required String goalId,
    required Map<String, dynamic> newContent,
  }) async {
    // 获取当前版本号
    final currentPlan = await getActivePlan(goalId);
    final newVersion = (currentPlan?.version ?? 0) + 1;

    // 将旧计划标记为非活跃
    if (currentPlan != null) {
      await _supabase
          .from('plans')
          .update({'is_active': false})
          .eq('id', currentPlan.id);
    }

    // 创建新版本
    final response = await _supabase
        .from('plans')
        .insert({
          'goal_id': goalId,
          'content': newContent,
          'version': newVersion,
          'is_active': true,
        })
        .select()
        .single();

    return PlanModel.fromJson(response);
  }
}
```

**产出**：PlanService

---

## Phase 5：订阅支付 IAP（第12-15天）

### T5.1 配置Apple IAP

在 `ios/Runner/Info.plist` 中添加：

```xml
<key>SKAdNetworkItems</key>
<array>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>example.com</string>
  </dict>
</array>
```

在 App Store Connect 中创建订阅产品：
- 产品ID：`com.yourcompany.aicoach.pro.monthly`
- 价格：$9.99/月
- 产品ID：`com.yourcompany.aicoach.pro.yearly`
- 价格：$79.99/年

### T5.2 创建支付服务

创建 `lib/services/payment_service.dart`：

```dart
class PaymentService {
  final InAppPurchase _iap = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _subscription;

  // 初始化
  Future<void> initialize() async {
    final available = await _iap.isAvailable();
    if (!available) {
      throw Exception('IAP not available');
    }

    // 监听购买状态
    _subscription = _iap.purchaseStream.listen(
      _onPurchaseUpdate,
      onDone: () => _subscription?.cancel(),
      onError: (error) => print('Purchase stream error: $error'),
    );
  }

  // 获取产品信息
  Future<List<ProductDetails>> getProducts() async {
    const productIds = {
      'com.yourcompany.aicoach.pro.monthly',
      'com.yourcompany.aicoach.pro.yearly',
    };

    final response = await _iap.queryProductDetails(productIds);
    
    if (response.error != null) {
      throw Exception('Failed to load products: ${response.error}');
    }

    return response.productDetails;
  }

  // 购买订阅
  Future<void> buySubscription(ProductDetails product) async {
    final purchaseParam = PurchaseParam(
      productDetails: product,
    );

    await _iap.buyNonConsumable(purchaseParam: purchaseParam);
  }

  // 恢复购买
  Future<void> restorePurchases() async {
    await _iap.restorePurchases();
  }

  // 处理购买更新
  void _onPurchaseUpdate(List<PurchaseDetails> purchaseDetailsList) {
    for (final purchaseDetails in purchaseDetailsList) {
      _handlePurchase(purchaseDetails);
    }
  }

  // 处理单个购买
  Future<void> _handlePurchase(PurchaseDetails purchaseDetails) async {
    if (purchaseDetails.status == PurchaseStatus.purchased ||
        purchaseDetails.status == PurchaseStatus.restored) {
      // 验证收据并更新用户状态
      await _verifyAndUnlock(purchaseDetails);
    }

    if (purchaseDetails.pendingCompletePurchase) {
      await _iap.completePurchase(purchaseDetails);
    }
  }

  // 验证并解锁
  Future<void> _verifyAndUnlock(PurchaseDetails purchaseDetails) async {
    // TODO: 发送收据到后端验证
    // 这里简化处理，直接更新状态
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId != null) {
      await Supabase.instance.client
          .from('users')
          .update({'subscription_status': 'pro'})
          .eq('id', userId);
    }
  }

  // 释放资源
  void dispose() {
    _subscription?.cancel();
  }
}
```

**产出**：PaymentService

### T5.3 创建订阅页面

创建 `lib/screens/subscription_screen.dart`：

```dart
class SubscriptionScreen extends StatefulWidget {
  @override
  _SubscriptionScreenState createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  final _paymentService = PaymentService();
  List<ProductDetails> _products = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    try {
      await _paymentService.initialize();
      final products = await _paymentService.getProducts();
      setState(() {
        _products = products;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Subscribe')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const Text(
                    'Unlock Your Full Potential',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    '• Unlimited AI coaching conversations\n'
                    '• Unlimited goals\n'
                    '• Flexible plan adjustments\n'
                    '• Deep progress analysis',
                    style: TextStyle(fontSize: 16),
                  ),
                  const SizedBox(height: 32),
                  
                  // 订阅选项
                  ..._products.map((product) {
                    final isYearly = product.id.contains('yearly');
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: () => _subscribe(product),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isYearly 
                                ? Colors.blue 
                                : Colors.grey[200],
                            foregroundColor: isYearly 
                                ? Colors.white 
                                : Colors.black,
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                product.title,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                '${product.price}${isYearly ? '/year (Save 17%)' : '/month'}',
                                style: const TextStyle(fontSize: 14),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                  
                  const SizedBox(height: 16),
                  
                  // 恢复购买
                  TextButton(
                    onPressed: () => _paymentService.restorePurchases(),
                    child: const Text('Restore Purchase'),
                  ),
                ],
              ),
            ),
    );
  }

  Future<void> _subscribe(ProductDetails product) async {
    try {
      await _paymentService.buySubscription(product);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Purchase failed: $e')),
      );
    }
  }

  @override
  void dispose() {
    _paymentService.dispose();
    super.dispose();
  }
}
```

**产出**：订阅页面

### T5.4 创建Edge Function（Webhook）

在 Supabase 中创建 Edge Function `webhook-apple`：

```typescript
// supabase/functions/webhook-apple/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  try {
    const payload = await req.json()
    
    // 验证Apple签名（简化版，生产环境需要完整验证）
    const notificationType = payload.notification_type
    const userId = payload.original_transaction_id
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    switch (notificationType) {
      case 'SUBSCRIBED':
      case 'DID_RENEW':
        // 订阅成功/续费成功
        await supabase
          .from('users')
          .update({ subscription_status: 'pro' })
          .eq('apple_transaction_id', userId)
        break
        
      case 'EXPIRED':
      case 'REFUND':
        // 订阅过期/退款
        await supabase
          .from('users')
          .update({ subscription_status: 'free' })
          .eq('apple_transaction_id', userId)
        break
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

**产出**：Apple Webhook Edge Function

---

## Phase 6：主界面 + 任务打卡（第16-19天）

### T6.1 创建任务数据模型

创建 `lib/models/task_model.dart`：

```dart
class TaskModel {
  final String id;
  final String planId;
  final String title;
  final DateTime? dueDate;
  final String status; // pending, done, skipped, overdue
  final int? difficultyRating;
  final int? actualDurationMinutes;
  final String? feedbackNote;
  final DateTime? completedAt;

  TaskModel({
    required this.id,
    required this.planId,
    required this.title,
    this.dueDate,
    this.status = 'pending',
    this.difficultyRating,
    this.actualDurationMinutes,
    this.feedbackNote,
    this.completedAt,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel(
      id: json['id'],
      planId: json['plan_id'],
      title: json['title'],
      dueDate: json['due_date'] != null 
          ? DateTime.parse(json['due_date']) 
          : null,
      status: json['status'] ?? 'pending',
      difficultyRating: json['difficulty_rating'],
      actualDurationMinutes: json['actual_duration_minutes'],
      feedbackNote: json['feedback_note'],
      completedAt: json['completed_at'] != null 
          ? DateTime.parse(json['completed_at']) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'plan_id': planId,
      'title': title,
      'due_date': dueDate?.toIso8601String().split('T')[0],
      'status': status,
      'difficulty_rating': difficultyRating,
      'actual_duration_minutes': actualDurationMinutes,
      'feedback_note': feedbackNote,
      'completed_at': completedAt?.toIso8601String(),
    };
  }
}
```

**产出**：TaskModel

### T6.2 创建任务服务

创建 `lib/services/task_service.dart`：

```dart
class TaskService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // 获取今日任务
  Future<List<TaskModel>> getTodayTasks(String userId) async {
    final today = DateTime.now().toIso8601String().split('T')[0];
    
    final response = await _supabase
        .from('tasks')
        .select('''
          *,
          plans!inner (
            goals!inner (
              user_id
            )
          )
        ''')
        .eq('plans.goals.user_id', userId)
        .eq('due_date', today)
        .order('created_at');

    return (response as List)
        .map((json) => TaskModel.fromJson(json))
        .toList();
  }

  // 获取计划的所有任务
  Future<List<TaskModel>> getPlanTasks(String planId) async {
    final response = await _supabase
        .from('tasks')
        .select()
        .eq('plan_id', planId)
        .order('due_date');

    return (response as List)
        .map((json) => TaskModel.fromJson(json))
        .toList();
  }

  // 标记任务完成
  Future<void> completeTask({
    required String taskId,
    required int difficultyRating,
  }) async {
    await _supabase
        .from('tasks')
        .update({
          'status': 'done',
          'difficulty_rating': difficultyRating,
          'completed_at': DateTime.now().toIso8601String(),
        })
        .eq('id', taskId);
  }

  // 跳过任务
  Future<void> skipTask(String taskId) async {
    await _supabase
        .from('tasks')
        .update({'status': 'skipped'})
        .eq('id', taskId);
  }

  // 标记任务太难
  Future<void> markTooHard({
    required String taskId,
    required String reason,
  }) async {
    await _supabase
        .from('tasks')
        .update({
          'status': 'skipped',
          'feedback_note': reason,
        })
        .eq('id', taskId);
  }
}
```

**产出**：TaskService

### T6.3 创建主页面

创建 `lib/screens/home_screen.dart`：

```dart
class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _taskService = TaskService();
  final _userService = UserService();
  List<TaskModel> _todayTasks = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) return;

    try {
      // 更新最后活跃时间
      await _userService.updateLastActive(userId);
      
      // 加载今日任务
      final tasks = await _taskService.getTodayTasks(userId);
      setState(() {
        _todayTasks = tasks;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Coach'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // 今日任务
                  const Text(
                    'Today\'s Tasks',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  if (_todayTasks.isEmpty)
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: Text(
                          'No tasks for today. Start by setting a goal!',
                          style: TextStyle(fontSize: 16),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    )
                  else
                    ..._todayTasks.map(_buildTaskCard),
                  
                  const SizedBox(height: 32),
                  
                  // 快捷操作
                  Row(
                    children: [
                      Expanded(
                        child: _buildActionButton(
                          icon: Icons.chat,
                          label: 'Talk to Coach',
                          onTap: () => context.push('/chat'),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildActionButton(
                          icon: Icons.list,
                          label: 'My Plans',
                          onTap: () => context.push('/plans'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: 0,
        onTap: (index) {
          switch (index) {
            case 0:
              // 已在首页
              break;
            case 1:
              context.push('/chat');
              break;
            case 2:
              context.push('/plans');
              break;
            case 3:
              context.push('/settings');
              break;
          }
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.chat),
            label: 'Coach',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.list),
            label: 'Plans',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }

  Widget _buildTaskCard(TaskModel task) {
    final isDone = task.status == 'done';
    final isSkipped = task.status == 'skipped';
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // 完成状态
                Checkbox(
                  value: isDone,
                  onChanged: isDone || isSkipped
                      ? null
                      : (value) => _showCompleteDialog(task),
                ),
                Expanded(
                  child: Text(
                    task.title,
                    style: TextStyle(
                      fontSize: 16,
                      decoration: isDone 
                          ? TextDecoration.lineThrough 
                          : null,
                      color: isSkipped ? Colors.grey : null,
                    ),
                  ),
                ),
              ],
            ),
            
            // 操作按钮（仅对待办任务显示）
            if (!isDone && !isSkipped)
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => _skipTask(task),
                    child: const Text('Skip'),
                  ),
                  TextButton(
                    onPressed: () => _showTooHardDialog(task),
                    child: const Text('Too Hard'),
                  ),
                ],
              ),
            
            // 完成后的难度评分
            if (isDone && task.difficultyRating != null)
              Row(
                children: [
                  const Text('Difficulty: '),
                  ...List.generate(5, (index) {
                    return Icon(
                      index < task.difficultyRating!
                          ? Icons.star
                          : Icons.star_border,
                      color: Colors.amber,
                      size: 20,
                    );
                  }),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Icon(icon, size: 32, color: Colors.blue),
              const SizedBox(height: 8),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCompleteDialog(TaskModel task) {
    int rating = 3;
    
    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Task Completed!'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('How difficult was this task?'),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      return IconButton(
                        icon: Icon(
                          index < rating ? Icons.star : Icons.star_border,
                          color: Colors.amber,
                        ),
                        onPressed: () {
                          setState(() => rating = index + 1);
                        },
                      );
                    }),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    await _taskService.completeTask(
                      taskId: task.id,
                      difficultyRating: rating,
                    );
                    Navigator.pop(context);
                    _loadData();
                  },
                  child: const Text('Confirm'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _skipTask(TaskModel task) async {
    await _taskService.skipTask(task.id);
    _loadData();
  }

  void _showTooHardDialog(TaskModel task) {
    final reasonController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Task Too Hard?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Help us understand why:'),
              const SizedBox(height: 16),
              TextField(
                controller: reasonController,
                decoration: const InputDecoration(
                  hintText: 'e.g., Too time-consuming, need more skills...',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                await _taskService.markTooHard(
                  taskId: task.id,
                  reason: reasonController.text,
                );
                Navigator.pop(context);
                _loadData();
              },
              child: const Text('Submit'),
            ),
          ],
        );
      },
    );
  }
}
```

**产出**：主页面（含任务打卡）

---

## Phase 7：AI对话 + 权限控制（第20-22天）

### T7.1 创建对话页面

创建 `lib/screens/chat_screen.dart`：

```dart
class ChatScreen extends StatefulWidget {
  final String? goalId;

  const ChatScreen({this.goalId});

  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final List<Map<String, String>> _messages = [];
  final _userInputController = TextEditingController();
  final _aiService = AIService('YOUR_DEEPSEEK_API_KEY');
  final _conversationService = ConversationService();
  bool _isLoading = false;
  String? _conversationId;

  @override
  void initState() {
    super.initState();
    _loadConversation();
  }

  Future<void> _loadConversation() async {
    if (widget.goalId != null) {
      final conversation = await _conversationService
          .getConversation(widget.goalId!);
      if (conversation != null) {
        setState(() {
          _conversationId = conversation.id;
          _messages.addAll(
            (conversation.messages as List)
                .map((m) => Map<String, String>.from(m))
                .toList(),
          );
        });
      }
    }
  }

  Future<void> _sendMessage(String userMessage) async {
    setState(() {
      _messages.add({'role': 'user', 'content': userMessage});
      _isLoading = true;
    });

    try {
      final aiResponse = await _aiService.sendDiagnosisMessage(
        messages: _messages,
      );

      setState(() {
        _messages.add({'role': 'assistant', 'content': aiResponse});
      });

      // 保存对话
      await _conversationService.saveConversation(
        conversationId: _conversationId,
        goalId: widget.goalId,
        messages: _messages,
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Coach'),
        actions: [
          // 检查是否可以调整计划
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => _checkAndAdjustPlan(),
          ),
        ],
      ),
      body: Column(
        children: [
          // 消息列表
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                final isUser = message['role'] == 'user';
                
                return Align(
                  alignment: isUser 
                      ? Alignment.centerRight 
                      : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.75,
                    ),
                    decoration: BoxDecoration(
                      color: isUser 
                          ? Colors.blue[100] 
                          : Colors.grey[200],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(message['content'] ?? ''),
                  ),
                );
              },
            ),
          ),
          
          // 加载指示器
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: CircularProgressIndicator(),
            ),
          
          // 输入框
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _userInputController,
                    decoration: const InputDecoration(
                      hintText: 'Talk to your coach...',
                      border: OutlineInputBorder(),
                    ),
                    enabled: !_isLoading,
                  ),
                ),
                const SizedBox(width: 12),
                IconButton(
                  onPressed: _isLoading
                      ? null
                      : () {
                          if (_userInputController.text.isNotEmpty) {
                            _sendMessage(_userInputController.text);
                            _userInputController.clear();
                          }
                        },
                  icon: const Icon(Icons.send),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _checkAndAdjustPlan() async {
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) return;

    final user = await UserService().getUser(userId);
    
    if (user?.subscriptionStatus != 'pro') {
      // 显示升级提示
      showDialog(
        context: context,
        builder: (context) {
          return AlertDialog(
            title: const Text('Pro Feature'),
            content: const Text(
              'Plan adjustment is available for Pro subscribers. '
              'Upgrade to unlock this feature.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  context.push('/subscription');
                },
                child: const Text('Upgrade'),
              ),
            ],
          );
        },
      );
      return;
    }

    // Pro用户可以调整计划
    _showAdjustPlanDialog();
  }

  void _showAdjustPlanDialog() {
    // 实现计划调整逻辑
    // 这里简化处理
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Adjust Plan'),
          content: const Text(
            'Tell me what you\'d like to change about your plan.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                // TODO: 实现计划调整
              },
              child: const Text('Submit'),
            ),
          ],
        );
      },
    );
  }
}
```

**产出**：AI对话页面

### T7.2 创建对话服务

创建 `lib/services/conversation_service.dart`：

```dart
class ConversationService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // 获取对话
  Future<ConversationModel?> getConversation(String goalId) async {
    final response = await _supabase
        .from('conversations')
        .select()
        .eq('goal_id', goalId)
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();

    return response != null 
        ? ConversationModel.fromJson(response) 
        : null;
  }

  // 保存对话
  Future<void> saveConversation({
    String? conversationId,
    String? goalId,
    required List<Map<String, String>> messages,
  }) async {
    if (conversationId != null) {
      // 更新现有对话
      await _supabase
          .from('conversations')
          .update({'messages': messages})
          .eq('id', conversationId);
    } else {
      // 创建新对话
      await _supabase
          .from('conversations')
          .insert({
            'user_id': Supabase.instance.client.auth.currentUser?.id,
            'goal_id': goalId,
            'messages': messages,
          });
    }
  }
}
```

**产出**：ConversationService

---

## Phase 8：账户删除 + 隐私政策（第23天）

### T8.1 创建设置页面

创建 `lib/screens/settings_screen.dart`：

```dart
class SettingsScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          // 账户信息
          ListTile(
            leading: const Icon(Icons.person),
            title: const Text('Account'),
            subtitle: Text(
              Supabase.instance.client.auth.currentUser?.email ?? '',
            ),
          ),
          
          const Divider(),
          
          // 订阅状态
          ListTile(
            leading: const Icon(Icons.star),
            title: const Text('Subscription'),
            subtitle: const Text('Manage your subscription'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/subscription'),
          ),
          
          // 恢复购买
          ListTile(
            leading: const Icon(Icons.restore),
            title: const Text('Restore Purchase'),
            onTap: () => _restorePurchase(context),
          ),
          
          const Divider(),
          
          // 隐私政策
          ListTile(
            leading: const Icon(Icons.privacy_tip),
            title: const Text('Privacy Policy'),
            onTap: () => _launchUrl('YOUR_PRIVACY_POLICY_URL'),
          ),
          
          // 服务条款
          ListTile(
            leading: const Icon(Icons.description),
            title: const Text('Terms of Service'),
            onTap: () => _launchUrl('YOUR_TERMS_URL'),
          ),
          
          const Divider(),
          
          // 删除账户
          ListTile(
            leading: const Icon(Icons.delete_forever, color: Colors.red),
            title: const Text(
              'Delete Account',
              style: TextStyle(color: Colors.red),
            ),
            onTap: () => _showDeleteAccountDialog(context),
          ),
          
          // 登出
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Sign Out'),
            onTap: () => _signOut(context),
          ),
        ],
      ),
    );
  }

  void _restorePurchase(BuildContext context) async {
    final paymentService = PaymentService();
    await paymentService.initialize();
    await paymentService.restorePurchases();
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Purchases restored')),
    );
  }

  void _showDeleteAccountDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete Account'),
          content: const Text(
            'Are you sure you want to delete your account?\n\n'
            '• All your data will be permanently deleted after 90 days\n'
            '• Active subscriptions cannot be refunded\n'
            '• This action cannot be undone',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => _deleteAccount(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
              ),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );
  }

  void _deleteAccount(BuildContext context) async {
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) return;

    // 软删除
    await Supabase.instance.client
        .from('users')
        .update({
          'deleted_at': DateTime.now().toIso8601String(),
        })
        .eq('id', userId);

    // 登出
    await Supabase.instance.client.auth.signOut();

    // 显示确认
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Account deactivated. Data will be deleted in 90 days.',
        ),
      ),
    );

    // 导航到登录页
    context.go('/login');
  }

  void _signOut(BuildContext context) async {
    await Supabase.instance.client.auth.signOut();
    context.go('/login');
  }

  Future<void> _launchUrl(String url) async {
    // 使用 url_launcher 打开链接
  }
}
```

**产出**：设置页面（含账户删除）

---

## Phase 9：测试 + 修bug（第24-26天）

### T9.1 单元测试清单

| 测试对象 | 测试用例 |
|----------|----------|
| AuthService | 注册、登录、登出 |
| UserService | 创建用户、获取用户、更新活跃时间 |
| AIService | 诊断消息、计划生成 |
| PlanService | 保存计划、获取计划、更新计划 |
| TaskService | 获取任务、完成任务、跳过任务 |
| PaymentService | 获取产品、购买、恢复 |
| ConversationService | 获取对话、保存对话 |

### T9.2 集成测试清单

| 测试场景 | 测试步骤 |
|----------|----------|
| 完整注册流程 | 注册 → GDPR同意 → 设定目标 → 完成诊断 |
| 付费墙流程 | 查看计划预览 → 付费墙显示 → 开始试用 |
| 任务打卡流程 | 查看任务 → 完成任务 → 评分 |
| 订阅流程 | 查看订阅页 → 购买 → 恢复购买 |

### T9.3 TestFlight 内测

1. 在 Xcode 中 Archive 项目
2. 上传到 App Store Connect
3. 添加内部测试员（最多25人）
4. 收集反馈并修复bug

---

## Phase 10：App Store 提交（第27-29天）

### T10.1 准备App Store资料

| 资料 | 说明 |
|------|------|
| App名称 | AI Coach - Personal Growth |
| 副标题 | Your AI Life Coach |
| 描述 | 详细介绍功能和价值 |
| 关键词 | ai coach, personal growth, goal setting, habit tracker |
| 截图 | 6.7寸、6.5寸、5.5寸各3-5张 |
| App图标 | 1024x1024 PNG |
| 隐私政策URL | Notion页面链接 |
| 支持URL | 你的支持邮箱或网站 |

### T10.2 App Privacy Labels

在 App Store Connect 中声明：

| 数据类型 | 用途 | 是否关联用户 |
|----------|------|-------------|
| 邮箱 | 认证 | 是 |
| 对话内容 | 产品功能 | 是 |
| 任务数据 | 产品功能 | 是 |
| 使用数据 | 分析 | 否 |

### T10.3 提交审核

1. 在 Xcode 中 Archive 并上传
2. 在 App Store Connect 中填写所有信息
3. 提交审核
4. 等待1-3天
5. 如被拒，根据反馈修改后重新提交

---

## 附录：文件结构总览

```
lib/
├── config/
│   └── supabase_config.dart
├── models/
│   ├── user_model.dart
│   ├── goal_model.dart
│   ├── plan_model.dart
│   ├── task_model.dart
│   └── conversation_model.dart
├── services/
│   ├── auth_service.dart
│   ├── user_service.dart
│   ├── ai_service.dart
│   ├── plan_service.dart
│   ├── task_service.dart
│   ├── payment_service.dart
│   └── conversation_service.dart
├── screens/
│   ├── login_screen.dart
│   ├── goal_setup_screen.dart
│   ├── diagnosis_screen.dart
│   ├── plan_preview_screen.dart
│   ├── home_screen.dart
│   ├── chat_screen.dart
│   ├── subscription_screen.dart
│   └── settings_screen.dart
├── widgets/
│   ├── gdpr_consent_dialog.dart
│   └── task_card.dart
├── utils/
│   └── helpers.dart
└── main.dart

supabase/
└── functions/
    └── webhook-apple/
        └── index.ts
```
