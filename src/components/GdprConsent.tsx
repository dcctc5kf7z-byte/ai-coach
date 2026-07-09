'use client'

import { useState } from 'react'

interface GdprConsentProps {
  onAccept: () => void
  onDecline?: () => void
}

export default function GdprConsent({ onAccept, onDecline }: GdprConsentProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  const handleAccept = () => {
    setIsVisible(false)
    onAccept()
  }

  const handleDecline = () => {
    setIsVisible(false)
    onDecline?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          隐私政策与数据使用
        </h2>

        <div className="text-sm text-gray-600 space-y-3 mb-6">
          <p>
            欢迎使用 AI Coach。为了为您提供个性化服务，我们需要收集和处理您的部分数据：
          </p>

          <ul className="list-disc list-inside space-y-1">
            <li>邮箱地址（用于账户创建和登录）</li>
            <li>目标和计划数据（用于AI分析和进度追踪）</li>
            <li>使用行为数据（用于服务优化）</li>
          </ul>

          <p>
            我们承诺：
          </p>

          <ul className="list-disc list-inside space-y-1">
            <li>不会出售您的个人数据</li>
            <li>数据存储在安全的海外服务器</li>
            <li>您可以随时请求删除账户和数据</li>
          </ul>

          <p className="text-xs text-gray-500">
            点击&quot;同意&quot;即表示您已阅读并同意我们的{' '}
            <a href="/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              隐私政策
            </a>{' '}
            和{' '}
            <a href="/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              服务条款
            </a>
            。
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDecline}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            拒绝
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            同意并继续
          </button>
        </div>
      </div>
    </div>
  )
}
