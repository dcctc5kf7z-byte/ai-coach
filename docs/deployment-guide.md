# 部署指南 — AI Coach MVP

## 部署前检查清单

### 1. 环境变量准备

确保以下环境变量已配置在 `.env.local` 中：

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

# 应用 URL (部署后更新)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Supabase 配置

执行以下 SQL 脚本：

1. **RLS 策略** — `supabase/rls-policies.sql`
2. **定时清理** — `supabase/cleanup-cron.sql`（可选）

在 Supabase Dashboard → SQL Editor 中执行。

### 3. Stripe 配置

1. 创建产品和价格（见 `docs/stripe-setup-guide.md`）
2. 获取 Price ID 填入环境变量
3. 配置 Webhook 端点（部署后）

---

## Vercel 部署步骤

### Step 1: 推送代码到 GitHub

```bash
# 初始化 Git（如果还没有）
git init
git add .
git commit -m "Initial commit: AI Coach MVP"

# 创建 GitHub 仓库并推送
gh repo create ai-coach --private --source=. --push
```

### Step 2: 连接 Vercel

1. 访问 [vercel.com](https://vercel.com)
2. 点击 "New Project"
3. 导入 GitHub 仓库 `ai-coach`
4. 配置环境变量（见下方）

### Step 3: 配置环境变量

在 Vercel 项目设置 → Environment Variables 中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJxxx` | Supabase 匿名 Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJxxx` | Supabase 服务 Key |
| `DEEPSEEK_API_KEY` | `sk-xxx` | DeepSeek API Key |
| `STRIPE_SECRET_KEY` | `sk_test_xxx` | Stripe 密钥 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` | Stripe Webhook 密钥 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_xxx` | Stripe 公钥 |
| `STRIPE_PRICE_MONTHLY` | `price_xxx` | 月付价格 ID |
| `STRIPE_PRICE_YEARLY` | `price_xxx` | 年付价格 ID |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | 应用 URL |

### Step 4: 部署

点击 "Deploy" 按钮，Vercel 会自动：
- 安装依赖
- 构建项目
- 部署到全球 CDN

---

## 部署后配置

### 1. 更新 Supabase URL 配置

在 Supabase Dashboard → Authentication → URL Configuration 中：
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: 添加 `https://your-app.vercel.app/**`

### 2. 配置 Stripe Webhook

1. 访问 Stripe Dashboard → Webhooks
2. 点击 "Add endpoint"
3. 填入 URL: `https://your-app.vercel.app/api/stripe/webhook`
4. 选择事件：
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. 复制 Webhook Signing Secret 更新环境变量

### 3. 更新环境变量

部署完成后，更新 `NEXT_PUBLIC_APP_URL` 为实际的 Vercel 域名。

---

## 测试部署

### 功能测试清单

- [ ] 访问首页，重定向到登录页
- [ ] 注册新账号（邮箱 + GDPR 同意）
- [ ] 登录后进入 Dashboard
- [ ] 创建目标
- [ ] 开始 AI 诊断（3 轮对话）
- [ ] 生成计划
- [ ] 查看计划详情
- [ ] 任务打卡
- [ ] AI 对话功能
- [ ] 设置页面
- [ ] 升级到 Pro（测试卡号 4242...）
- [ ] 取消订阅

### 测试卡号

| 场景 | 卡号 |
|------|------|
| 成功支付 | `4242 4242 4242 4242` |
| 需要验证 | `4000 0025 0000 3155` |
| 支付失败 | `4000 0000 0000 0002` |

---

## 常见问题

### Q: 构建失败怎么办？

检查 Vercel 构建日志，常见原因：
- 环境变量缺失
- TypeScript 类型错误
- 依赖安装失败

### Q: Supabase 连接失败？

确认：
1. 环境变量正确
2. Supabase 项目状态正常
3. RLS 策略已执行

### Q: Stripe Webhook 不工作？

检查：
1. Webhook URL 正确
2. 事件类型已选择
3. Webhook Secret 匹配

### Q: DeepSeek API 超时？

默认配置 8 秒超时 + 1 次重试。如需调整，修改 `src/lib/ai.ts`。

---

## 生产环境优化

### 1. 启用 Analytics

在 Vercel 项目设置中启用 Web Analytics。

### 2. 配置自定义域名

在 Vercel → Settings → Domains 中添加自定义域名。

### 3. 监控和日志

- 使用 Vercel Logs 查看 API 日志
- 在 Supabase Dashboard 监控数据库性能
- 在 Stripe Dashboard 监控支付状态

### 4. 性能优化

- 启用 Vercel Edge Runtime（如需要）
- 配置 Supabase 连接池
- 优化图片和静态资源

---

## 回滚策略

如果部署后发现问题：

1. 在 Vercel Dashboard → Deployments 中找到上一个正常版本
2. 点击 "Promote to Production"
3. 检查并修复问题后重新部署

---

## 下一步

1. [ ] 完成上述部署步骤
2. [ ] 测试所有功能
3. [ ] 邀请用户测试（测试模式）
4. [ ] 验证产品需求
5. [ ] 切换到 Stripe Live 模式
6. [ ] 正式上线
