# AI成长教练 MVP 设计方案

> 版本：V1.2  
> 日期：2026-07-09  
> 赛道：单身经济 × 个人成长  
> 目标市场：海外（优先）  
> 团队：一人公司

---

## 一、产品定位

### 1.1 一句话描述

> 针对单身人群的AI理性成长教练，通过结构化目标拆解和持续追踪，帮你把模糊的"想变好"变成可执行的成长路径。

### 1.2 目标用户

- 25-35岁单身独居人群
- 有自我提升意愿但缺乏系统方法
- 需要外部督促但不想依赖他人
- 愿意为个人成长付费

### 1.3 核心差异化

| 维度 | ChatGPT/通用AI | 本产品 |
|------|---------------|--------|
| 个性化 | 每次独立对话，无记忆 | 长期陪伴，记住你的目标、习惯、进度 |
| 结构化 | 一次性建议 | 目标→计划→执行→复盘 完整闭环 |
| 督促性 | 无 | 任务打卡 + 难度反馈 + 计划调整 |
| 单身场景 | 通用 | 针对独居、一人决策、缺乏外部督促等痛点 |

---

## 二、MVP功能范围

### 2.1 要做的（9个核心功能）

| # | 功能 | 说明 |
|---|------|------|
| 1 | 注册/登录 | 邮箱注册 + GDPR同意弹窗 |
| 2 | 目标设定 | 选择领域 + 输入具体目标 |
| 3 | AI诊断（3轮） | 快速诊断：基础→难点→动机 |
| 4 | 计划预览 + 付费墙 | 展示蓝图缩略 → 解锁/试用 |
| 5 | 计划管理 | 查看计划 + 版本追踪 |
| 6 | 任务打卡 | pending/done/skipped/overdue + 难度自评 |
| 7 | AI对话（复盘+调整） | Pro用户可调整计划，免费版仅查看 |
| 8 | 订阅付费 | 3天试用 → 免费版 → Pro版 |
| 9 | 账户删除入口 | App Store审核要求 |

### 2.2 不做的

| ❌ 不做 | 理由 |
|---------|------|
| 复杂数据分析/可视化 | 后续迭代 |
| 社交/社区功能 | 偏离核心 |
| 多语言支持 | 先做英文 |
| 推送通知 | MVP非必需 |
| 离线模式 | AI必须联网 |

---

## 三、核心用户体验流程

### 3.1 首次使用流程

```
首次打开App
    │
    ▼
注册/登录（邮箱）
    │
    ▼ 弹出GDPR同意弹窗
    │
    ▼
引导页：选择领域 + 输入具体目标
    │
    ▼
AI教练快速诊断（仅限3轮）：
    │   第1轮："每天能投入多久？"
    │   第2轮："你之前卡在哪里？"
    │   第3轮："实现后对你意味着什么？"
    │
    ▼
核心价值预览页：
    ┌──────────────────────────────────────┐
    │  🎉 你的专属成长蓝图已生成！          │
    │  第1周：xxx                           │
    │  第2周：xxx                           │
    │  ...（计划缩略预览）                  │
    │                                      │
    │  [🔒 解锁完整计划与无限调整]          │
    │  [👀 先试用3天]                       │
    └──────────────────────────────────────┘
    │
    ▼（付费/试用后）
主界面：
    ┌──────────────────────────────────────┐
    │  今日任务                             │
    │  ├ ☐ 任务1          [跳过] [太难了]  │
    │  ├ ☐ 任务2          [跳过] [太难了]  │
    │  └ ☑ 任务3（完成）   难度：⭐⭐⭐      │
    │                                      │
    │  [💬 和教练聊聊]  [📋 我的计划]       │
    └──────────────────────────────────────┘
```

### 3.2 设计意图

- **差异化**：系统强制通过3轮提问补全"基础、难点、动机"，生成的计划比通用AI更可执行
- **付费前置**：在用户看到计划价值时弹出付费，转化率高于中途打断（参考Notion、Figma）
- **行为埋点**：任务的跳过、难度评分等数据为后续Pro版深度复盘提供原料

---

## 四、技术架构

### 4.1 整体架构

```
┌─────────────────────────────────────┐
│         Flutter App (iOS)            │
│  邮箱登录 │ 3轮诊断 │ 任务打卡 │ 对话 │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│        Supabase (海外服务器)          │
│  Auth认证 │ PostgreSQL │ Edge Functions│
│                                      │
│  Edge Functions 逻辑：                │
│  ├ 超时重试 (8s + 1次重试)            │
│  ├ 降级缓存 (通用模板兜底)            │
│  └ SSE流式响应 (逐字推送)             │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│       DeepSeek API (国内直连)         │
└──────────────────────────────────────┘
```

### 4.2 技术选型理由

