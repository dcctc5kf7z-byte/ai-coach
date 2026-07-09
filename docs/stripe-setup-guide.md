# Stripe 配置指南

## 概览

本项目使用 Stripe 处理订阅支付，支持月付 ($9.99/月) 和年付 ($79.99/年) 两种套餐。

---

## 第一步：创建 Stripe 账号

1. 访问 [stripe.com](https://stripe.com) 注册账号
2. 完成邮箱验证
3. 进入 Dashboard

> **注意**：Stripe 需要海外主体注册。开发测试可使用测试模式。

---

## 第二步：获取 API 密钥

1. 进入 Stripe Dashboard → Developers → API keys
2. 复制 **Test mode** 下的密钥：
   - `pk_test_...` (Publishable key) — 前端使用
   - `sk_test_...` (Secret key) — 后端使用

---

## 第三步：创建产品和价格

### 创建产品

1. 进入 Dashboard → Products → Add product
2. 填写信息：
   - **Name**: AI Coach Pro
   - **Description**: AI成长教练专业版订阅

### 创建月付价格

1. 在产品页面 → Add a price
2. 填写信息：
   - **Price**: $9.99
   - **Billing period**: Monthly
   - **Price name**: Monthly Plan
3. 点击 Save
4. 复制 Price ID (格式: `price_xxxxx`)

### 创建年付价格

1. 同上，添加第二个价格
2. 填写信息：
   - **Price**: $79.99
   - **Billing period**: Yearly
   - **Price name**: Yearly Plan
3. 点击 Save
4. 复制 Price ID (格式: `price_xxxxx`)

---

## 第四步：配置 Webhook

### 创建 Webhook Endpoint

1. 进入 Dashboard → Developers → Webhooks
2. 点击 Add endpoint
3. 填写信息：
   - **Endpoint URL**: `https://your-domain.com/api/stripe/webhook`
   - **Events to send**: 选择以下事件：
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. 点击 Add endpoint
5. 复制 **Signing secret** (格式: `whsec_xxxxx`)

### 本地开发 Webhook 测试

使用 Stripe CLI 转发 Webhook：

```bash
# 安装 Stripe CLI (Windows)
scoop install stripe

# 登录
stripe login

# 转发 Webhook 到本地
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 输出的 whsec_xxxxx 就是本地测试的 Webhook Secret
```

---

## 第五步：配置环境变量

在 `.env.local` 中添加：

```bash
# Stripe API 密钥
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx

# Stripe Webhook 签名密钥
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Stripe 价格 ID
STRIPE_PRICE_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_YEARLY=price_xxxxxxxxxxxxx

# 应用 URL（用于支付成功/取消后的跳转）
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 第六步：配置 Customer Portal

用户可以通过 Customer Portal 管理订阅（升级、降级、取消等）。

1. 进入 Dashboard → Settings → Customer portal
2. 启用 Customer portal
3. 配置允许的操作：
   - ✅ Update subscriptions (升级/降级)
   - ✅ Cancel subscriptions (取消订阅)
   - ✅ Update payment methods (更新支付方式)
   - ✅ View invoices (查看发票)
4. 点击 Save

---

## 测试卡号

在测试模式下，使用以下卡号测试：

| 场景 | 卡号 | 说明 |
|------|------|------|
| 成功支付 | 4242 4242 4242 4242 | 任意未来日期 + 任意 CVC |
| 需要验证 | 4000 0025 0000 3155 | 触发 3D Secure 验证 |
| 支付失败 | 4000 0000 0000 0002 | 余额不足 |
| 续费失败 | 4000 0000 0000 0341 | 用于测试续费失败场景 |

---

## 生产环境上线

### 切换到 Live 模式

1. 在 Dashboard 右上角切换到 **Live mode**
2. 重新获取 API 密钥（`sk_live_...`、`pk_live_...`）
3. 重新创建产品和价格
4. 重新配置 Webhook（使用生产域名）

### 更新环境变量

```bash
# 生产环境
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
STRIPE_PRICE_MONTHLY=price_live_xxxxxxxxxxxxx
STRIPE_PRICE_YEARLY=price_live_xxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 常见问题

### Q: 支付成功但用户状态没有更新？

A: 检查 Webhook 是否配置正确：
1. 确认 Webhook URL 正确
2. 确认选择了正确的事件
3. 检查 Stripe Dashboard → Webhooks → 查看事件日志

### Q: 如何测试 Webhook？

A: 使用 Stripe CLI：
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```

### Q: 如何查看测试交易？

A: 在 Dashboard → Payments 可以查看所有测试交易。

### Q: 免费试用期如何设置？

A: 代码中已配置 3 天试用期（`subscription_data.trial_period_days: 3`）。

---

## 相关代码

- `src/lib/stripe.ts` — Stripe SDK 配置
- `src/app/api/stripe/route.ts` — Stripe API（Checkout、Portal）
- `src/app/api/stripe/webhook/route.ts` — Webhook 处理
- `src/components/PaywallModal.tsx` — 付费墙弹窗
- `src/lib/subscription.ts` — 订阅状态管理
