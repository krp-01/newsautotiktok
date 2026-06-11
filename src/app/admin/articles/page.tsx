"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileText, Wand2, Video, Loader2, RotateCcw, CheckCircle, AlertCircle } from "lucide-react";

interface Article {
  id: string;
  title: string;
  url: string;
  status: string;
  category: string;
  approved: boolean;
  createdAt: string;
  source: { name: string };
  script: { tiktokTitle: string; voiceoverSkipped: boolean } | null;
  video: {
    videoPath: string;
    imageCount: number;
    sourceVideoUsed: boolean;
    voiceoverSkipped: boolean;
    duration: number | null;
  } | null;
}

type ActionPhase = "idle" | "script" | "video" | "done" | "error";

interface ActionState {
  phase: ActionPhase;
  message?: string;
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});
  const [filter, setFilter] = useState("");

  async function loadArticles() {
    const url = filter ? `/api/articles?status=${filter}` : "/api/articles";
    const res = await fetch(url);
    const data = await res.json();
    setArticles(data);
    setLoading(false);
  }

  useEffect(() => {
    loadArticles();
  }, [filter]);

  function setActionState(articleId: string, state: ActionState) {
    setActionStates((prev) => ({ ...prev, [articleId]: state }));
  }

  async function generateScriptAndVideo(articleId: string) {
    setActionState(articleId, { phase: "script", message: "Generating script..." });

    try {
      const scriptRes = await fetch(`/api/articles/${articleId}/generate-script`, {
        method: "POST",
      });
      const scriptData = await scriptRes.json();

      if (!scriptRes.ok) {
        setActionState(articleId, {
          phase: "error",
          message: scriptData.error || "Script generation failed",
        });
        return;
      }

      setActionState(articleId, { phase: "video", message: "Generating video..." });

      const videoRes = await fetch(`/api/articles/${articleId}/generate-video`, {
        method: "POST",
      });
      const videoData = await videoRes.json();

      if (!videoRes.ok) {
        setActionState(articleId, {
          phase: "error",
          message: videoData.error || "Video generation failed",
        });
        await loadArticles();
        return;
      }

      const imgCount = videoData.imageCount ?? "?";
      const sourceVideoLabel = videoData.sourceVideoUsed ? "video sursă: da" : "video sursă: nu";
      const voLabel = videoData.voiceoverSkipped
        ? `voice-over: nu${videoData.voiceoverReason ? ` (${videoData.voiceoverReason})` : ""}`
        : `voice-over: da (${videoData.voiceoverProvider || "TTS"})`;
      const durationLabel = videoData.duration ? `${videoData.duration.toFixed(0)}s` : "?s";
      setActionState(articleId, {
        phase: "done",
        message: `Gata — ${imgCount} imagini, ${sourceVideoLabel}, ${voLabel}, ${durationLabel}`,
      });
      await loadArticles();

      setTimeout(() => {
        setActionStates((prev) => {
          const next = { ...prev };
          delete next[articleId];
          return next;
        });
      }, 5000);
    } catch {
      setActionState(articleId, { phase: "error", message: "Connection error" });
    }
  }

  async function regenerateVideo(articleId: string) {
    setActionState(articleId, { phase: "video", message: "Regenerating video..." });

    try {
      const res = await fetch(`/api/articles/${articleId}/regenerate-video`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setActionState(articleId, {
          phase: "error",
          message: data.error || "Regeneration failed",
        });
        return;
      }

      setActionState(articleId, { phase: "done", message: "Done" });
      await loadArticles();

      setTimeout(() => {
        setActionStates((prev) => {
          const next = { ...prev };
          delete next[articleId];
          return next;
        });
      }, 3000);
    } catch {
      setActionState(articleId, { phase: "error", message: "Connection error" });
    }
  }

  function canGeneratePipeline(article: Article) {
    return (
      (article.status === "NEW" || article.status === "SCRIPT_GENERATED") && !article.video
    );
  }

  function renderActionStatus(articleId: string) {
    const state = actionStates[articleId];
    if (!state || state.phase === "idle") return null;

    const colors: Record<ActionPhase, string> = {
      idle: "",
      script: "text-violet-400",
      video: "text-cyan-400",
      done: "text-emerald-400",
      error: "text-red-400",
    };

    const icons: Record<ActionPhase, React.ReactNode> = {
      idle: null,
      script: <Loader2 className="h-3 w-3 animate-spin" />,
      video: <Loader2 className="h-3 w-3 animate-spin" />,
      done: <CheckCircle className="h-3 w-3" />,
      error: <AlertCircle className="h-3 w-3" />,
    };

    return (
      <span className={`flex items-center gap-1 text-xs ${colors[state.phase]}`}>
        {icons[state.phase]}
        {state.message}
      </span>
    );
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
        title="Articles Manager"
        description="Generează script jurnalistic + video profesional vertical"
        actions={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field !w-auto"
          >
            <option value="">Toate statusurile</option>
            <option value="NEW">NEW</option>
            <option value="SCRIPT_GENERATED">SCRIPT_GENERATED</option>
            <option value="READY_TO_POST">READY_TO_POST</option>
            <option value="POSTED">POSTED</option>
            <option value="FAILED">FAILED</option>
          </select>
        }
      />

      {articles.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Niciun articol"
          description="Preia știri din Sources pentru a le vedea aici."
        />
      ) : (
        <div className="space-y-4">
          {articles.map((article) => {
            const isBusy = !!actionStates[article.id] && actionStates[article.id].phase !== "done" && actionStates[article.id].phase !== "error";

            return (
              <div key={article.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={article.status} />
                      <span className="text-xs text-zinc-500">{article.source.name}</span>
                      {article.script && (
                        <span className="text-xs text-purple-400">
                          ✓ Script{article.script.voiceoverSkipped ? "" : " + VO"}
                        </span>
                      )}
                      {article.video && (
                        <span className="text-xs text-cyan-400">
                          ✓ Video ({article.video.imageCount} img{article.video.sourceVideoUsed ? ", video sursă" : ""}, {article.video.duration?.toFixed(0)}s)
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-zinc-100">{article.title}</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(article.createdAt).toLocaleString("ro-RO")} · {article.category}
                    </p>
                    <div className="mt-2">{renderActionStatus(article.id)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      {canGeneratePipeline(article) && (
                        <button
                          onClick={() => generateScriptAndVideo(article.id)}
                          disabled={isBusy}
                          className="btn-primary !text-xs"
                        >
                          {isBusy ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Wand2 className="h-3 w-3" />
                          )}
                          Generate script + professional video
                        </button>
                      )}
                      {article.video && (
                        <>
                          <a
                            href={article.video.videoPath}
                            target="_blank"
                            className="btn-secondary !text-xs"
                          >
                            <Video className="h-3 w-3" />
                            Preview
                          </a>
                          <button
                            onClick={() => regenerateVideo(article.id)}
                            disabled={isBusy}
                            className="btn-secondary !text-xs"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Regenerate video
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
