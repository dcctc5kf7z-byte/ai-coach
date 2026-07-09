'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Settings } from 'lucide-react'
import TaskCard from '@/components/TaskCard'

interface Task {
  id: string
  title: string
  status: 'pending' | 'done' | 'skipped' | 'overdue'
  difficulty_rating: number | null
  due_date: string | null
  goal_id?: string
  goal_title?: string
  goal_category?: string
}

interface Goal {
  id: string
  title: string
  category: string
  status: 'active' | 'completed' | 'paused'
  progress: number
  total_tasks: number
  done_tasks: number
  has_active_plan: boolean
}

const categoryLabels: Record<string, string> = {
  career: '职业',
  health: '健康',
  finance: '财务',
  custom: '自定义',
}

export default function DashboardPage() {
  const router = useRouter()
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'done'>('all')
  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState<string>('')

  // 获取任务列表
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      if (data.tasks) {
        setTasks(data.tasks)
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    }
  }, [])

  // 获取目标列表
  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch('/api/goals')
      const data = await res.json()
      if (data.goals) {
        setGoals(data.goals)
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error)
    }
  }, [])

  // 初始加载
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchTasks(), fetchGoals()])
      setLoading(false)
    }
    loadData()

    // 从 localStorage 获取用户名（临时方案）
    const email = localStorage.getItem('user_email')
    if (email) {
      setUserName(email.split('@')[0])
    }
  }, [fetchTasks, fetchGoals])

  // 处理任务状态变更
  const handleStatusChange = async (taskId: string, status: 'done' | 'skipped') => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status }),
      })

      if (res.ok) {
        // 乐观更新本地状态
        setTasks(prev =>
          prev.map(t =>
            t.id === taskId ? { ...t, status } : t
          )
        )
        // 如果完成任务，刷新目标进度
        if (status === 'done') {
          fetchGoals()
        }
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  // 处理难度评分
  const handleDifficultyChange = async (taskId: string, rating: number) => {
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, difficulty_rating: rating }),
      })

      setTasks(prev =>
        prev.map(t =>
          t.id === taskId ? { ...t, difficulty_rating: rating } : t
        )
      )
    } catch (error) {
      console.error('Failed to update difficulty:', error)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (taskFilter === 'pending') return task.status === 'pending' || task.status === 'overdue'
    if (taskFilter === 'done') return task.status === 'done'
    return true
  })

  const activeGoals = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')

  // 统计数据
  const todayTasks = tasks.filter(t => {
    if (!t.due_date) return false
    const today = new Date().toDateString()
    return new Date(t.due_date).toDateString() === today
  })
  const todayDone = todayTasks.filter(t => t.status === 'done').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">AI Coach</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/chat')}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-1 text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              AI 教练
            </button>
            <button
              onClick={() => router.push('/goals/new')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
            >
              + 新建目标
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/settings')}
                className="text-gray-400 hover:text-gray-600"
                title="设置"
              >
                <Settings className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium">
                  {userName ? userName[0].toUpperCase() : '?'}
                </span>
              </div>
              <span className="text-sm text-gray-700">{userName || '未登录'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 今日概览 */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 mb-8 text-white">
          <h2 className="text-lg font-medium mb-2">今日概览</h2>
          <div className="flex gap-8">
            <div>
              <p className="text-3xl font-bold">{todayDone}/{todayTasks.length}</p>
              <p className="text-blue-100 text-sm">今日任务完成</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{activeGoals.length}</p>
              <p className="text-blue-100 text-sm">进行中目标</p>
            </div>
            <div>
              <p className="text-3xl font-bold">
                {tasks.filter(t => t.status === 'pending').length}
              </p>
              <p className="text-blue-100 text-sm">待处理任务</p>
            </div>
          </div>
        </div>

        {/* 全部任务模块 */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">全部任务</h2>
            <div className="flex gap-2">
              {(['all', 'pending', 'done'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setTaskFilter(filter)}
                  className={`px-3 py-1 rounded-md text-sm ${
                    taskFilter === filter
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter === 'all' ? '全部' : filter === 'pending' ? '待处理' : '已完成'}
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-400 mb-2">暂无任务</p>
              <p className="text-sm text-gray-400">
                {tasks.length === 0
                  ? '创建一个目标，开始你的成长之旅吧！'
                  : '当前筛选条件下没有任务'}
              </p>
              {tasks.length === 0 && (
                <button
                  onClick={() => router.push('/goals/new')}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  创建目标
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onDifficultyChange={handleDifficultyChange}
                />
              ))}
            </div>
          )}
        </section>

        {/* 进行中目标模块 */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">进行中目标</h2>
            <a
              href="/goals"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              管理 →
            </a>
          </div>

          {activeGoals.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-400">暂无进行中的目标</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeGoals.map(goal => (
                <div
                  key={goal.id}
                  className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/plan/${goal.id}`)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{goal.title}</h3>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      {categoryLabels[goal.category] || goal.category}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>进度 {goal.progress}%</span>
                    <span>{goal.done_tasks}/{goal.total_tasks} 任务</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 已完成目标模块 */}
        {completedGoals.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">已完成目标</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedGoals.map(goal => (
                <div
                  key={goal.id}
                  className="bg-white rounded-lg shadow p-4 opacity-75"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{goal.title}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      已完成
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }} />
                  </div>
                  <p className="text-sm text-gray-500">🎉 恭喜完成！</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
