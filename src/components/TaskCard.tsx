'use client'

import { useState } from 'react'

interface Task {
  id: string
  title: string
  status: 'pending' | 'done' | 'skipped' | 'overdue'
  difficulty_rating: number | null
  due_date: string | null
  goal_title?: string
  goal_category?: string
}

interface TaskCardProps {
  task: Task
  onStatusChange?: (id: string, status: 'done' | 'skipped') => void
  onDifficultyChange?: (id: string, rating: number) => void
}

const statusConfig = {
  pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
  done: { label: '已完成', color: 'bg-green-100 text-green-700', icon: '✅' },
  skipped: { label: '已跳过', color: 'bg-gray-100 text-gray-600', icon: '⏭️' },
  overdue: { label: '已逾期', color: 'bg-red-100 text-red-700', icon: '⚠️' },
}

const categoryLabels: Record<string, string> = {
  career: '职业',
  health: '健康',
  finance: '财务',
  custom: '自定义',
}

export default function TaskCard({ task, onStatusChange, onDifficultyChange }: TaskCardProps) {
  const [showRating, setShowRating] = useState(false)
  const [localRating, setLocalRating] = useState(task.difficulty_rating || 0)
  const config = statusConfig[task.status]

  const handleComplete = () => {
    onStatusChange?.(task.id, 'done')
  }

  const handleSkip = () => {
    onStatusChange?.(task.id, 'skipped')
  }

  const handleRateDifficulty = (rating: number) => {
    setLocalRating(rating)
    onDifficultyChange?.(task.id, rating)
    setShowRating(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return '今天'
    if (date.toDateString() === tomorrow.toDateString()) return '明天'

    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
      {/* 头部：标题 + 状态 */}
      <div className="flex justify-between items-start mb-2">
        <h3 className={`font-medium flex-1 mr-2 ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {task.title}
        </h3>
        <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${config.color}`}>
          {config.icon} {config.label}
        </span>
      </div>

      {/* 元信息：目标 + 截止日期 */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        {task.goal_title && (
          <span className="bg-gray-100 px-2 py-0.5 rounded">
            {task.goal_category && `${categoryLabels[task.goal_category] || task.goal_category} · `}{task.goal_title}
          </span>
        )}
        {task.due_date && (
          <span>📅 {formatDate(task.due_date)}</span>
        )}
      </div>

      {/* 难度显示 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-gray-500">难度:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(level => (
            <button
              key={level}
              onClick={() => task.status === 'pending' && handleRateDifficulty(level)}
              className={`w-4 h-4 rounded-full transition-colors ${
                level <= (localRating || 0)
                  ? 'bg-orange-400'
                  : 'bg-gray-200'
              } ${task.status === 'pending' ? 'hover:bg-orange-300 cursor-pointer' : 'cursor-default'}`}
              title={`${level} 星`}
            />
          ))}
        </div>
        {localRating > 0 && (
          <span className="text-xs text-gray-400">({localRating}/5)</span>
        )}
      </div>

      {/* 操作按钮（仅 pending/overdue 状态显示） */}
      {(task.status === 'pending' || task.status === 'overdue') && (
        <div className="flex gap-2">
          <button
            onClick={handleComplete}
            className="flex-1 text-sm text-white bg-green-500 hover:bg-green-600 py-2 rounded-md transition-colors font-medium"
          >
            ✅ 完成
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 py-2 rounded-md transition-colors"
          >
            ⏭️ 跳过
          </button>
          <button
            onClick={() => setShowRating(!showRating)}
            className="text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-md transition-colors"
            title="评价难度"
          >
            ⭐
          </button>
        </div>
      )}

      {/* 难度评价弹出面板 */}
      {showRating && (
        <div className="mt-3 p-3 bg-orange-50 rounded-md">
          <p className="text-sm text-gray-700 mb-2">这个任务对你来说有多难？</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(level => (
              <button
                key={level}
                onClick={() => handleRateDifficulty(level)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  level === localRating
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-orange-200 border border-gray-300'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">1=很简单，5=非常难</p>
        </div>
      )}
    </div>
  )
}
