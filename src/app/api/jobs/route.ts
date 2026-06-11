import { requireSession } from "@/lib/auth";
import { getRecentJobs, enqueueJob } from "@/lib/jobs/queue";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import type { JobType } from "@/generated/prisma/client";

export async function GET() {
  try {
    await requireSession();
    const jobs = await getRecentJobs();
    return jsonOk(jobs);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const { type, payload } = await request.json();

    const validTypes: JobType[] = [
      "FETCH_NEWS",
      "GENERATE_SCRIPT",
      "GENERATE_VIDEO",
      "POST_TO_TIKTOK",
    ];

    if (!validTypes.includes(type)) {
      return jsonError("Invalid job type");
    }

    const job = await enqueueJob(type, payload);
    return jsonOk(job, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
