import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/tasks — 获取当前用户的任务列表
 * 支持 ?status=pending|done|skipped|overdue 筛选
 * 支持 ?goal_id=xxx 按目标筛选
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const goalId = searchParams.get('goal_id')

    // 先获取所有活跃目标下的任务
    let query = supabase
      .from('tasks')
      .select(`
        *,
        plans!inner (
          id,
          goal_id,
          goals!inner (
            id,
            title,
            category,
            user_id
          )
        )
      `)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (goalId) {
      query = query.eq('plans.goal_id', goalId)
    }

    const { data: tasks, error } = await query

    if (error) {
      throw error
    }

    // 扁平化返回数据
    const flattenedTasks = (tasks || []).map(t => ({
      id: t.id,
      plan_id: t.plan_id,
      title: t.title,
      due_date: t.due_date,
      status: t.status,
      difficulty_rating: t.difficulty_rating,
      actual_duration_minutes: t.actual_duration_minutes,
      feedback_note: t.feedback_note,
      completed_at: t.completed_at,
      created_at: t.created_at,
      goal_id: t.plans?.goal_id,
      goal_title: t.plans?.goals?.title,
      goal_category: t.plans?.goals?.category,
    }))

    return NextResponse.json({ tasks: flattenedTasks })
  } catch (error) {
    console.error('Failed to fetch tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/tasks — 更新任务状态（完成/跳过）+ 难度自评
 * Body: { id, status?, difficulty_rating?, feedback_note? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const { id, status, difficulty_rating, feedback_note } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Task id is required' },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {}

    if (status) {
      updates.status = status
      if (status === 'done') {
        updates.completed_at = new Date().toISOString()
      }
    }

    if (difficulty_rating !== undefined) {
      updates.difficulty_rating = difficulty_rating
    }

    if (feedback_note !== undefined) {
      updates.feedback_note = feedback_note
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Failed to update task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tasks — 创建新任务
 * Body: { plan_id, title, due_date? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const { plan_id, title, due_date } = body

    if (!plan_id || !title) {
      return NextResponse.json(
        { error: 'plan_id and title are required' },
        { status: 400 }
      )
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        plan_id,
        title: title.trim(),
        due_date: due_date || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Failed to create task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
