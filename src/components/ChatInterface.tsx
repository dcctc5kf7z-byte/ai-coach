'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2, MessageCircle, Crown } from 'lucide-react'
import ChatMessage, { type ChatMessageData } from './ChatMessage'
import PaywallModal from './PaywallModal'

interface ChatInterfaceProps {
  userId: string
  goalId?: string
  goalTitle?: string
  isPlanAdjustment?: boolean
}

export default function ChatInterface({
  userId,
  goalId,
  goalTitle,
  isPlanAdjustment = false,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [dailyCount, setDailyCount] = useState(0)
  const [dailyLimit, setDailyLimit] = useState(2)
  const [isPro, setIsPro] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // 加载历史消息
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/chat?userId=${userId}&limit=50`)
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages || [])
          setDailyCount(data.dailyCount || 0)
          setDailyLimit(data.limit || 2)
          setIsPro(data.isPro || false)
        }
      } catch (error) {
        console.error('Failed to load chat history:', error)
      } finally {
        setInitialLoading(false)
      }
    }
    loadHistory()
  }, [userId])

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    // 免费用户检查限制
    if (!isPro && dailyCount >= dailyLimit) {
      setShowPaywall(true)
      return
    }

    // 添加用户消息到界面
    const userMessage: ChatMessageData = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          message: trimmed,
          goalId,
          isPlanAdjustment,
        }),
      })

      const data = await res.json()

      if (res.status === 403 && data.error === 'daily_limit_reached') {
        setShowPaywall(true)
        // 移除未发送的消息
        setMessages(prev => prev.filter(m => m.id !== userMessage.id))
        return
      }

      if (res.ok && data.response) {
        const assistantMessage: ChatMessageData = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
        }
        setMessages(prev => [...prev, assistantMessage])
        setDailyCount(data.dailyCount || dailyCount + 1)
      }
    } catch (error) {
      console.error('Send message error:', error)
      // 添加错误提示
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '抱歉，消息发送失败，请稍后重试。',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (initialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-indigo-500" />
          <span className="font-medium">
            {goalTitle ? `讨论：${goalTitle}` : 'AI 成长教练'}
          </span>
          {isPlanAdjustment && (
            <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
              计划调整
            </span>
          )}
        </div>
        {!isPro && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              今日 {dailyCount}/{dailyLimit}
            </span>
            <button
              onClick={() => setShowPaywall(true)}
              className="text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-1 rounded-full flex items-center gap-1"
            >
              <Crown className="w-3 h-3" />
              Pro
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="font-medium text-gray-700 mb-2">
              {goalTitle ? `聊聊你的目标：${goalTitle}` : '开始你的成长对话'}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              {isPlanAdjustment
                ? '告诉我你希望如何调整计划，我会为你优化。'
                : '我是你的 AI 成长教练，随时准备帮助你分析问题、复盘进展。'}
            </p>
            {/* 快捷问题 */}
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {(goalTitle
                ? ['这个目标进展如何？', '有什么困难吗？', '下一步怎么做？']
                : ['帮我设定一个目标', '今天该做什么？', '复盘一下本周']
              ).map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isPlanAdjustment ? '描述你希望的调整...' : '输入你的问题...'}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            rows={1}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="px-4 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Enter 发送，Shift+Enter 换行
        </p>
      </div>

      {/* Paywall Modal */}
      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          feature="chat"
        />
      )}
    </div>
  )
}
