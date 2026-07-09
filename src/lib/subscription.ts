'use client'

import { useState, useEffect, useCallback } from 'react'

export type SubscriptionStatus = 'trial' | 'free' | 'pro'

interface SubscriptionInfo {
  status: SubscriptionStatus
  trialExpiresAt: string | null
  isTrialExpired: boolean
  isPro: boolean
  isTrial: boolean
  canUseFeature: (feature: 'chat' | 'goal' | 'plan_adjust') => boolean
}

/**
 * 获取用户订阅状态的 Hook
 * 用于客户端组件检查用户权限
 */
export function useSubscription(userId: string | null): SubscriptionInfo & { loading: boolean } {
  const [status, setStatus] = useState<SubscriptionStatus>('free')
  const [trialExpiresAt, setTrialExpiresAt] = useState<string | null>(null)
  const [isTrialExpired, setIsTrialExpired] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/stripe?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setStatus(data.status || 'free')
        setTrialExpiresAt(data.trialExpiresAt)
        setIsTrialExpired(data.isTrialExpired || false)
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const isPro = status === 'pro'
  const isTrial = status === 'trial' && !isTrialExpired

  // 检查用户是否可以使用某个功能
  const canUseFeature = (feature: 'chat' | 'goal' | 'plan_adjust'): boolean => {
    // Pro 用户可以使用所有功能
    if (isPro) return true

    // 试用期用户可以使用所有功能
    if (isTrial) return true

    // 免费用户的功能限制
    switch (feature) {
      case 'plan_adjust':
        // 免费用户不能调整计划
        return false
      case 'chat':
      case 'goal':
        // 免费用户可以使用基础功能（由 API 层控制次数）
        return true
      default:
        return false
    }
  }

  return {
    status,
    trialExpiresAt,
    isTrialExpired,
    isPro,
    isTrial,
    canUseFeature,
    loading,
  }
}

/**
 * 格式化订阅状态显示文本
 */
export function getStatusLabel(status: SubscriptionStatus, isTrialExpired: boolean): string {
  switch (status) {
    case 'pro':
      return 'Pro 会员'
    case 'trial':
      return isTrialExpired ? '试用已过期' : '试用中'
    case 'free':
      return '免费版'
    default:
      return '未知'
  }
}

/**
 * 获取订阅状态的颜色样式
 */
export function getStatusColor(status: SubscriptionStatus, isTrialExpired: boolean): string {
  switch (status) {
    case 'pro':
      return 'bg-purple-100 text-purple-700'
    case 'trial':
      return isTrialExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
    case 'free':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

/**
 * 计算试用期剩余天数
 */
export function getTrialDaysLeft(trialExpiresAt: string | null): number {
  if (!trialExpiresAt) return 0

  const expires = new Date(trialExpiresAt)
  const now = new Date()
  const diff = expires.getTime() - now.getTime()

  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
