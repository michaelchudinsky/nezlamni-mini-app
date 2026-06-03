import { runReminderCron } from "../../../../lib/reminderCron";

export async function GET(request: Request) {
  return runReminderCron(request);
}
