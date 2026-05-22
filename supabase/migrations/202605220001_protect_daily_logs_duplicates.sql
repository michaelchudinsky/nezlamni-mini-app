-- Protect user points from duplicate daily task records.
-- Run this in Supabase SQL Editor before opening the beta to users.

begin;

-- If duplicate records already exist, keep one row and remove the rest.
-- ctid is used here so the cleanup works even if daily_logs has no numeric id.
delete from daily_logs duplicate
using daily_logs keeper
where duplicate.ctid < keeper.ctid
  and duplicate.profile_id = keeper.profile_id
  and duplicate.task_code = keeper.task_code
  and duplicate.event_day = keeper.event_day;

-- One user can only have one log for the same task/subtask on the same day.
create unique index if not exists daily_logs_unique_profile_task_day
on daily_logs (profile_id, task_code, event_day);

commit;
