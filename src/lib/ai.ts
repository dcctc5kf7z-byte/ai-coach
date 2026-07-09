import { DiagnosisRound, Plan } from '@/types'

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com'
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000) // 8秒超时

  try {
    const response = await fetch(`${DEEPSEEK_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('DeepSeek API timeout')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function startDiagnosis(goalTitle: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的成长教练。用户会告诉你他们的目标，你需要通过提问来了解他们的情况，包括基础情况、可能的难点和动机。每次只问一个问题。',
    },
    {
      role: 'user',
      content: `我的目标是：${goalTitle}`,
    },
  ]

  return chatCompletion(messages)
}

export async function continueDiagnosis(
  rounds: DiagnosisRound[],
  goalTitle: string
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的成长教练。根据之前的对话继续深入了解用户的情况。每次只问一个问题。',
    },
    {
      role: 'user',
      content: `我的目标是：${goalTitle}`,
    },
    ...rounds.flatMap((round) => [
      { role: 'assistant' as const, content: round.question },
      { role: 'user' as const, content: round.answer },
    ]),
  ]

  return chatCompletion(messages)
}

export async function generatePlan(
  goalTitle: string,
  diagnosis: DiagnosisRound[]
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一个专业的成长教练。根据用户的目标和诊断信息，制定一个详细的、可执行的成长计划。
计划应该包括：
1. 总体目标和阶段性目标
2. 每日/每周的具体任务
3. 可能的难点和应对策略
4. 进度追踪方式
请用清晰的格式输出。`,
    },
    {
      role: 'user',
      content: `我的目标是：${goalTitle}\n\n诊断信息：\n${diagnosis
        .map((r, i) => `Q${i + 1}: ${r.question}\nA${i + 1}: ${r.answer}`)
        .join('\n\n')}`,
    },
  ]

  return chatCompletion(messages)
}

export async function adjustPlan(
  currentPlan: string,
  feedback: string
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的成长教练。根据用户的反馈调整现有的计划。保持计划的核心目标不变，但根据用户的实际情况进行调整。',
    },
    {
      role: 'user',
      content: `当前计划：\n${currentPlan}\n\n我的反馈：${feedback}`,
    },
  ]

  return chatCompletion(messages)
}

/**
 * AI 对话功能
 * 用于复盘、问答、计划调整等场景
 */
export async function generateChatResponse(
  userMessage: string,
  recentMessages: { role: string; content: string }[],
  systemPrompt: string,
  goalId?: string
): Promise<string> {
  // 构建消息数组：系统 prompt + 历史消息 + 用户新消息
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    // 只取最近 10 条消息作为上下文
    ...recentMessages.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ]

  try {
    return await chatCompletion(messages)
  } catch (error) {
    console.error('Chat completion error:', error)
    return '抱歉，AI 教练暂时无法回复。请稍后再试。'
  }
}

export type { ChatMessage }

// 容灾模板
export function getFallbackPlan(goalTitle: string): Plan {
  return {
    id: 'fallback',
    goal_id: 'fallback',
    version: 1,
    is_active: true,
    content: {
      title: `${goalTitle} - 成长计划`,
      phases: [
        {
          name: '准备期',
          duration: '第1-2周',
          tasks: ['明确具体目标和衡量标准', '建立每日执行习惯', '记录基线数据'],
        },
        {
          name: '执行期',
          duration: '第3-8周',
          tasks: ['每日完成核心任务', '每周回顾进度', '及时调整策略'],
        },
        {
          name: '巩固期',
          duration: '第9-12周',
          tasks: ['保持习惯', '总结经验', '设定下一阶段目标'],
        },
      ],
      dailyTasks: ['完成核心练习', '记录进展', '反思总结'],
      note: '此为通用模板，完整个性化计划需要AI诊断支持。',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}
