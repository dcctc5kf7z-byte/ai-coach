-- ============================================================
-- 账户清理定时任务（pg_cron）
-- AI Coach MVP
-- ============================================================
-- 注意：需要在 Supabase Dashboard → Database → Extensions 中启用 pg_cron
-- ============================================================

-- 1. 创建清理函数
CREATE OR REPLACE FUNCTION cleanup_deleted_accounts()
RETURNS void AS $$
BEGIN
  -- 删除已标记删除超过 90 天的用户数据
  -- 注意：由于外键约束，需要按顺序删除

  -- 1. 删除对话记录
  DELETE FROM conversations
  WHERE user_id IN (
    SELECT id FROM users
    WHERE deleted_at IS NOT NULL
    AND scheduled_deletion_at < NOW()
  );

  -- 2. 删除任务
  DELETE FROM tasks
  WHERE plan_id IN (
    SELECT p.id FROM plans p
    JOIN goals g ON g.id = p.goal_id
    WHERE g.user_id IN (
      SELECT id FROM users
      WHERE deleted_at IS NOT NULL
      AND scheduled_deletion_at < NOW()
    )
  );

  -- 3. 删除计划
  DELETE FROM plans
  WHERE goal_id IN (
    SELECT id FROM goals
    WHERE user_id IN (
      SELECT id FROM users
      WHERE deleted_at IS NOT NULL
      AND scheduled_deletion_at < NOW()
    )
  );

  -- 4. 删除目标
  DELETE FROM goals
  WHERE user_id IN (
    SELECT id FROM users
    WHERE deleted_at IS NOT NULL
    AND scheduled_deletion_at < NOW()
  );

  -- 5. 删除用户记录
  DELETE FROM users
  WHERE deleted_at IS NOT NULL
  AND scheduled_deletion_at < NOW();

  -- 记录清理日志
  RAISE NOTICE 'Deleted accounts cleanup completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- 2. 创建定时任务（每天凌晨 3 点执行）
-- 注意：pg_cron 语法：分钟 小气 日 月 星期
SELECT cron.schedule(
  'cleanup-deleted-accounts',  -- 任务名称
  '0 3 * * *',                 -- 每天凌晨 3 点
  'SELECT cleanup_deleted_accounts()'
);

-- 3. 查看已创建的定时任务
-- SELECT * FROM cron.job;

-- 4. 手动触发清理（测试用）
-- SELECT cleanup_deleted_accounts();

-- 5. 删除定时任务（如需要）
-- SELECT cron.unschedule('cleanup-deleted-accounts');
