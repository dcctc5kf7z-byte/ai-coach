-- ============================================================
-- Supabase RLS (Row Level Security) 策略
-- AI Coach MVP
-- ============================================================
-- 执行顺序：在 Supabase SQL Editor 中依次执行
-- 注意：需要先启用 RLS，然后创建策略
-- ============================================================

-- ============================================================
-- 1. 启用 RLS（所有表）
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. users 表策略
-- ============================================================
-- 规则：用户只能读取和更新自己的 profile

-- 用户可以读取自己的信息
CREATE POLICY "users_select_own"
ON users FOR SELECT
USING (auth.uid() = id);

-- 用户可以更新自己的信息
CREATE POLICY "users_update_own"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 用户可以插入自己的信息（注册时）
CREATE POLICY "users_insert_own"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================================
-- 3. goals 表策略
-- ============================================================
-- 规则：用户只能 CRUD 自己的目标

-- 用户可以读取自己的目标
CREATE POLICY "goals_select_own"
ON goals FOR SELECT
USING (auth.uid() = user_id);

-- 用户可以创建目标
CREATE POLICY "goals_insert_own"
ON goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的目标
CREATE POLICY "goals_update_own"
ON goals FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 用户可以删除自己的目标
CREATE POLICY "goals_delete_own"
ON goals FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================
-- 4. plans 表策略
-- ============================================================
-- 规则：用户只能读取和管理自己目标下的计划
-- 通过 goals 表的 user_id 进行关联验证

-- 用户可以读取自己目标的计划
CREATE POLICY "plans_select_own"
ON plans FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = plans.goal_id
    AND goals.user_id = auth.uid()
  )
);

-- 用户可以为自己目标创建计划
CREATE POLICY "plans_insert_own"
ON plans FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = plans.goal_id
    AND goals.user_id = auth.uid()
  )
);

-- 用户可以更新自己目标的计划
CREATE POLICY "plans_update_own"
ON plans FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = plans.goal_id
    AND goals.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = plans.goal_id
    AND goals.user_id = auth.uid()
  )
);

-- 用户可以删除自己目标的计划
CREATE POLICY "plans_delete_own"
ON plans FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM goals
    WHERE goals.id = plans.goal_id
    AND goals.user_id = auth.uid()
  )
);

-- ============================================================
-- 5. tasks 表策略
-- ============================================================
-- 规则：用户只能读取和管理自己计划下的任务
-- 通过 plans → goals → user_id 进行关联验证

-- 用户可以读取自己计划的任务
CREATE POLICY "tasks_select_own"
ON tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM plans
    JOIN goals ON goals.id = plans.goal_id
    WHERE plans.id = tasks.plan_id
    AND goals.user_id = auth.uid()
  )
);

-- 用户可以为自己计划创建任务
CREATE POLICY "tasks_insert_own"
ON tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM plans
    JOIN goals ON goals.id = plans.goal_id
    WHERE plans.id = tasks.plan_id
    AND goals.user_id = auth.uid()
  )
);

-- 用户可以更新自己计划的任务
CREATE POLICY "tasks_update_own"
ON tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM plans
    JOIN goals ON goals.id = plans.goal_id
    WHERE plans.id = tasks.plan_id
    AND goals.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM plans
    JOIN goals ON goals.id = plans.goal_id
    WHERE plans.id = tasks.plan_id
    AND goals.user_id = auth.uid()
  )
);

-- 用户可以删除自己计划的任务
CREATE POLICY "tasks_delete_own"
ON tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM plans
    JOIN goals ON goals.id = plans.goal_id
    WHERE plans.id = tasks.plan_id
    AND goals.user_id = auth.uid()
  )
);

-- ============================================================
-- 6. conversations 表策略
-- ============================================================
-- 规则：用户只能读取和创建自己的对话记录

-- 用户可以读取自己的对话
CREATE POLICY "conversations_select_own"
ON conversations FOR SELECT
USING (auth.uid() = user_id);

-- 用户可以创建对话
CREATE POLICY "conversations_insert_own"
ON conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的对话
CREATE POLICY "conversations_update_own"
ON conversations FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 用户可以删除自己的对话
CREATE POLICY "conversations_delete_own"
ON conversations FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================
-- 7. 索引优化（提升 RLS 查询性能）
-- ============================================================

-- users 表索引
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

-- goals 表索引
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- plans 表索引
CREATE INDEX IF NOT EXISTS idx_plans_goal_id ON plans(goal_id);

-- tasks 表索引
CREATE INDEX IF NOT EXISTS idx_tasks_plan_id ON tasks(plan_id);

-- conversations 表索引
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);

-- ============================================================
-- 8. 验证 RLS 策略
-- ============================================================
-- 执行以下查询验证 RLS 是否生效：
-- SELECT * FROM pg_policies WHERE tablename IN ('users', 'goals', 'plans', 'tasks', 'conversations');
