import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/plans — 获取计划列表或单个计划
 * ?id=xxx — 获取单个计划（含任务）
 * ?goal_id=xxx — 获取目标下的计划
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const goalId = searchParams.get('goal_id')

    if (id) {
      // 获取单个计划（含关联的任务和目标信息）
      const { data: plan, error } = await supabase
        .from('plans')
        .select(`
          *,
          goals (
            id,
            title,
            category,
            description,
            user_id
          ),
          tasks (
            id,
            title,
            due_date,
            status,
            difficulty_rating,
            completed_at,
            created_at
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        throw error
      }

      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
      }

      // 按创建时间排序任务
      const sortedTasks = (plan.tasks || []).sort(
        (a: { created_at: string }, b: { created_at: string }) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

      return NextResponse.json({
        plan: {
          ...plan,
          tasks: sortedTasks,
        },
      })
    }

    if (goalId) {
      // 获取目标下的所有计划（含版本历史）
      const { data: plans, error } = await supabase
        .from('plans')
        .select('*')
        .eq('goal_id', goalId)
        .order('version', { ascending: false })

      if (error) {
        throw error
      }

      return NextResponse.json({ plans: plans || [] })
    }

    // 默认返回所有活跃计划
    const { data: plans, error } = await supabase
      .from('plans')
      .select(`
        *,
        goals (
          id,
          title,
          category
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ plans: plans || [] })
  } catch (error) {
    console.error('Failed to fetch plans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/plans — 创建新计划版本
 * Body: { goal_id, content }
 * 自动递增版本号，将旧版本设为非活跃
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const { goal_id, content } = body

    if (!goal_id || !content) {
      return NextResponse.json(
        { error: 'goal_id and content are required' },
        { status: 400 }
      )
    }

    // 获取当前最新版本号
    const { data: existingPlans } = await supabase
      .from('plans')
      .select('version')
      .eq('goal_id', goal_id)
      .order('version', { ascending: false })
      .limit(1)

    const nextVersion = existingPlans && existingPlans.length > 0
      ? existingPlans[0].version + 1
      : 1

    // 将旧版本设为非活跃
    await supabase
      .from('plans')
      .update({ is_active: false })
      .eq('goal_id', goal_id)
      .eq('is_active', true)

    // 创建新版本
    const { data: plan, error } = await supabase
      .from('plans')
      .insert({
        goal_id,
        content,
        version: nextVersion,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
    console.error('Failed to create plan:', error)
    return NextResponse.json(
      { error: 'Failed to create plan' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/plans — 更新计划（仅活跃版本可调整）
 * Body: { id, content? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const { id, content } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Plan id is required' },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (content) {
      updates.content = content
    }

    const { data: plan, error } = await supabase
      .from('plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Failed to update plan:', error)
    return NextResponse.json(
      { error: 'Failed to update plan' },
      { status: 500 }
    )
  }
}
