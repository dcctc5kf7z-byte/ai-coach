import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/goals — 获取目标列表（含进度计算）
 * 支持 ?status=active|completed|paused 筛选
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('goals')
      .select(`
        *,
        plans (
          id,
          is_active,
          tasks (
            id,
            status
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: goals, error } = await query

    if (error) {
      throw error
    }

    // 计算每个目标的进度
    const goalsWithProgress = (goals || []).map(goal => {
      const activePlan = goal.plans?.find((p: { is_active: boolean }) => p.is_active)
      const tasks = activePlan?.tasks || []
      const totalTasks = tasks.length
      const doneTasks = tasks.filter((t: { status: string }) => t.status === 'done').length
      const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

      return {
        id: goal.id,
        title: goal.title,
        category: goal.category,
        description: goal.description,
        status: goal.status,
        created_at: goal.created_at,
        progress,
        total_tasks: totalTasks,
        done_tasks: doneTasks,
        has_active_plan: !!activePlan,
      }
    })

    return NextResponse.json({ goals: goalsWithProgress })
  } catch (error) {
    console.error('Failed to fetch goals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/goals — 创建新目标
 * Body: { title, category, description? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const { title, category, description, user_id } = body

    if (!title || !category) {
      return NextResponse.json(
        { error: 'Title and category are required' },
        { status: 400 }
      )
    }

    const { data: goal, error } = await supabase
      .from('goals')
      .insert({
        user_id: user_id || null,
        title: title.trim(),
        category,
        description: description?.trim() || null,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ goal }, { status: 201 })
  } catch (error) {
    console.error('Failed to create goal:', error)
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    )
  }
}
