import { prisma } from "../prisma";
import type { JobType } from "@/generated/prisma/client";

export async function enqueueJob(type: JobType, payload?: Record<string, unknown>) {
  return prisma.job.create({
    data: {
      type,
      status: "PENDING",
      payload: payload ? JSON.stringify(payload) : null,
    },
  });
}

export async function getPendingJobs(limit = 10) {
  return prisma.job.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export async function getRecentJobs(limit = 50) {
  return prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function retryJob(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");
  if (job.status !== "FAILED") throw new Error("Only FAILED jobs can be retried");

  console.log(`[retryJob] Resetting job ${jobId} (${job.type}) FAILED → PENDING`);

  return prisma.job.update({
    where: { id: jobId },
    data: {
      status: "PENDING",
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    },
  });
}

export async function retryAllFailedJobs() {
  const failed = await prisma.job.findMany({ where: { status: "FAILED" } });
  console.log(`[retryAllFailedJobs] Resetting ${failed.length} failed job(s) to PENDING`);

  await prisma.job.updateMany({
    where: { status: "FAILED" },
    data: {
      status: "PENDING",
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    },
  });

  return { count: failed.length };
}
