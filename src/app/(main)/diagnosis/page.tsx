'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const ROUND_PROMPTS = [
  { title: '基础了解', description: '了解你的目标和当前状况' },
  { title: '难点分析', description: '分析可能遇到的困难和挑战' },
  { title: '动机确认', description: '确认你的动机和期望' },
]

function DiagnosisContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const goalId = searchParams.get('goalId')

  const [currentRound, setCurrentRound] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 初始化：获取AI的第一个问题
  useEffect(() => {
    if (goalId) {
      startDiagnosis()
    }
  }, [goalId])

  const startDiagnosis = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'startDiagnosis',
          goalId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages([{ role: 'assistant', content: data.message }])
      }
    } catch (error) {
      console.error('Failed to start diagnosis:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'continueDiagnosis',
          goalId,
          userMessage,
          currentRound,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }])

        if (data.nextRound !== undefined) {
          setCurrentRound(data.nextRound)
        }

        if (data.isComplete) {
          setIsComplete(true)
        }
      }
    } catch (error) {
      console.error('Failed to continue diagnosis:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGeneratePlan = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generatePlan',
          goalId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // 跳转到计划预览页面
        router.push(`/plan/${data.planId}`)
      }
    } catch (error) {
      console.error('Failed to generate plan:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!goalId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">请先创建一个目标</p>
          <a href="/goals/new" className="text-blue-600 hover:underline">
            去创建目标
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部进度栏 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 mb-4">
            <a href="/goals/new" className="text-gray-600 hover:text-gray-900">
              ← 返回
            </a>
            <h1 className="text-xl font-bold text-gray-900">AI 诊断</h1>
          </div>

          {/* 进度指示器 */}
          <div className="flex gap-4">
            {ROUND_PROMPTS.map((round, index) => (
              <div key={index} className="flex-1">
                <div className={`h-2 rounded-full ${
                  index < currentRound ? 'bg-green-500' :
                  index === currentRound ? 'bg-blue-500' : 'bg-gray-200'
                }`} />
                <div className="mt-2">
                  <p className={`text-sm font-medium ${
                    index <= currentRound ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {round.title}
                  </p>
                  <p className={`text-xs ${
                    index <= currentRound ? 'text-gray-500' : 'text-gray-300'
                  }`}>
                    {round.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* 对话区域 */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm min-h-[400px] flex flex-col">
          {/* 消息列表 */}
          <div className="flex-1 p-4 overflow-y-auto max-h-[500px]">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="border-t p-4">
            {isComplete ? (
              <div className="text-center">
                <p className="text-green-600 font-medium mb-4">
                  ✅ 诊断完成！AI已了解你的情况
                </p>
                <button
                  onClick={handleGeneratePlan}
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {isLoading ? '生成计划中...' : '生成我的专属计划 →'}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="输入你的回答..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  发送
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function DiagnosisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    }>
      <DiagnosisContent />
    </Suspense>
  )
}
