import { requireSession } from "@/lib/auth";
import { retryAllFailedJobs } from "@/lib/jobs/queue";
import { jsonOk, handleApiError } from "@/lib/api";

export async function POST() {
  try {
    await requireSession();
    const result = await retryAllFailedJobs();
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