| 选择 | 理由 |
|------|------|
| **Flutter** | 一套代码iOS+Android，开发效率高 |
| **Supabase** | 开源、免费额度够MVP、数据可控 |
| **DeepSeek** | 国内直连、性能接近GPT-4、价格便宜 |
| **Edge Functions** | 服务端调用AI，保护API Key |
| **pg_cron** | 数据库层定时任务，无需额外服务 |

### 4.3 AI服务容灾策略

```yaml
# Supabase Edge Functions 中的容灾逻辑
超时重试: DeepSeek 调用超时设为 8s，超时后自动重试1次
降级缓存: 若 DeepSeek 连续失败，返回预先缓存的"通用领域计划模板"
         提示"网络不稳定，已生成基础版，稍后可优化"
响应流式: 采用 SSE 将AI回复逐字推送给Flutter，减少用户等待焦虑
```

### 4.4 权限控制（前后端双重校验）

```
用户请求"调整计划"
    │
    ▼
┌──────────────────┐     ┌──────────────────┐
│   前端 Flutter    │     │  Edge Function   │
│                  │     │                  │
│ 检查             │────▶│ 二次校验         │
│ subscription_    │     │ SELECT           │
│ status           │     │ subscription_    │
│                  │     │ status           │
│ == 'pro' ?       │     │ FROM users       │
│                  │     │ WHERE id = uid   │
│ 显示/隐藏入口    │     │                  │
└──────────────────┘     │ == 'pro' ?       │
                         │                  │
                         │ 拒绝 → 返回      │
                         │ {error:          │
                         │  "upgrade_pro"}  │
                         └──────────────────┘
```

**原则：前端只是体验优化，安全校验永远在后端。**

---

## 五、数据模型

### 5.1 用户表 (users)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'free', 'pro')),
    gdpr_consent BOOLEAN DEFAULT FALSE,
    consent_granted_at TIMESTAMPTZ,
    trial_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '3 days'),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 目标表 (goals)

```sql
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    category TEXT CHECK (category IN ('career', 'health', 'finance', 'custom')),
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 计划表 (plans)

```sql
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES goals(id),
    content JSONB NOT NULL,
    version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.4 任务表 (tasks)

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES plans(id),
    title TEXT NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'skipped', 'overdue')),
    difficulty_rating INT CHECK (difficulty_rating BETWEEN 1 AND 5),
    actual_duration_minutes INT,
    feedback_note TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.5 对话记录表 (conversations)

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    goal_id UUID REFERENCES goals(id),
    messages JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.6 设计意图

| 字段 | 用途 |
|------|------|
| `status` (tasks) | 状态机替代boolean，支持跳过/逾期等状态 |
| `difficulty_rating` | 用户自评难度，为后续深度复盘提供数据 |
| `version` (plans) | AI调整计划时生成新版本，支持版本对比 |
| `deleted_at` | 软删除，支持GDPR被遗忘权 |
| `trial_expires_at` | 试用期管理，配合pg_cron自动降级 |

---

## 六、订阅与付费策略

### 6.1 订阅层级

| 版本 | 价格 | 核心权益 |
|------|------|----------|
| **免费试用** | 3天免费 | 全功能体验，到期自动降级 |
| **免费版** | $0 | 每天2次对话；1个目标；仅查看计划不可调整 |
| **Pro月付** | $9.99/月 | 无限对话；无限目标；计划灵活调整；深度复盘 |
| **Pro年付** | $79.99/年 | 同上，省17% |

### 6.2 付费触发点

- **主触发点**：计划预览页 → 解锁完整计划 / 3天试用
- **次触发点**：免费用户尝试调整计划时 → 提示升级

### 6.3 订阅状态机

```
注册 ──→ trial ──→ (3天到期) ──→ free
          │                      ↑
          ▼                      │
        pro ──→ (续费失败/退款) ──┘
          │
          └──→ (手动取消) ──→ free
```

### 6.4 试用到期处理（pg_cron）

```sql
-- 每日 UTC 00:00 检查试用到期用户
SELECT cron.schedule(
    'expire-trials',
    '0 0 * * *',
    $$
        UPDATE users
        SET subscription_status = 'free'
        WHERE subscription_status = 'trial'
          AND trial_expires_at < NOW()
    $$
);
```

### 6.5 IAP 支付回调

```javascript
// Edge Function: /webhook/apple
const notificationTypes = {
    SUBSCRIBED: () => updateStatus(userId, 'pro'),    // 订阅成功
    DID_RENEW: () => updateStatus(userId, 'pro'),     // 续费成功
    EXPIRED: () => updateStatus(userId, 'free'),       // 订阅过期
    REFUND: () => updateStatus(userId, 'free'),        // 退款
};
```

