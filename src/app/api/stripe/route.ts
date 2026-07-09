import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const supabase = createAdminClient()

// Stripe 价格 ID（需要在 Stripe Dashboard 中创建）
const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || 'price_monthly_placeholder',
  yearly: process.env.STRIPE_PRICE_YEARLY || 'price_yearly_placeholder',
}

/**
 * POST /api/stripe — 处理 Stripe 相关操作
 * action: createCheckout | createPortal | checkSubscription
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId, email, priceType } = body

    switch (action) {
      case 'createCheckout':
        return await createCheckout(email, priceType)

      case 'createPortal':
        return await createPortal(userId)

      case 'checkSubscription':
        return await checkSubscription(userId)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Stripe API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 创建 Stripe Checkout Session
 */
async function createCheckout(email: string, priceType: 'monthly' | 'yearly') {
  const priceId = PRICE_IDS[priceType]

  // 如果没有配置真实的 Stripe 密钥，返回模拟数据
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_placeholder')) {
    // 开发模式：返回模拟的 checkout URL
    return NextResponse.json({
      url: `/dashboard?checkout=mock&plan=${priceType}`,
      mock: true,
    })
  }

  // 真实 Stripe 集成
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-06-24.dahlia',
  })

  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/plan`,
    subscription_data: {
      trial_period_days: 3,
    },
    metadata: {
      priceType,
    },
  })

  return NextResponse.json({ url: session.url })
}

/**
 * 创建 Stripe 客户门户（管理订阅）
 */
async function createPortal(userId: string) {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_placeholder')) {
    return NextResponse.json({
      url: '/settings',
      mock: true,
    })
  }

  // 获取用户的 Stripe 客户 ID
  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (!user?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No Stripe customer found' },
      { status: 404 }
    )
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-06-24.dahlia',
  })

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
  })

  return NextResponse.json({ url: session.url })
}

/**
 * 检查用户订阅状态
 */
async function checkSubscription(userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('subscription_status, trial_expires_at, stripe_subscription_id')
    .eq('id', userId)
    .single()

  if (!user) {
    return NextResponse.json({ status: 'unknown' })
  }

  const now = new Date()
  const trialExpires = user.trial_expires_at ? new Date(user.trial_expires_at) : null

  let status = user.subscription_status

  // 检查试用是否过期
  if (status === 'trial' && trialExpires && now > trialExpires) {
    // 试用过期，降级为免费版
    status = 'free'
    await supabase
      .from('users')
      .update({ subscription_status: 'free' })
      .eq('id', userId)
  }

  return NextResponse.json({
    status,
    trialExpiresAt: user.trial_expires_at,
    isTrialExpired: status === 'free' && trialExpires && now > trialExpires,
  })
}

/**
 * GET /api/stripe — 获取订阅信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    return await checkSubscription(userId)
  } catch (error) {
    console.error('Stripe GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
