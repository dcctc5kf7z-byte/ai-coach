# 快速开始 — AI Coach MVP

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local`，填入以下变量：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# DeepSeek AI
DEEPSEEK_API_KEY=sk-xxx

# Stripe (测试模式)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_PRICE_MONTHLY=price_xxx
STRIPE_PRICE_YEARLY=price_xxx

# 应用 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. 配置 Supabase

在 Supabase Dashboard → SQL Editor 中执行：

1. `supabase/rls-policies.sql` — 启用 RLS 策略
2. `supabase/cleanup-cron.sql` — 配置定时清理（可选）

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

---

## 测试支付流程

### 1. 安装 Stripe CLI

```bash
# Windows (Scoop)
scoop install stripe

# 或下载: https://stripe.com/docs/stripe-cli
```

### 2. 登录 Stripe CLI

```bash
stripe login
```

### 3. 转发 Webhook

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

复制输出的 Webhook Signing Secret 到 `.env.local`。

### 4. 测试支付

使用测试卡号 `4242 4242 4242 4242`，到期日任意未来日期，CVC 任意 3 位数字。

---

## 功能测试清单

### 认证流程
- [ ] 首次访问显示 GDPR 弹窗
- [ ] 邮箱注册
- [ ] 邮箱登录
- [ ] 登录后重定向到 Dashboard

### 目标管理
- [ ] 创建新目标
- [ ] 选择领域（健康/财务/技能/关系/职业）
- [ ] 输入具体目标

### AI 诊断
- [ ] 开始诊断（3 轮对话）
- [ ] 查看诊断结果
- [ ] 生成计划

### 计划管理
- [ ] 查看计划预览
- [ ] 付费墙显示
- [ ] 解锁计划（Pro 用户）

### 任务打卡
- [ ] 查看任务列表
- [ ] 完成任务
- [ ] 跳过任务
- [ ] 查看任务统计

### AI 对话
- [ ] 通用教练对话
- [ ] 目标专属对话
- [ ] 计划调整（Pro 用户）
- [ ] 每日限制（免费用户 2 次）

### 设置
- [ ] 查看账户信息
- [ ] 查看订阅状态
- [ ] 管理订阅（Stripe Portal）
- [ ] 删除账户

---

## 测试卡号

| 场景 | 卡号 | 说明 |
|------|------|------|
| 成功支付 | `4242 4242 4242 4242` | 标准测试卡 |
| 需要验证 | `4000 0025 0000 3155` | 3D Secure 验证 |
| 支付失败 | `4000 0000 0000 0002` | 模拟失败 |
| 余额不足 | `4000 0000 0000 9995` | 余额不足 |

所有测试卡：到期日任意未来日期，CVC 任意 3 位数字。

---

## 常见问题

### Q: DeepSeek API 调用失败？

检查：
1. API Key 是否正确
2. 网络连接是否正常
3. 账户余额是否充足

默认配置：8 秒超时 + 1 次重试。

### Q: Supabase 连接失败？

检查：
1. 项目 URL 和 Key 是否正确
2. 项目状态是否正常
3. RLS 策略是否已执行

### Q: Stripe Webhook 不触发？

检查：
1. Stripe CLI 是否正在运行
2. Webhook Secret 是否正确
3. 事件类型是否已选择

### Q: 构建失败？

```bash
# 清理缓存
rm -rf .next node_modules
npm install
npm run build
```

---

## 项目结构

```
src/
├── app/
│   ├── (auth)/          # 登录/注册
│   ├── (main)/          # 主应用
│   └── api/             # API 路由
├── components/          # React 组件
├── lib/                 # 工具库
└── types/               # TypeScript 类型
```

---

## 技术栈

- **前端**: Next.js 14 (App Router) + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL)
- **AI**: DeepSeek API
- **支付**: Stripe
- **部署**: Vercel

---

## 更多文档

- [部署指南](deployment-guide.md)
- [Stripe 配置](stripe-setup-guide.md)
- [项目指南](../CLAUDE.md)
