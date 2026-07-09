'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Settings } from 'lucide-react'
import ChatInterface from '@/components/ChatInterface'

export default function GoalChatPage() {
  const params = useParams()
  const router = useRouter()
  const goalId = params.goalId as string
  const [userId, setUserId] = useState<string | null>(null)
  const [goalTitle, setGoalTitle] = useState<string>('')
  const [isPlanAdjustment, setIsPlanAdjustment] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    if (storedUserId) {
      setUserId(storedUserId)
      loadGoalInfo(storedUserId)
    } else {
      router.push('/login')
    }
  }, [goalId])

  const loadGoalInfo = async (uid: string) => {
    try {
      const res = await fetch(`/api/goals?userId=${uid}`)
      if (res.ok) {
        const data = await res.json()
        const goal = data.goals?.find((g: { id: string }) => g.id === goalId)
        if (goal) {
          setGoalTitle(goal.title)
        }
      }
    } catch (error) {
      console.error('Failed to load goal info:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/chat')}
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold">{goalTitle || '目标对话'}</h1>
              <p className="text-xs text-gray-500">AI 教练 · 目标专属</p>
            </div>
          </div>
          <button
            onClick={() => setIsPlanAdjustment(!isPlanAdjustment)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isPlanAdjustment
                ? 'bg-indigo-100 text-indigo-600'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            调整计划
          </button>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 max-w-3xl mx-auto w-full">
        <ChatInterface
          userId={userId}
          goalId={goalId}
          goalTitle={goalTitle}
          isPlanAdjustment={isPlanAdjustment}
        />
      </div>
    </div>
  )
}
