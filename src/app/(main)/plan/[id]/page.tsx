'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PaywallModal from '@/components/PaywallModal'

interface PlanPhase {
  name: string
  duration: string
  tasks: string[]
}

interface PlanRisk {
  risk: string
  solution: string
}

interface PlanContent {
  title: string
  summary: string
  phases: PlanPhase[]
  keyFactors: string[]
  risks: PlanRisk[]
}

interface Task {
  id: string
  title: string
  status: string
  due_date: string | null
}

interface PlanData {
  id: string
  goal_id: string
  content: PlanContent
  version: number
  is_active: boolean
  created_at: string
  tasks: Task[]
  goals: {
    id: string
    title: string
    category: string
    description: string | null
    user_id: string
  }
}

export default function PlanPage() {
  const params = useParams()
  const router = useRouter()
  const planId = params.id as string

  const [plan, setPlan] = useState<PlanData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showPaywall, setShowPaywall] = useState(false)
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false)
  const [tasksGenerated, setTasksGenerated] = useState(false)

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans?id=${planId}`)
      if (res.ok) {
        const data = await res.json()
        setPlan(data.plan)
        // 检查是否已有任务
        if (data.plan?.tasks?.length > 0) {
          setTasksGenerated(true)
        }
      }
    } catch (error) {
      console.error('Failed to fetch plan:', error)
    } finally {
      setIsLoading(false)
    }
  }, [planId])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  // 从计划生成任务
  const handleStartPlan = async () => {
    if (!plan) return

    // 检查是否已有任务
    if (tasksGenerated) {
      // 已有任务，跳转到 dashboard
      router.push('/dashboard')
      return
    }

    // 检查订阅状态（简化版，实际需要从用户信息获取）
    // 暂时直接生成任务
    setIsGeneratingTasks(true)
    try {
      const content = plan.content as PlanContent
      const tasksToCreate: { title: string; dueDays: number }[] = []

      // 从每个阶段提取任务
      content.phases?.forEach((phase, phaseIndex) => {
        phase.tasks?.forEach((taskTitle, taskIndex) => {
          // 简单的日期分配：第一周的任务明天开始，后续递增
          const dueDays = phaseIndex * 7 + taskIndex + 1
          tasksToCreate.push({ title: taskTitle, dueDays })
        })
      })

      // 批量创建任务
      const createdTasks = []
      for (const task of tasksToCreate) {
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + task.dueDays)

        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan_id: plan.id,
            title: task.title,
            due_date: dueDate.toISOString().split('T')[0],
          }),
        })

        if (res.ok) {
          const data = await res.json()
          createdTasks.push(data.task)
        }
      }

      setTasksGenerated(true)
      // 刷新计划数据
      fetchPlan()

      // 显示成功提示
      alert(`已生成 ${createdTasks.length} 个任务！`)
    } catch (error) {
      console.error('Failed to generate tasks:', error)
      alert('任务生成失败，请重试')
    } finally {
      setIsGeneratingTasks(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">加载计划中...</p>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">计划不存在</p>
          <a href="/goals" className="text-blue-600 hover:underline">
            返回目标列表
          </a>
        </div>
      </div>
    )
  }

  const content = plan.content as PlanContent

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
              ← 返回
            </button>
            <h1 className="text-2xl font-bold text-gray-900">我的计划</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              v{plan.version}
            </span>
            {plan.goals && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {plan.goals.title}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 计划概览 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{content.title}</h2>
          <p className="text-gray-600">{content.summary}</p>
          {plan.goals?.description && (
            <p className="text-sm text-gray-400 mt-2">目标描述：{plan.goals.description}</p>
          )}
        </div>

        {/* 分阶段计划 */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">执行阶段</h3>
          {content.phases?.map((phase, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{phase.name}</h4>
                  <p className="text-sm text-gray-500">{phase.duration}</p>
                </div>
              </div>
              <ul className="space-y-3 ml-13">
                {phase.tasks?.map((task, taskIndex) => (
                  <li key={taskIndex} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      {taskIndex + 1}
                    </span>
                    <span className="text-gray-700">{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 关键成功因素 */}
        {content.keyFactors?.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 关键成功因素</h3>
            <div className="flex flex-wrap gap-2">
              {content.keyFactors.map((factor, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm border border-green-200"
                >
                  {factor}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 风险与应对 */}
        {content.risks?.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚠️ 可能的风险与应对</h3>
            <div className="space-y-4">
              {content.risks.map((risk, index) => (
                <div key={index} className="flex gap-4 p-3 bg-red-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <span className="text-red-500 text-lg">⚠️</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{risk.risk}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="text-green-600 font-medium">应对：</span>
                      {risk.solution}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 已生成的任务预览 */}
        {tasksGenerated && plan.tasks && plan.tasks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 已生成的任务</h3>
            <div className="space-y-2">
              {plan.tasks.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center gap-3 text-sm">
                  <span className={`w-2 h-2 rounded-full ${
                    task.status === 'done' ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span className={task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-700'}>
                    {task.title}
                  </span>
                  {task.due_date && (
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(task.due_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              ))}
              {plan.tasks.length > 5 && (
                <p className="text-sm text-gray-400">
                  ...还有 {plan.tasks.length - 5} 个任务
                </p>
              )}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-4">
          <button
            onClick={handleStartPlan}
            disabled={isGeneratingTasks}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              tasksGenerated
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:bg-gray-300`}
          >
            {isGeneratingTasks
              ? '生成任务中...'
              : tasksGenerated
                ? '✅ 去执行计划'
                : '🚀 开始执行计划'}
          </button>
          <button
            onClick={() => setShowPaywall(true)}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 font-medium"
          >
            ✏️ 调整计划（Pro）
          </button>
        </div>

        {/* 免费版提示 */}
        {!tasksGenerated && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 <span className="font-medium">免费版</span>：可查看计划并生成任务执行。
              升级 <span className="font-medium">Pro</span> 可随时调整计划内容。
            </p>
          </div>
        )}

        {/* 付费墙弹窗 */}
        {showPaywall && (
          <PaywallModal
            onClose={() => setShowPaywall(false)}
            feature="plan"
          />
        )}
      </main>
    </div>
  )
}
