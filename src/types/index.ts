// ============================================================
// 数据库模型类型（匹配Supabase schema）
// ============================================================

// 用户订阅状态
export type SubscriptionStatus = 'trial' | 'free' | 'pro'

// 用户
export interface User {
  id: string
  email: string
  subscription_status: SubscriptionStatus
  gdpr_consent: boolean
  consent_granted_at: string | null
  trial_expires_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  last_active_at: string
  deleted_at: string | null
  created_at: string
}

// 目标领域
export type GoalCategory = 'career' | 'health' | 'finance' | 'custom'

// 目标状态
export type GoalStatus = 'active' | 'completed' | 'paused'

// 目标
export interface Goal {
  id: string
  user_id: string
  title: string
  category: GoalCategory
  description: string | null
  status: GoalStatus
  created_at: string
}

// 计划
export interface Plan {
  id: string
  goal_id: string
  content: Record<string, unknown> // JSONB
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// 任务状态
export type TaskStatus = 'pending' | 'done' | 'skipped' | 'overdue'

// 任务
export interface Task {
  id: string
  plan_id: string
  title: string
  due_date: string | null
  status: TaskStatus
  difficulty_rating: number | null
  actual_duration_minutes: number | null
  feedback_note: string | null
  completed_at: string | null
  created_at: string
}

// 对话记录
export interface Conversation {
  id: string
  user_id: string
  goal_id: string
  messages: ConversationMessage[] // JSONB
  created_at: string
}

// 对话消息
export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ============================================================
// 前端使用的辅助类型
// ============================================================

// AI诊断轮次
export interface DiagnosisRound {
  round: number
  question: string
  answer: string
}

// 注册表单
export interface RegisterForm {
  email: string
  password: string
  gdprConsent: boolean
}

// 登录表单
export interface LoginForm {
  email: string
  password: string
}
