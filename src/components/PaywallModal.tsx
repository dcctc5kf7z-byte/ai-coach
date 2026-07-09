'use client'

import { useState } from 'react'

interface PaywallModalProps {
  onClose: () => void
  feature?: 'plan' | 'chat' | 'goal'
}

const featureCopy: Record<string, { title: string; description: string }> = {
  plan: {
    title: '解锁完整计划',
    description: '升级到 Pro 版本，解锁计划执行和调整功能。',
  },
  chat: {
    title: '解锁无限对话',
    description: '今日免费对话次数已用完，升级 Pro 享受无限对话。',
  },
  goal: {
    title: '解锁无限目标',
    description: '免费版仅支持 1 个目标，升级 Pro 设定更多目标。',
  },
}

export default function PaywallModal({ onClose, feature = 'plan' }: PaywallModalProps) {
  const [loading, setLoading] = useState(false)
  const copy = featureCopy[feature]

  const handleCheckout = async (priceType: 'monthly' | 'yearly') => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createCheckout', priceType }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Checkout failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 图标 */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚀</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{copy.title}</h3>
          <p className="text-gray-600 mt-2">{copy.description}</p>
        </div>

        {/* 权益列表 */}
        <div className="space-y-3 mb-6">
          {[
            { icon: '💬', text: '无限 AI 对话' },
            { icon: '🎯', text: '无限目标设定' },
            { icon: '📋', text: '计划灵活调整' },
            { icon: '📊', text: '详细进度分析' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-lg">{item.icon}</span>
              <span className="text-gray-700">{item.text}</span>
              <span className="ml-auto text-green-500">✓</span>
            </div>
          ))}
        </div>

        {/* 价格选项 */}
        <div className="space-y-3 mb-6">
          {/* 月付 */}
          <button
            onClick={() => handleCheckout('monthly')}
            disabled={loading}
            className="w-full bg-white border-2 border-gray-200 hover:border-blue-500 rounded-xl p-4 flex justify-between items-center transition-colors"
          >
            <div className="text-left">
              <p className="font-semibold text-gray-900">月付</p>
              <p className="text-sm text-gray-500">按月订阅，随时取消</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">$9.99</p>
              <p className="text-sm text-gray-500">/月</p>
            </div>
          </button>

          {/* 年付 */}
          <button
            onClick={() => handleCheckout('yearly')}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 flex justify-between items-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-yellow-400 text-xs font-bold text-gray-900 px-2 py-0.5 rounded-bl-lg">
              省17%
            </div>
            <div className="text-left">
              <p className="font-semibold text-white">年付</p>
              <p className="text-sm text-blue-100">按年订阅，最划算</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">$79.99</p>
              <p className="text-sm text-blue-100">/年</p>
            </div>
          </button>
        </div>

        {/* 试用提示 */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            🎁 新用户享受 <span className="font-medium text-gray-700">3 天免费试用</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            试用期间可随时取消，不会收费
          </p>
        </div>

        {/* 跳过按钮 */}
        <button
          onClick={onClose}
          className="w-full mt-4 text-gray-400 hover:text-gray-600 text-sm py-2"
        >
          暂时跳过
        </button>
      </div>
    </div>
  )
}
