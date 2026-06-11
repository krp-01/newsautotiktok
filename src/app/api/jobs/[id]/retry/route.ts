import { requireSession } from "@/lib/auth";
import { retryJob } from "@/lib/jobs/queue";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;

    const job = await retryJob(id);
    return jsonOk(job);
  } catch (error) {
    if (error instanceof Error && error.message === "Only FAILED jobs can be retried") {
      return jsonError(error.message, 400);
    }
    if (error instanceof Error && error.message === "Job not found") {
      return jsonError(error.message, 404);
    }
    return handleApiError(error);
  }
}
