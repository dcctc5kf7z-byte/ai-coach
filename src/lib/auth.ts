import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin'
import type { User, SubscriptionStatus } from '@/types'

/**
 * 注册新用户（邮箱+密码）
 * 注册成功后自动激活3天试用期
 */
export async function signUp(email: string, password: string, gdprConsent: boolean) {
  const supabase = createClient()

  if (!gdprConsent) {
    throw new Error('必须同意隐私政策和使用条款')
  }

  // 1. 创建Supabase Auth用户
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) throw authError
  if (!authData.user) throw new Error('注册失败')

  // 2. 创建用户记录（激活3天试用）
  const trialExpiresAt = new Date()
  trialExpiresAt.setDate(trialExpiresAt.getDate() + 3)

  const { error: dbError } = await supabase.from('users').insert({
    id: authData.user.id,
    email: authData.user.email!,
    subscription_status: 'trial',
    gdpr_consent: true,
    consent_granted_at: new Date().toISOString(),
    trial_expires_at: trialExpiresAt.toISOString(),
  })

  if (dbError) {
    console.error('创建用户记录失败:', dbError)
    // 不抛出异常，因为Auth用户已创建
  }

  return authData
}

/**
 * 登录
 */
export async function signIn(email: string, password: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error

  // 更新最后活跃时间
  if (data.user) {
    await supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', data.user.id)
  }

  return data
}

/**
 * 登出
 */
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * 获取当前用户信息（包含订阅状态）
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (error || !userData) return null

  return userData as User
}

/**
 * 获取用户订阅状态
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const user = await getCurrentUser()
  if (!user) return 'free'

  // 检查试用是否过期
  if (user.subscription_status === 'trial' && user.trial_expires_at) {
    const trialEnd = new Date(user.trial_expires_at)
    if (trialEnd < new Date()) {
      // 试用已过期，更新为免费用户
      const supabase = createClient()
      await supabase
        .from('users')
        .update({ subscription_status: 'free' })
        .eq('id', user.id)
      return 'free'
    }
  }

  return user.subscription_status
}

/**
 * 检查是否为Pro用户
 */
export async function isProUser(): Promise<boolean> {
  const status = await getSubscriptionStatus()
  return status === 'pro'
}

/**
 * 检查是否在试用期内
 */
export async function isInTrial(): Promise<boolean> {
  const status = await getSubscriptionStatus()
  return status === 'trial'
}

/**
 * 重置密码
 */
export async function resetPassword(email: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

/**
 * 更新密码
 */
export async function updatePassword(newPassword: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (error) throw error
}
