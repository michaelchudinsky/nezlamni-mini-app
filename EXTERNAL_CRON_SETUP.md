# External Cron Setup

Use `cron-job.org` to trigger Telegram reminders while the Vercel project stays on the Hobby plan.

## Required Header

Add this header to every cron job:

```txt
Authorization: Bearer YOUR_CRON_SECRET
```

`YOUR_CRON_SECRET` must match the `CRON_SECRET` environment variable in Vercel.

## Jobs

Create three daily HTTP `GET` jobs.

| Timezone | Time | URL path | Reminder |
| --- | --- | --- | --- |
| Europe/Kyiv | 08:00 | `/api/cron/reminders/morning` | Ранковий старт |
| Europe/Kyiv | 15:00 | `/api/cron/reminders/water` | Вода і рух |
| Europe/Kyiv | 21:00 | `/api/cron/reminders/daily` | Нічний режим |

Use the production app domain before each path, for example:

```txt
https://your-production-domain.vercel.app/api/cron/reminders/morning
```

The app prevents duplicate deliveries for the same profile, reminder type, and day through the `reminder_deliveries` table.
