"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/ui/StatsCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Rss, FileText, Video, CheckCircle, XCircle, Play, AlertTriangle } from "lucide-react";

interface Analytics {
  activeSources: number;
  totalArticles: number;
  generatedVideos: number;
  successfulPosts: number;
  failedPosts: number;
  recentErrors: { id: string; type: string; errorMessage: string | null; createdAt: string }[];
  articlesByStatus: { status: string; count: number }[];
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setAnalytics)
      .finally(() => setLoading(false));
  }, []);

  async function runAutomation() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/jobs/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "automation" }),
      });
      const data = await res.json();
      if (res.ok) {
        setRunResult(
          `Automatizare finalizată: ${data.scripts} scripturi, ${data.videos} video-uri, ${data.posts} postări.`
        );
        const refreshed = await fetch("/api/analytics").then((r) => r.json());
        setAnalytics(refreshed);
      } else {
        setRunResult(data.error || "Eroare la rulare");
      }
    } catch {
      setRunResult("Eroare de conexiune");
    } finally {
      setRunning(false);
    }
  }

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
        title="Dashboard"
        description="Prezentare generală a pipeline-ului de automatizare"
        actions={
          <button onClick={runAutomation} disabled={running} className="btn-primary">
            <Play className="h-4 w-4" />
            {running ? "Se rulează..." : "Run automation now"}
          </button>
        }
      />

      {runResult && (
        <div className="mb-6 rounded-lg bg-violet-500/10 px-4 py-3 text-sm text-violet-300">
          {runResult}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard title="Surse active" value={analytics?.activeSources ?? 0} icon={Rss} color="blue" />
        <StatsCard title="Articole preluate" value={analytics?.totalArticles ?? 0} icon={FileText} color="violet" />
        <StatsCard title="Clipuri generate" value={analytics?.generatedVideos ?? 0} icon={Video} color="emerald" />
        <StatsCard title="Postări reușite" value={analytics?.successfulPosts ?? 0} icon={CheckCircle} color="emerald" />
        <StatsCard title="Postări eșuate" value={analytics?.failedPosts ?? 0} icon={XCircle} color="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-4 text-sm font-medium text-zinc-400">Articole după status</h3>
          <div className="space-y-3">
            {analytics?.articlesByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <StatusBadge status={item.status} />
                <span className="text-sm font-medium text-zinc-300">{item.count}</span>
              </div>
            ))}
            {!analytics?.articlesByStatus.length && (
              <p className="text-sm text-zinc-500">Niciun articol încă</p>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-400">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Ultimele erori
          </h3>
          <div className="space-y-3">
            {analytics?.recentErrors.map((err) => (
              <div key={err.id} className="rounded-lg bg-red-500/5 p-3">
                <div className="flex items-center justify-between">
                  <StatusBadge status={err.type} />
                  <span className="text-xs text-zinc-500">
                    {new Date(err.createdAt).toLocaleString("ro-RO")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-red-400">{err.errorMessage || "Unknown error"}</p>
              </div>
            ))}
            {!analytics?.recentErrors.length && (
              <p className="text-sm text-zinc-500">Nicio eroare recentă</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
