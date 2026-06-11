"use client";

import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/Header";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Save, Upload, Loader2 } from "lucide-react";

interface Settings {
  publicationName: string;
  logoPath: string | null;
  defaultHashtags: string;
  autoPosting: boolean;
  autoApprove: boolean;
  fetchIntervalMinutes: number;
  videoTemplateStyle: string;
  watermarkEnabled: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        alert("Setări salvate!");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/logo", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setSettings((s) => s ? { ...s, logoPath: data.logoPath } : s);
      }
    } finally {
      setUploading(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <Header title="Settings" description="Configurare redacție și automatizare" />

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-medium text-zinc-300">Identitate redacție</h3>
          <div>
            <label className="label">Nume redacție</label>
            <input
              className="input-field"
              value={settings.publicationName}
              onChange={(e) => setSettings({ ...settings, publicationName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Logo</label>
            <div className="flex items-center gap-4">
              {settings.logoPath && (
                <img src={settings.logoPath} alt="Logo" className="h-12 w-12 rounded-lg object-contain bg-zinc-800" />
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary" disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload logo
              </button>
            </div>
          </div>
          <div>
            <label className="label">Hashtag-uri TikTok implicite</label>
            <input
              className="input-field"
              value={settings.defaultHashtags}
              onChange={(e) => setSettings({ ...settings, defaultHashtags: e.target.value })}
            />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-medium text-zinc-300">Automatizare</h3>
          <label className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3">
            <div>
              <p className="text-sm text-zinc-200">Auto approve</p>
              <p className="text-xs text-zinc-500">Articolele trec automat la generare video</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoApprove}
              onChange={(e) => setSettings({ ...settings, autoApprove: e.target.checked })}
              className="h-4 w-4"
            />
          </label>
          <label className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3">
            <div>
              <p className="text-sm text-zinc-200">Auto posting</p>
              <p className="text-xs text-zinc-500">Postare automată pe TikTok după generare video</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoPosting}
              onChange={(e) => setSettings({ ...settings, autoPosting: e.target.checked })}
              className="h-4 w-4"
            />
          </label>
          <div>
            <label className="label">Interval fetch news (minute)</label>
            <input
              type="number"
              className="input-field"
              value={settings.fetchIntervalMinutes}
              onChange={(e) => setSettings({ ...settings, fetchIntervalMinutes: parseInt(e.target.value) || 60 })}
              min={5}
            />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-medium text-zinc-300">Video template</h3>
          <div>
            <label className="label">Stil template</label>
            <select
              className="input-field"
              value={settings.videoTemplateStyle}
              onChange={(e) => setSettings({ ...settings, videoTemplateStyle: e.target.value })}
            >
              <option value="MINIMAL">Minimal</option>
              <option value="BOLD">Bold</option>
              <option value="CLASSIC">Classic</option>
            </select>
          </div>
          <label className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3">
            <div>
              <p className="text-sm text-zinc-200">Watermark redacție</p>
              <p className="text-xs text-zinc-500">Afișează numele redacției pe video</p>
            </div>
            <input
              type="checkbox"
              checked={settings.watermarkEnabled}
              onChange={(e) => setSettings({ ...settings, watermarkEnabled: e.target.checked })}
              className="h-4 w-4"
            />
          </label>
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvează setările
        </button>
      </form>
    </div>
  );
}
