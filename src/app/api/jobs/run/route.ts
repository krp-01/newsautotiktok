import { requireSession } from "@/lib/auth";
import { runPendingJobs, runAutomationPipeline } from "@/lib/jobs/processor";
import { jsonOk, handleApiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const body = await request.json().catch(() => ({}));
    const mode = body.mode || "jobs";

    let result;
    if (mode === "automation") {
      result = await runAutomationPipeline();
      await logAudit("AUTOMATION_RUN", { userId: user.id, details: JSON.stringify(result) });
    } else {
      const limit = body.limit || 10;
      result = await runPendingJobs(limit);
      await logAudit("JOBS_RUN", { userId: user.id, details: `Processed ${result.length} jobs` });
    }

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
