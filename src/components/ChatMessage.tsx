'use client'

import { Bot, User } from 'lucide-react'

export interface ChatMessageData {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

export default function ChatMessage({ message }: { message: ChatMessageData }) {
  const isUser = message.role === 'user'

  // 简单的 markdown 渲染（粗体、列表、换行）
  const renderContent = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      // 粗体
      let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 列表项
      if (line.match(/^[-•]\s/)) {
        processed = processed.replace(/^[-•]\s/, '')
        return (
          <div key={i} className="flex gap-2 ml-2">
            <span className="text-gray-400">•</span>
            <span dangerouslySetInnerHTML={{ __html: processed }} />
          </div>
        )
      }
      // 数字列表
      if (line.match(/^\d+\.\s/)) {
        const num = line.match(/^(\d+)\./)?.[1]
        processed = processed.replace(/^\d+\.\s/, '')
        return (
          <div key={i} className="flex gap-2 ml-2">
            <span className="text-indigo-500 font-medium">{num}.</span>
            <span dangerouslySetInnerHTML={{ __html: processed }} />
          </div>
        )
      }
      // 空行
      if (line.trim() === '') {
        return <div key={i} className="h-2" />
      }
      // 普通行
      return <div key={i} dangerouslySetInnerHTML={{ __html: processed }} />
    })
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-indigo-100 text-indigo-600'
            : 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Bubble */}
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-500 text-white rounded-tr-md'
            : 'bg-gray-100 text-gray-800 rounded-tl-md'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="space-y-0.5">{renderContent(message.content)}</div>
        )}
      </div>
    </div>
  )
}
