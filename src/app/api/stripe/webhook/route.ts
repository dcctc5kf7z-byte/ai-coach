import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Stripe Webhook 签名密钥
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

/**
 * POST /api/stripe/webhook — 处理 Stripe Webhook 事件
 *
 * 处理的事件：
 * - checkout.session.completed: 用户完成支付
 * - customer.subscription.created: 订阅创建
 * - customer.subscription.updated: 订阅更新
 * - customer.subscription.deleted: 订阅取消
 * - invoice.payment_succeeded: 续费成功
 * - invoice.payment_failed: 续费失败
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // 验证 Webhook 签名
    let event
    try {
      event = await verifyWebhookSignature(body, signature)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log(`Processing Stripe event: ${event.type}`)

    // 处理不同类型的事件
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * 验证 Stripe Webhook 签名
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string
): Promise<{ type: string; data: { object: Record<string, unknown> } }> {
  // 开发模式：如果没有配置 webhook secret，跳过验证
  if (!WEBHOOK_SECRET || WEBHOOK_SECRET === 'whsec_placeholder') {
    console.warn('Webhook secret not configured, skipping signature verification')
    return JSON.parse(payload)
  }

  // 生产模式：使用 Stripe SDK 验证签名
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  try {
    return stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET) as unknown as {
      type: string
      data: { object: Record<string, unknown> }
    }
  } catch {
    throw new Error('Webhook signature verification failed')
  }
}

/**
 * 处理 checkout.session.completed 事件
 * 用户完成了 Stripe Checkout 支付
 */
async function handleCheckoutCompleted(session: Record<string, unknown>) {
  const supabase = createAdminClient()
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  const email = (session.customer_details as { email?: string })?.email || session.customer_email as string
  const metadata = session.metadata as Record<string, string> | undefined

  console.log(`Checkout completed for ${email}, subscription: ${subscriptionId}`)

  // 查找或创建用户
  let userId = await findUserIdByCustomerId(customerId)

  if (!userId && email) {
    // 通过邮箱查找用户
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    userId = user?.id || null
  }

  if (!userId) {
    console.error('Could not find user for checkout session')
    return
  }

  // 更新用户订阅信息
  await supabase
    .from('users')
    .update({
      subscription_status: 'pro',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    })
    .eq('id', userId)

  console.log(`User ${userId} subscription activated`)
}

/**
 * 处理 customer.subscription.created/updated 事件
 * 订阅创建或更新（升级、降级、取消等）
 */
async function handleSubscriptionUpdate(subscription: Record<string, unknown>) {
  const supabase = createAdminClient()
  const subscriptionId = subscription.id as string
  const customerId = subscription.customer as string
  const status = subscription.status as string
  const cancelAtPeriodEnd = subscription.cancel_at_period_end as boolean

  console.log(`Subscription ${subscriptionId} updated: status=${status}, cancelAtPeriodEnd=${cancelAtPeriodEnd}`)

  // 查找用户
  const userId = await findUserIdByCustomerId(customerId)
  if (!userId) {
    console.error(`Could not find user for customer ${customerId}`)
    return
  }

  // 根据订阅状态确定用户的订阅类型
  let subscriptionStatus: 'trial' | 'free' | 'pro' = 'free'

  if (status === 'active' || status === 'trialing') {
    subscriptionStatus = 'pro'
  } else if (status === 'past_due') {
    // 逾期但未取消，暂时保持 pro 状态，等待支付
    subscriptionStatus = 'pro'
  } else if (status === 'canceled' || status === 'unpaid') {
    subscriptionStatus = 'free'
  }

  // 更新用户订阅状态
  await supabase
    .from('users')
    .update({
      subscription_status: subscriptionStatus,
      stripe_subscription_id: subscriptionId,
    })
    .eq('id', userId)

  console.log(`User ${userId} subscription status: ${subscriptionStatus}`)

  // 如果用户设置了取消，记录取消时间
  if (cancelAtPeriodEnd) {
    const cancelAt = subscription.cancel_at as number | null
    if (cancelAt) {
      console.log(`Subscription will cancel at ${new Date(cancelAt * 1000).toISOString()}`)
    }
  }
}

/**
 * 处理 customer.subscription.deleted 事件
 * 订阅已取消（过了取消期后触发）
 */
async function handleSubscriptionDeleted(subscription: Record<string, unknown>) {
  const supabase = createAdminClient()
  const subscriptionId = subscription.id as string
  const customerId = subscription.customer as string

  console.log(`Subscription ${subscriptionId} deleted`)

  // 查找用户
  const userId = await findUserIdByCustomerId(customerId)
  if (!userId) {
    console.error(`Could not find user for customer ${customerId}`)
    return
  }

  // 降级为免费版
  await supabase
    .from('users')
    .update({
      subscription_status: 'free',
      stripe_subscription_id: null,
    })
    .eq('id', userId)

  console.log(`User ${userId} downgraded to free`)
}

/**
 * 处理 invoice.payment_succeeded 事件
 * 续费成功
 */
async function handlePaymentSucceeded(invoice: Record<string, unknown>) {
  const supabase = createAdminClient()
  const subscriptionId = invoice.subscription as string
  const customerId = invoice.customer as string

  if (!subscriptionId) {
    console.log('Invoice not associated with subscription, skipping')
    return
  }

  console.log(`Payment succeeded for subscription ${subscriptionId}`)

  // 查找用户
  const userId = await findUserIdByCustomerId(customerId)
  if (!userId) {
    console.error(`Could not find user for customer ${customerId}`)
    return
  }

  // 确保用户是 pro 状态
  await supabase
    .from('users')
    .update({
      subscription_status: 'pro',
      stripe_subscription_id: subscriptionId,
    })
    .eq('id', userId)

  console.log(`User ${userId} payment confirmed, pro status maintained`)
}

/**
 * 处理 invoice.payment_failed 事件
 * 续费失败
 */
async function handlePaymentFailed(invoice: Record<string, unknown>) {
  const supabase = createAdminClient()
  const subscriptionId = invoice.subscription as string
  const customerId = invoice.customer as string
  const attemptCount = invoice.attempt_count as number

  console.log(`Payment failed for subscription ${subscriptionId}, attempt ${attemptCount}`)

  // 查找用户
  const userId = await findUserIdByCustomerId(customerId)
  if (!userId) {
    console.error(`Could not find user for customer ${customerId}`)
    return
  }

  // 如果多次失败，降级为免费版
  if (attemptCount >= 3) {
    await supabase
      .from('users')
      .update({
        subscription_status: 'free',
      })
      .eq('id', userId)

    console.log(`User ${userId} downgraded to free after ${attemptCount} failed attempts`)
  } else {
    // 前几次失败，保持 pro 状态但记录警告
    console.log(`User ${userId} payment failed, will retry (attempt ${attemptCount})`)
  }
}

/**
 * 通过 Stripe Customer ID 查找用户 ID
 */
async function findUserIdByCustomerId(customerId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  return user?.id || null
}
