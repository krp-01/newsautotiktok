"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListTodo, Play, Loader2, RotateCcw, RefreshCw } from "lucide-react";

interface Job {
  id: string;
  type: string;
  status: string;
  errorMessage: string | null;
  payload: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  async function loadJobs() {
    const res = await fetch("/api/jobs");
    const data = await res.json();
    setJobs(data);
    setLoading(false);
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function runJobs() {
    setRunning(true);
    try {
      await fetch("/api/jobs/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "jobs", limit: 20 }),
      });
      await loadJobs();
    } finally {
      setRunning(false);
    }
  }

  async function retryJob(jobId: string) {
    setRetrying(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/retry`, { method: "POST" });
      if (res.ok) await loadJobs();
    } finally {
      setRetrying(null);
    }
  }

  async function retryAllFailed() {
    setRetryingAll(true);
    try {
      const res = await fetch("/api/jobs/retry-all", { method: "POST" });
      if (res.ok) await loadJobs();
    } finally {
      setRetryingAll(false);
    }
  }

  function toggleError(jobId: string) {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  const failedCount = jobs.filter((j) => j.status === "FAILED").length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Jobs"
        description="Coadă de joburi pentru automatizare"
        actions={
          <div className="flex flex-wrap gap-2">
            {failedCount > 0 && (
              <button
                onClick={retryAllFailed}
                disabled={retryingAll}
                className="btn-secondary"
              >
                {retryingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Retry all failed ({failedCount})
              </button>
            )}
            <button onClick={runJobs} disabled={running} className="btn-primary">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run pending jobs
            </button>
          </div>
        }
      />

      {jobs.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Niciun job"
          description="Joburile sunt create automat la fetch, generare script/video sau postare."
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const isExpanded = expandedErrors.has(job.id);
            const hasLongError = (job.errorMessage?.length ?? 0) > 80;

            return (
              <div key={job.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={job.type} />
                    <StatusBadge status={job.status} />
                    <span className="text-xs text-zinc-500">
                      {new Date(job.createdAt).toLocaleString("ro-RO")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {job.status === "FAILED" && (
                      <button
                        onClick={() => retryJob(job.id)}
                        disabled={retrying === job.id}
                        className="btn-secondary !px-3 !py-1 !text-xs"
                      >
                        {retrying === job.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        Retry failed job
                      </button>
                    )}
                  </div>
                </div>

                {job.payload && (
                  <p className="mt-2 font-mono text-xs text-zinc-500">{job.payload}</p>
                )}

                {job.errorMessage && (
                  <div className="mt-3 rounded-lg bg-red-500/10 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-xs text-red-400 ${!isExpanded && hasLongError ? "line-clamp-2" : "whitespace-pre-wrap break-all"}`}
                      >
                        {job.errorMessage}
                      </p>
                      {hasLongError && (
                        <button
                          onClick={() => toggleError(job.id)}
                          className="shrink-0 text-xs text-red-300 hover:underline"
                        >
                          {isExpanded ? "Ascunde" : "Vezi tot"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {job.completedAt && (
                  <p className="mt-2 text-xs text-zinc-600">
                    Finalizat: {new Date(job.completedAt).toLocaleString("ro-RO")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
