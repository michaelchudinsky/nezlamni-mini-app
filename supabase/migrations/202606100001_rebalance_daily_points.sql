begin;

-- Main tasks now award 25 points total; two daily bonus tasks add 5 more.
update daily_logs
set points = case task_code
  when 'food_protein_armor' then 3
  when 'food_no_snacks' then 2
  when 'food_three_meals' then 2
  when 'food_dinner_before_20' then 1
  when 'activity_walk_30' then 2
  when 'activity_walk_60_pro' then 4
  when 'activity_walk_90_pro' then 6
  when 'activity_workout_20' then 2
  when 'night_sleep_7' then 2
  when 'night_no_food_after_20' then 2
  else points
end
where task_code in (
  'food_protein_armor',
  'food_no_snacks',
  'food_three_meals',
  'food_dinner_before_20',
  'activity_walk_30',
  'activity_walk_60_pro',
  'activity_walk_90_pro',
  'activity_workout_20',
  'night_sleep_7',
  'night_no_food_after_20'
);

with profile_points as (
  select
    profiles.id as profile_id,
    coalesce(sum(daily_logs.points), 0) as points_total,
    coalesce(
      sum(daily_logs.points) filter (
        where daily_logs.event_day = current_date
      ),
      0
    ) as points_today
  from profiles
  left join daily_logs on daily_logs.profile_id = profiles.id
  group by profiles.id
)
update profiles
set
  points_total = profile_points.points_total,
  points_today = profile_points.points_today
from profile_points
where profiles.id = profile_points.profile_id;

commit;
