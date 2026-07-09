'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  User,
  CreditCard,
  Trash2,
  Crown,
  AlertTriangle,
  Loader2,
  Check,
  ExternalLink,
} from 'lucide-react'

interface UserInfo {
  id: string
  email: string
  name: string | null
  subscription_status: string
  trial_expires_at: string | null
  created_at: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (!userId) {
      router.push('/login')
      return
    }
    loadUserInfo(userId)
  }, [])

  const loadUserInfo = async (userId: string) => {
    try {
      const res = await fetch(`/api/settings?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setUserInfo(data.user)
      }
    } catch (error) {
      console.error('Failed to load user info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createPortal' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Portal error:', error)
      setMessage({ type: 'error', text: '无法打开订阅管理页面' })
    } finally {
      setPortalLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!userInfo) return
    setDeleteLoading(true)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userInfo.id }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: '账户已删除。您将在 90 天后被永久删除。' })
        setTimeout(() => {
          localStorage.clear()
          router.push('/login')
        }, 2000)
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || '删除失败' })
      }
    } catch (error) {
      console.error('Delete error:', error)
      setMessage({ type: 'error', text: '删除账户时出错' })
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pro': return 'Pro 会员'
      case 'trial': return '试用中'
      default: return '免费版'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pro': return 'bg-purple-100 text-purple-700'
      case 'trial': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">无法加载用户信息</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">设置</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Account Info */}
        <section className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              账户信息
            </h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">邮箱</span>
              <span className="text-sm font-medium">{userInfo.email}</span>
            </div>
            {userInfo.name && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">昵称</span>
                <span className="text-sm font-medium">{userInfo.name}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">注册时间</span>
              <span className="text-sm font-medium">
                {new Date(userInfo.created_at).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>
        </section>

        {/* Subscription */}
        <section className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-400" />
              订阅管理
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">当前套餐</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                      userInfo.subscription_status
                    )}`}
                  >
                    {getStatusLabel(userInfo.subscription_status)}
                  </span>
                  {userInfo.subscription_status === 'pro' && (
                    <Crown className="w-4 h-4 text-purple-500" />
                  )}
                </div>
              </div>
              {userInfo.subscription_status === 'trial' && userInfo.trial_expires_at && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">试用期剩余</p>
                  <p className="text-sm font-medium text-green-600">
                    {Math.max(
                      0,
                      Math.ceil(
                        (new Date(userInfo.trial_expires_at).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24)
                      )
                    )}{' '}
                    天
                  </p>
                </div>
              )}
            </div>

            {userInfo.subscription_status === 'pro' ? (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="w-full py-2.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
              >
                {portalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                管理订阅
              </button>
            ) : (
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" />
                升级到 Pro
              </button>
            )}
          </div>
        </section>

        {/* Free Tier Limits */}
        {userInfo.subscription_status === 'free' && (
          <section className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">免费版限制</h2>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-gray-400 rounded-full" />
                <span className="text-gray-600">每天 2 次 AI 对话</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-gray-400 rounded-full" />
                <span className="text-gray-600">最多 1 个活跃目标</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-gray-400 rounded-full" />
                <span className="text-gray-600">仅查看计划，不可调整</span>
              </div>
            </div>
          </section>
        )}

        {/* Danger Zone */}
        <section className="bg-white rounded-xl shadow-sm overflow-hidden border border-red-100">
          <div className="p-4 border-b border-red-100 bg-red-50">
            <h2 className="font-semibold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              危险区域
            </h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              删除账户后，您的数据将在 90 天后被永久删除。在此期间，您可以联系客服恢复账户。
            </p>
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="w-full py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                删除账户
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-red-600 font-medium">
                  确定要删除账户吗？此操作不可逆。
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    className="flex-1 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    确认删除
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* App Info */}
        <div className="text-center text-xs text-gray-400 py-4">
          <p>AI Coach v1.0.0</p>
          <p className="mt-1">© 2026 AI Coach. All rights reserved.</p>
        </div>
      </main>
    </div>
  )
}
