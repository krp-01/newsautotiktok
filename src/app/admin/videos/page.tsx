"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Video, ExternalLink, Image, Mic, MicOff, Clock, Download, Film } from "lucide-react";

interface GeneratedVideo {
  id: string;
  videoPath: string;
  audioPath: string | null;
  duration: number | null;
  imageCount: number;
  sourceVideoUsed: boolean;
  voiceoverSkipped: boolean;
  createdAt: string;
  article: {
    id: string;
    title: string;
    status: string;
    category: string;
    source: { name: string };
  };
}

export default function VideosPage() {
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/videos")
      .then((r) => r.json())
      .then(setVideos)
      .finally(() => setLoading(false));
  }, []);

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
        title="Videos"
        description="Clipuri profesionale verticale cu layout news, voice-over și subtitrări"
      />

      {videos.length === 0 ? (
        <EmptyState
          icon={Video}
          title="Niciun video generat"
          description='Generează "script + professional video" din secțiunea Articles.'
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <div key={video.id} className="card overflow-hidden">
              <div className="aspect-[9/16] max-h-80 bg-zinc-900">
                <video src={video.videoPath} controls className="h-full w-full object-contain" />
              </div>
              <div className="p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={video.article.status} />
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <Image className="h-3 w-3" />
                    {video.imageCount} imagini
                  </span>
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <Clock className="h-3 w-3" />
                    {video.duration?.toFixed(0) ?? "?"}s
                  </span>
                  <span
                    className={`flex items-center gap-1 text-xs ${video.sourceVideoUsed ? "text-cyan-400" : "text-zinc-500"}`}
                  >
                    <Film className="h-3 w-3" />
                    {video.sourceVideoUsed ? "Video sursă" : "Fără video sursă"}
                  </span>
                  {video.voiceoverSkipped ? (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <MicOff className="h-3 w-3" />
                      Fără voice-over
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <Mic className="h-3 w-3" />
                      Voice-over RO
                    </span>
                  )}
                </div>
                <h3 className="line-clamp-2 text-sm font-medium text-zinc-100">
                  {video.article.title}
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {video.article.source.name} · {video.article.category}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a
                    href={video.videoPath}
                    target="_blank"
                    className="btn-secondary !text-xs"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Preview
                  </a>
                  <a href={video.videoPath} download className="btn-primary !text-xs">
                    <Download className="h-3 w-3" />
                    Download
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
