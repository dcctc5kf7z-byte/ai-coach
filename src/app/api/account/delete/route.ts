import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/account/delete
 * 软删除用户账户（90天后清理）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: '缺少 userId' }, { status: 400 })
    }

    // 计算 90 天后的日期
    const scheduledDeletionDate = new Date()
    scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + 90)

    // 软删除：标记删除时间
    const { error } = await supabase
      .from('users')
      .update({
        deleted_at: new Date().toISOString(),
        scheduled_deletion_at: scheduledDeletionDate.toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('Soft delete error:', error)
      return NextResponse.json({ error: '删除失败' }, { status: 500 })
    }

    // 取消 Stripe 订阅（如果有）
    try {
      const { data: user } = await supabase
        .from('users')
        .select('stripe_subscription_id')
        .eq('id', userId)
        .single()

      if (user?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
        await stripe.subscriptions.cancel(user.stripe_subscription_id)
      }
    } catch (stripeError) {
      // Stripe 取消失败不影响删除流程
      console.error('Stripe cancellation error:', stripeError)
    }

    return NextResponse.json({
      success: true,
      message: '账户已标记删除，将在 90 天后永久删除',
      scheduledDeletionAt: scheduledDeletionDate.toISOString(),
    })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
