# AI Coach — AI理性成长教练

针对单身人群的AI理性成长教练Web应用，通过结构化目标拆解和持续追踪，帮用户把模糊的"想变好"变成可执行的成长路径。

## 功能特性

- 🎯 **目标设定** — 选择领域（健康/财务/技能/关系/职业）+ 输入具体目标
- 🤖 **AI 诊断** — 3轮对话深度了解用户需求
- 📋 **计划生成** — AI生成个性化成长计划
- ✅ **任务打卡** — 每日任务追踪 + 进度统计
- 💬 **AI 对话** — 随时与AI教练对话
- 💳 **订阅付费** — 免费版 + Pro版（$9.99/月）

## 技术栈

- **前端**: Next.js 14 (App Router) + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL)
- **AI**: DeepSeek API
- **支付**: Stripe
- **部署**: Vercel

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/ai-coach.git
cd ai-coach
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.local.example` 为 `.env.local`，填入你的配置：

```bash
cp .env.local.example .env.local
```

需要配置：
- Supabase 项目 URL 和 Key
- DeepSeek API Key
- Stripe 测试密钥和价格 ID

### 4. 配置 Supabase

在 Supabase Dashboard → SQL Editor 中执行：
- `supabase/rls-policies.sql` — 启用 RLS 策略
- `supabase/cleanup-cron.sql` — 配置定时清理（可选）

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

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

## 文档

- [快速开始](docs/quick-start.md)
- [部署指南](docs/deployment-guide.md)
- [Stripe 配置](docs/stripe-setup-guide.md)
- [项目指南](CLAUDE.md)

## 订阅策略

| 版本 | 价格 | 权益 |
|------|------|------|
| 免费版 | $0 | 每天2次对话，1个目标，仅查看计划 |
| Pro月付 | $9.99/月 | 无限对话，无限目标，计划可调整 |
| Pro年付 | $79.99/年 | 同上，省17% |

## 测试卡号

| 场景 | 卡号 |
|------|------|
| 成功支付 | `4242 4242 4242 4242` |
| 需要验证 | `4000 0025 0000 3155` |
| 支付失败 | `4000 0000 0000 0002` |

## 许可证

MIT License