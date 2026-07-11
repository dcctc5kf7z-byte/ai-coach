# AI Coach — 项目指南

## 项目简介

针对单身人群的AI理性成长教练Web应用，通过结构化目标拆解和持续追踪，帮用户把模糊的"想变好"变成可执行的成长路径。

- **赛道**：单身经济 × 个人成长
- **目标市场**：海外（优先）
- **商业模式**：订阅制（$9.99/月，$79.99/年）
- **团队**：一人公司

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端 | Next.js 14 (App Router) + Tailwind CSS | React框架，响应式设计 |
| 后端 | Next.js API Routes | 统一处理AI调用、支付、数据库操作 |
| 数据库 | Supabase (PostgreSQL) | 认证+数据存储 |
| AI | DeepSeek API | 国内直连，性能接近GPT-4 |
| 支付 | Stripe | 费率2.9%，远低于Apple 30% |
| 部署 | Vercel | 免费额度，自动部署 |

## 架构决策

- **所有后端逻辑通过 Next.js API Routes 处理**，不额外使用 Supabase Edge Functions
- **Supabase 权限分离**：
  - 前端：`NEXT_PUBLIC_SUPABASE_ANON_KEY`（RLS限制）
  - API Routes：`SUPABASE_SERVICE_ROLE_KEY`（特权操作）
- **AI容灾**：DeepSeek 超时8s + 1次重试，失败返回通用模板
- **付费触发点**：计划预览页（先验价值后置付费）
- **免费版限制**：每天2次对话，1个目标，仅查看计划不可调整

## 项目结构

```
src/
├── middleware.ts                 # 路由守卫
├── app/
│   ├── (auth)/                  # 登录/注册
│   │   ├── login/page.tsx       # 登录页面
│   │   └── register/page.tsx    # 注册页面（含GDPR弹窗）
│   ├── (main)/                  # 主应用
│   │   ├── dashboard/page.tsx   # 仪表盘（三大模块）
│   │   ├── goals/page.tsx       # 目标列表
│   │   ├── goals/new/page.tsx   # 创建目标（选择领域+输入目标）
│   │   ├── diagnosis/page.tsx   # AI诊断（3轮对话）
│   │   └── plan/[id]/page.tsx   # 计划预览
│   ├── api/                     # API Routes
│   │   ├── ai/route.ts          # AI诊断/计划生成（DeepSeek集成）
│   │   ├── goals/route.ts       # 目标CRUD（Supabase）
│   │   ├── plans/route.ts       # 计划CRUD（Supabase）
│   │   ├── chat/route.ts        # AI对话（DeepSeek集成）
│   │   ├── stripe/              # 支付Checkout/Webhook
│   │   ├── tasks/               # 任务完成/跳过
│   │   ├── settings/route.ts    # 用户设置
│   │   └── account/delete/      # 账户删除
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                      # 通用UI组件
│   ├── TaskCard.tsx
│   ├── PaywallModal.tsx
│   ├── GdprConsent.tsx          # GDPR同意弹窗
│   ├── ChatMessage.tsx          # 聊天气泡组件
│   └── ChatInterface.tsx        # 聊天界面组件
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # 前端浏览器端
│   │   ├── server.ts            # API Route / Server Component
│   │   └── admin.ts             # Webhook / 特权操作
│   ├── auth.ts                  # 认证服务（signUp/signIn/signOut）
│   ├── stripe.ts
│   ├── ai.ts                    # DeepSeek AI集成
│   ├── subscription.ts          # 订阅状态管理
│   └── utils.ts
└── types/
    └── index.ts
```

## 核心功能（MVP）

1. **注册/登录** — 邮箱注册 + GDPR同意弹窗
2. **目标设定** — 选择领域 + 输入具体目标
3. **AI诊断（3轮）** — 基础→难点→动机
4. **计划预览 + 付费墙** — 展示蓝图缩略 → 解锁/试用
5. **计划管理** — 查看计划 + 版本追踪
6. **任务打卡** — pending/done/skipped/overdue + 难度自评
7. **AI对话（复盘+调整）** — Pro用户可调整计划
8. **订阅付费** — 3天试用 → 免费版 → Pro版
9. **账户删除** — 软删除 + 90天清理

## 订阅策略

| 版本 | 价格 | 权益 |
|------|------|------|
| 免费试用 | 3天免费 | 全功能体验 |
| 免费版 | $0 | 每天2次对话，1个目标，仅查看计划 |
| Pro月付 | $9.99/月 | 无限对话，无限目标，计划可调整 |
| Pro年付 | $79.99/年 | 同上，省17% |

## 开发计划

| Phase | 内容 | 时间 | 状态 |
|-------|------|------|------|
| 1 | 项目初始化 + 数据库建表 | 第1-2天 | ✅ |
| 2 | 认证 + GDPR + 试用期激活 | 第3-4天 | ✅ |
| 3 | 目标设定 + AI诊断 | 第5-7天 | ✅ |
| 4 | 计划生成 + 付费墙 | 第8-10天 | ✅ |
| 5 | Stripe支付 + Webhook | 第11-13天 | ✅ |
| 6 | 主界面 + 任务打卡 | 第14-16天 | ✅ |
| 7 | AI对话 + 权限控制 | 第17-19天 | ✅ |
| 8 | 设置 + 账户删除 | 第20天 | ✅ |
| 9 | 测试 + 部署 | 第21-23天 | 🔄 |

## 部署信息

- **GitHub**: https://github.com/dcctc5kf7z-byte/ai-coach
- **Vercel 项目**: knowflow（KnowFlow Team）
- **生产域名**: https://knowflow-blond.vercel.app
- **Stripe Webhook URL**: https://knowflow-blond.vercel.app/api/stripe/webhook
- **环境变量**: 已配置3个到 Vercel（NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL）

## 安全备忘

- 所有API密钥已从源码中移除（2026-07-10）
- `.env.local` 已gitignore，本地开发可用
- 密钥获取地址：Supabase Dashboard / DeepSeek Platform / Stripe Dashboard

## 设计文档

- 设计方案：`docs/superpowers/specs/2026-07-09-ai-coach-mvp-design.md`
- 实现计划：`docs/superpowers/specs/2026-07-09-ai-coach-mvp-implementation-plan.md`
- 交接文档：`handoffs/2026-07-09.md`
- 部署指南：`docs/deployment-guide.md`
- 快速开始：`docs/quick-start.md`
- Stripe 配置：`docs/stripe-setup-guide.md`

## 合规要求

- GDPR同意弹窗（首次启动）
- 隐私政策 + 服务条款（Notion公开页面）
- 账户删除入口（软删除 + 90天清理）
- App Privacy数据声明

## 注意事项

- **国内开发需代理**：访问Firebase/Google服务、Apple Developer、部分npm包
- **DeepSeek API国内直连**：无需代理
- **Stripe需海外主体**：注册时可能需要
- **Supabase免费额度**：前期够用，注意连接数限制
