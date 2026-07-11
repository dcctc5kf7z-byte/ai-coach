import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// DeepSeek API 配置
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com'

// 诊断提示词
const DIAGNOSIS_PROMPTS = {
  round1: `你是一位专业的成长教练。用户刚刚设定了一个目标，现在是第一轮对话（基础了解）。
请用温暖、专业的语气，询问以下问题：
1. 这个目标的背景是什么？为什么现在想实现它？
2. 目前的基础情况如何？（例如：如果是健身目标，现在的运动频率？）
3. 有没有类似的成功经验？

请用中文回复，语气亲切自然，不要过于正式。`,

  round2: `你是一位专业的成长教练。现在是第二轮对话（难点分析）。
基于用户之前提供的信息，请询问：
1. 你觉得实现这个目标最大的困难是什么？
2. 之前尝试过但失败的原因是什么？
3. 现实中有哪些因素可能阻碍你？（时间、金钱、环境、他人影响等）

请用中文回复，表现出理解和共情。`,

  round3: `你是一位专业的成长教练。现在是第三轮对话（动机确认）。
基于之前的对话，请询问：
1. 如果实现了这个目标，你的生活会有什么变化？
2. 这个目标对你个人意味着什么？
3. 你希望在什么时间框架内实现它？

请用中文回复，给予鼓励和支持。`,
}

