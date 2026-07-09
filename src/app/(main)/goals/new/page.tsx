'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { id: 'career', label: '职业发展', icon: '💼', description: '提升技能、升职加薪、转行等' },
  { id: 'health', label: '健康生活', icon: '🏃', description: '健身、饮食、睡眠、心理健康' },
  { id: 'finance', label: '财务自由', icon: '💰', description: '储蓄、投资、副业、理财' },
  { id: 'custom', label: '自定义', icon: '🎯', description: '学习、习惯、兴趣爱好等' },
] as const

export default function NewGoalPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [goalTitle, setGoalTitle] = useState('')
  const [goalDescription, setGoalDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedCategory || !goalTitle.trim()) return

    setIsSubmitting(true)
    try {
      // 先保存目标到数据库，然后跳转到AI诊断
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: goalTitle.trim(),
          category: selectedCategory,
          description: goalDescription.trim() || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // 跳转到AI诊断页面
        router.push(`/diagnosis?goalId=${data.goal.id}`)
      }
    } catch (error) {
      console.error('Failed to create goal:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <a href="/goals" className="text-gray-600 hover:text-gray-900">
            ← 返回
          </a>
          <h1 className="text-2xl font-bold text-gray-900">创建新目标</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: 选择领域 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            第一步：选择目标领域
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedCategory === cat.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="text-2xl mb-2">{cat.icon}</div>
                <div className="font-medium text-gray-900">{cat.label}</div>
                <div className="text-sm text-gray-500 mt-1">{cat.description}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: 输入目标 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            第二步：描述你的目标
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                目标标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={goalTitle}
                onChange={e => setGoalTitle(e.target.value)}
                placeholder="例如：3个月内减重10斤"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                详细描述（可选）
              </label>
              <textarea
                value={goalDescription}
                onChange={e => setGoalDescription(e.target.value)}
                placeholder="描述更多细节，帮助AI更好地了解你的情况..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={500}
              />
            </div>
          </div>
        </section>

        {/* 提交按钮 */}
        <button
          onClick={handleSubmit}
          disabled={!selectedCategory || !goalTitle.trim() || isSubmitting}
          className={`w-full py-3 rounded-lg text-white font-medium transition-all ${
            selectedCategory && goalTitle.trim() && !isSubmitting
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? '创建中...' : '开始AI诊断 →'}
        </button>

        <p className="text-sm text-gray-500 mt-4 text-center">
          创建目标后，AI将通过3轮对话了解你的情况，为你制定个性化计划
        </p>
      </main>
    </div>
  )
}