| 场景 | 处理方式 |
|------|----------|
| 支付成功 | 立即更新 `subscription_status = 'pro'` |
| 续费失败 | 进入Apple 16天宽限期，期间保持pro |
| 退款 | 立即降级为free |
| 取消 | 保持pro直到当前周期结束，然后降级 |

### 6.6 恢复购买

- 设置页面提供"恢复购买"按钮
- 调用 Apple `restoreCompletedTransactions` API
- 验证收据后更新用户状态
- **苹果审核强制要求**，否则会被拒

---

## 七、合规要求

### 7.1 GDPR 合规

| 要求 | 实现 |
|------|------|
| 明确同意 | 首次启动弹窗，记录 `gdpr_consent` 和 `consent_granted_at` |
| 隐私政策 | Notion公开页面，弹窗中提供链接 |
| 数据访问权 | 用户可申请导出数据 |
| 被遗忘权 | 账户删除功能（软删除+90天清理） |
| 数据最小化 | 仅收集必要数据 |

### 7.2 App Store 审核要求

| 要求 | 实现 |
|------|------|
| 隐私政策URL | Notion页面链接 |
| App Privacy标签 | 声明收集的数据类型 |
| AI内容审核 | 接入内容安全过滤（DeepSeek内置或自建） |
| 内购合规 | 通过Apple IAP，提供恢复购买 |
| 功能完整性 | 非套壳应用，有实质功能 |
| 账户删除 | 提供明确的删除入口 |

### 7.3 账户删除流程

```
用户点击"删除账户"
    │
    ▼
二次确认弹窗
    │
    ▼
更新 users.deleted_at = NOW()
    │
    ▼
显示"账户已停用，数据将在90天后清除"
    │
    ▼ (90天后 pg_cron 清理)
DELETE FROM users WHERE deleted_at < NOW() - INTERVAL '90 days'
```

---

## 八、MVP 开发计划

### 8.1 阶段划分

| 阶段 | 内容 | 预估时间 |
|------|------|----------|
| **Phase 1** | 环境搭建 + Supabase配置 + Flutter项目初始化 | 3天 |
| **Phase 2** | 注册/登录 + GDPR弹窗 | 2天 |
| **Phase 3** | 目标设定 + AI诊断（3轮） | 3天 |
| **Phase 4** | 计划生成 + 付费墙展示 | 3天 |
| **Phase 5** | 订阅支付（IAP）+ 恢复购买 | 4天 |
| **Phase 6** | 主界面 + 任务打卡 + 计划管理 | 4天 |
| **Phase 7** | AI对话（复盘+调整）+ 权限控制 | 3天 |
| **Phase 8** | 账户删除 + 隐私政策页面 | 1天 |
| **Phase 9** | 测试 + 修bug + TestFlight内测 | 3天 |
| **Phase 10** | App Store提交 + 审核 | 3天 |

**总计：约29天（1个月）**

### 8.2 关键依赖

| 依赖 | 说明 | 风险 |
|------|------|------|
| Apple开发者账号 | $99/年，注册需1-2周 | 提前注册 |
| Supabase项目 | 免费额度够用 | 无 |
| DeepSeek API | 国内直连 | API稳定性 |
| Notion页面 | 隐私政策/服务条款 | 无 |

---

## 九、后续迭代方向（MVP之后）

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P0 | Android版本 | Flutter一套代码，扩展成本低 |
| P1 | 推送通知 | 每日任务提醒 |
| P1 | 深度复盘 | 基于task数据的周/月复盘报告 |
| P2 | 多语言 | 中文、日文等 |
| P2 | 社交功能 | 成长小组、互相督促 |
| P3 | Apple HealthKit | 健康数据集成 |
| P3 | 数据可视化 | 成长趋势图表 |

---

## 附录A：技术栈清单

| 类别 | 技术 | 用途 |
|------|------|------|
| 前端 | Flutter | iOS App（后续扩展Android） |
| 后端 | Supabase | 认证、数据库、Edge Functions |
| 数据库 | PostgreSQL | 数据存储 |
| AI | DeepSeek API | 对话教练、计划生成 |
| 支付 | Apple IAP | 订阅付费 |
| 文档 | Notion | 隐私政策、服务条款 |
| 定时任务 | pg_cron | 试用到期检查、数据清理 |
| 流式响应 | SSE | AI回复逐字推送 |

## 附录B：成本预估（MVP阶段）

| 项目 | 费用 | 备注 |
|------|------|------|
| Apple开发者账号 | $99/年 | 一次性 |
| Supabase免费额度 | $0 | 前期够用 |
| DeepSeek API | ~$10-30/月 | 按用量 |
| 代理工具 | ~$5/月 | 开发阶段 |
| Notion | $0 | 免费版够用 |
| **月均成本** | **~$15-35** | 极低启动成本 |