// 降级模板
const FALLBACK_DIAGNOSIS = {
  round1: "你好！我是你的AI成长教练。请告诉我你的目标是什么？比如：想减重、学习新技能、改善财务状况等。",
  round2: "明白了！你觉得实现这个目标最大的挑战是什么？比如时间不够、缺乏动力、不知道从何开始等。",
  round3: "好的，最后一个问题：如果实现了这个目标，你的生活会有什么改变？这能帮助我更好地为你制定计划。",
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { action, goalId, userMessage, currentRound } = body

    switch (action) {
      case 'startDiagnosis':
        return await startDiagnosis(supabase, goalId)

      case 'continueDiagnosis':
        return await continueDiagnosis(supabase, goalId, userMessage, currentRound)

      case 'generatePlan':
        return await generatePlan(supabase, goalId)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('AI API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function startDiagnosis(supabase: any, goalId: string) {
  // 获取目标信息
  const { data: goal, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .single()

  if (error || !goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }

  // 创建对话记录
  const { data: conversation } = await supabase
    .from('conversations')
    .insert({
      user_id: goal.user_id,
      goal_id: goalId,
      messages: [],
    })
    .select()
    .single()

  // 调用AI获取第一个问题
  const aiMessage = await callDeepSeek([
    { role: 'system', content: DIAGNOSIS_PROMPTS.round1 },
    { role: 'user', content: `我的目标是：${goal.title}${goal.description ? `。${goal.description}` : ''}` },
  ])

  // 保存AI消息
  await supabase
    .from('conversations')
    .update({
      messages: [{ role: 'assistant', content: aiMessage }],
    })
    .eq('id', conversation.id)

  return NextResponse.json({
    message: aiMessage,
    conversationId: conversation.id,
    round: 0,
  })
}

async function continueDiagnosis(
  supabase: any,
  goalId: string,
  userMessage: string,
  currentRound: number
) {
  // 获取对话记录
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // 添加用户消息
  const messages = [...conversation.messages, { role: 'user', content: userMessage }]

  // 根据当前轮次决定下一步
  const nextRound = currentRound + 1
  const isLastRound = nextRound >= 3

  // 构建AI请求
  const systemPrompt = isLastRound
    ? DIAGNOSIS_PROMPTS.round3
    : DIAGNOSIS_PROMPTS[`round${nextRound + 1}` as keyof typeof DIAGNOSIS_PROMPTS]

  const aiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-6), // 保留最近6条消息作为上下文
  ]

  // 调用AI
  const aiResponse = await callDeepSeek(aiMessages)

  // 更新对话记录
  messages.push({ role: 'assistant', content: aiResponse })

  await supabase
    .from('conversations')
    .update({ messages })
    .eq('id', conversation.id)

  return NextResponse.json({
    message: aiResponse,
    nextRound: isLastRound ? currentRound : nextRound,
    isComplete: isLastRound,
  })
}

async function generatePlan(supabase: any, goalId: string) {
  // 获取对话记录
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // 获取目标信息
  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .single()

  // 调用AI生成计划
  const planPrompt = `基于以下对话和目标信息，生成一个详细的执行计划。

目标：${goal?.title}
${goal?.description ? `描述：${goal.description}` : ''}

对话记录：
${conversation.messages.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join('\n')}

请生成一个结构化的计划，包含：
1. 总体目标和时间框架
2. 分阶段里程碑（3-5个阶段）
3. 每个阶段的具体任务
4. 关键成功因素
5. 可能的风险和应对策略

请用JSON格式返回，结构如下：
{
  "title": "计划标题",
  "summary": "计划概述",
  "phases": [
    {
      "name": "阶段名称",
      "duration": "持续时间",
      "tasks": ["任务1", "任务2"]
    }
  ],
  "keyFactors": ["因素1", "因素2"],
  "risks": [
    {
      "risk": "风险描述",
      "solution": "应对策略"
    }
  ]
}`

  const planContent = await callDeepSeek([
    { role: 'system', content: '你是一位专业的成长教练，擅长制定可执行的计划。' },
    { role: 'user', content: planPrompt },
  ])

  // 解析AI返回的JSON
  let planData
  try {
    // 尝试提取JSON（AI可能在JSON前后添加其他文本）
    const jsonMatch = planContent.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      planData = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('No JSON found')
    }
  } catch {
    // 如果AI返回的不是有效JSON，使用降级模板
    planData = getFallbackPlan(goal?.title || '个人目标')
  }

  // 保存计划到数据库
  const { data: plan, error } = await supabase
    .from('plans')
    .insert({
      goal_id: goalId,
      content: planData,
      version: 1,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to save plan:', error)
    return NextResponse.json({ error: 'Failed to save plan' }, { status: 500 })
  }

  return NextResponse.json({
    planId: plan.id,
    plan: planData,
  })
}

// 调用 DeepSeek API
async function callDeepSeek(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    console.warn('DeepSeek API key not configured, using fallback')
    return FALLBACK_DIAGNOSIS.round1
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8秒超时

    const response = await fetch(`${DEEPSEEK_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || FALLBACK_DIAGNOSIS.round1
  } catch (error) {
    console.error('DeepSeek API call failed:', error)
    // 返回降级模板
    return FALLBACK_DIAGNOSIS.round1
  }
}

// 降级计划模板
function getFallbackPlan(goalTitle: string) {
  return {
    title: `${goalTitle} - 执行计划`,
    summary: '这是一份为你定制的计划，帮助你逐步实现目标。',
    phases: [
      {
        name: '准备阶段',
        duration: '第1周',
        tasks: ['明确具体目标', '评估当前状态', '准备所需资源'],
      },
      {
        name: '启动阶段',
        duration: '第2-3周',
        tasks: ['开始执行核心任务', '建立日常习惯', '记录进度'],
      },
      {
        name: '坚持阶段',
        duration: '第4-6周',
        tasks: ['保持执行节奏', '调整优化策略', '克服困难挑战'],
      },
      {
        name: '巩固阶段',
        duration: '第7-8周',
        tasks: ['巩固成果', '形成长期习惯', '总结经验'],
      },
    ],
    keyFactors: ['持续行动', '定期复盘', '灵活调整'],
    risks: [
      { risk: '动力不足', solution: '设定小目标，及时奖励自己' },
      { risk: '时间冲突', solution: '提前规划，预留缓冲时间' },
    ],
  }
}
