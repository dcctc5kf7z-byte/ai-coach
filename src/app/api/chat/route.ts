import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateChatResponse, type ChatMessage } from '@/lib/ai'

// 每日对话限制（免费用户）
const FREE_DAILY_LIMIT = 2

/**
 * 检查用户今日对话次数
 */
async function getDailyChatCount(supabase: any, userId: string): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', today.toISOString())

  return count || 0
}

/**
 * 获取用户订阅状态
 */
async function getUserSubscription(supabase: any, userId: string): Promise<{
  status: string
  trialExpiresAt: string | null
}> {
  const { data: user } = await supabase
    .from('users')
    .select('subscription_status, trial_expires_at')
    .eq('id', userId)
    .single()

  return {
    status: user?.subscription_status || 'free',
    trialExpiresAt: user?.trial_expires_at || null,
  }
}

/**
 * 获取目标的计划和任务上下文
 */
async function getGoalContext(supabase: any, goalId: string, userId: string): Promise<string> {
  // 获取目标信息
  const { data: goal } = await supabase
    .from('goals')
    .select('title, category, description')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single()

  if (!goal) return ''

  // 获取活跃计划
  const { data: plan } = await supabase
    .from('plans')
    .select('id, content, version')
    .eq('goal_id', goalId)
    .eq('is_active', true)
    .single()

  // 获取任务进度
  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, status, due_date, difficulty_rating')
    .eq('plan_id', plan?.id || '')
    .order('due_date', { ascending: true })

  let context = `用户目标：${goal.title}\n领域：${goal.category}\n`
  if (goal.description) context += `描述：${goal.description}\n`

  if (plan) {
    context += `\n当前计划（v${plan.version}）：\n${JSON.stringify(plan.content)}\n`
  }

  if (tasks && tasks.length > 0) {
    const done = tasks.filter((t: any) => t.status === 'done').length
    const pending = tasks.filter((t: any) => t.status === 'pending').length
    const overdue = tasks.filter((t: any) => t.status === 'overdue').length
    context += '\n任务进度：共' + tasks.length + '个，完成' + done + '，待完成' + pending + '，逾期' + overdue + '\n'

    // 列出最近的任务
    const upcoming = tasks.filter((t: any) => t.status === 'pending').slice(0, 5)
    if (upcoming.length > 0) {
      context += '近期任务：\n'
      upcoming.forEach((t: any) => {
        context += `- ${t.title}（截止：${t.due_date || '未设定'}）\n`
      })
    }
  }

  return context
}

/**
 * POST /api/chat
 * 发送消息并获取 AI 回复
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { userId, message, goalId, isPlanAdjustment } = body

    if (!userId || !message) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 检查订阅状态
    const subscription = await getUserSubscription(supabase, userId)
    const isPro = subscription.status === 'pro'
    const isTrial = subscription.status === 'trial' &&
      (!subscription.trialExpiresAt || new Date(subscription.trialExpiresAt) > new Date())

    // 免费用户检查每日限制
    if (!isPro && !isTrial) {
      const dailyCount = await getDailyChatCount(supabase, userId)
      if (dailyCount >= FREE_DAILY_LIMIT) {
        return NextResponse.json({
          error: 'daily_limit_reached',
          message: `免费版每天只能进行 ${FREE_DAILY_LIMIT} 次对话，升级 Pro 解锁无限对话`,
          dailyCount,
          limit: FREE_DAILY_LIMIT,
        }, { status: 403 })
      }
    }

    // 计划调整仅限 Pro 用户
    if (isPlanAdjustment && !isPro && !isTrial) {
      return NextResponse.json({
        error: 'pro_only',
        message: '计划调整功能仅限 Pro 用户使用',
      }, { status: 403 })
    }

    // 获取历史消息（最近10条用于上下文）
    const { data: history } = await supabase
      .from('conversations')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(20)

    const recentMessages: ChatMessage[] = (history || []).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // 构建系统 prompt
    let systemPrompt = '你是用户的 AI 成长教练，风格理性、温暖、有条理。帮助用户分析问题、制定计划、复盘进展。回复要简洁实用，避免说教。'

    // 如果有目标上下文
    if (goalId) {
      const goalContext = await getGoalContext(supabase, goalId, userId)
      if (goalContext) {
        systemPrompt += `\n\n当前讨论的目标背景：\n${goalContext}`
      }
    }

    // 如果是计划调整请求
    if (isPlanAdjustment) {
      systemPrompt += '\n\n用户请求调整计划。请根据用户的反馈，给出具体的计划调整建议。如果需要，可以直接生成新的计划内容。'
    }

    // 保存用户消息
    await supabase.from('conversations').insert({
      user_id: userId,
      role: 'user',
      content: message,
    })

    // 调用 DeepSeek
    const aiResponse = await generateChatResponse(
      message,
      recentMessages,
      systemPrompt,
      goalId
    )

    // 保存 AI 回复
    await supabase.from('conversations').insert({
      user_id: userId,
      role: 'assistant',
      content: aiResponse,
    })

    // 获取更新后的对话次数
    const newDailyCount = await getDailyChatCount(supabase, userId)

    return NextResponse.json({
      response: aiResponse,
      dailyCount: newDailyCount,
      limit: FREE_DAILY_LIMIT,
      isPro: isPro || isTrial,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * GET /api/chat?userId=xxx
 * 获取对话历史
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!userId) {
      return NextResponse.json({ error: '缺少 userId' }, { status: 400 })
    }

    const { data: messages, error } = await supabase
      .from('conversations')
      .select('id, role, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    // 反转为时间顺序
    const sortedMessages = (messages || []).reverse()

    // 获取今日对话次数
    const dailyCount = await getDailyChatCount(supabase, userId)
    const subscription = await getUserSubscription(supabase, userId)
    const isPro = subscription.status === 'pro'
    const isTrial = subscription.status === 'trial' &&
      (!subscription.trialExpiresAt || new Date(subscription.trialExpiresAt) > new Date())

    return NextResponse.json({
      messages: sortedMessages,
      dailyCount,
      limit: FREE_DAILY_LIMIT,
      isPro: isPro || isTrial,
    })
  } catch (error) {
    console.error('Get chat history error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
