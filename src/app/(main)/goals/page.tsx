'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Goal {
  id: string
  title: string
  category: string
  description: string | null
  status: 'active' | 'completed' | 'paused'
  progress: number
  total_tasks: number
  done_tasks: number
  has_active_plan: boolean
  created_at: string
}

const categoryLabels: Record<string, string> = {
  career: '职业',
  health: '健康',
  finance: '财务',
  custom: '自定义',
}

const categoryColors: Record<string, string> = {
  career: 'bg-blue-100 text-blue-700',
  health: 'bg-green-100 text-green-700',
  finance: 'bg-yellow-100 text-yellow-700',
  custom: 'bg-purple-100 text-purple-700',
}

export default function GoalsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch('/api/goals')
      const data = await res.json()
      if (data.goals) {
        setGoals(data.goals)
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const filteredGoals = goals.filter(goal => {
    if (filter === 'active') return goal.status === 'active'
    if (filter === 'completed') return goal.status === 'completed'
    return true
  })

  const activeCount = goals.filter(g => g.status === 'active').length
  const completedCount = goals.filter(g => g.status === 'completed').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-gray-600 hover:text-gray-900">
              ← 返回
            </a>
            <h1 className="text-2xl font-bold text-gray-900">目标管理</h1>
          </div>
          <button
            onClick={() => router.push('/goals/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            + 新建目标
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{goals.length}</p>
            <p className="text-sm text-gray-500">全部目标</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{activeCount}</p>
            <p className="text-sm text-gray-500">进行中</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            <p className="text-sm text-gray-500">已完成</p>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="flex gap-2 mb-6">
          {(['all', 'active', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm ${
                filter === f
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? '全部' : f === 'active' ? '进行中' : '已完成'}
            </button>
          ))}
        </div>

        {/* 目标列表 */}
        {filteredGoals.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-400 mb-2">暂无目标</p>
            <p className="text-sm text-gray-400 mb-4">
              {goals.length === 0
                ? '设定你的第一个目标，开始成长之旅！'
                : '当前筛选条件下没有目标'}
            </p>
            {goals.length === 0 && (
              <button
                onClick={() => router.push('/goals/new')}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                创建目标
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGoals.map(goal => (
              <div
                key={goal.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${categoryColors[goal.category] || 'bg-gray-100 text-gray-600'}`}>
                    {categoryLabels[goal.category] || goal.category}
                  </span>
                </div>

                {goal.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{goal.description}</p>
                )}

                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>进度</span>
                    <span>{goal.done_tasks}/{goal.total_tasks} 任务</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        goal.status === 'completed' ? 'bg-green-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{goal.progress}%</p>
                </div>

                <div className="flex gap-2">
                  {goal.has_active_plan ? (
                    <>
                      <button
                        onClick={() => router.push(`/plan/${goal.id}`)}
                        className="flex-1 text-sm text-blue-600 hover:text-blue-800 py-2 border border-blue-200 rounded hover:bg-blue-50"
                      >
                        查看计划
                      </button>
                      <button
                        onClick={() => router.push(`/chat/${goal.id}`)}
                        className="flex-1 text-sm text-indigo-600 hover:text-indigo-800 py-2 border border-indigo-200 rounded hover:bg-indigo-50"
                      >
                        讨论目标
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => router.push(`/diagnosis?goal_id=${goal.id}`)}
                      className="flex-1 text-sm text-green-600 hover:text-green-800 py-2 border border-green-200 rounded hover:bg-green-50"
                    >
                      生成计划
                    </button>
                  )}
                  {goal.status === 'active' && (
                    <button
                      className="flex-1 text-sm text-gray-600 hover:text-gray-800 py-2 border border-gray-200 rounded hover:bg-gray-50"
                      onClick={() => {
                        // TODO: 编辑目标
                      }}
                    >
                      编辑
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
