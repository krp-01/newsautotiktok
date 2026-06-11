"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Rss, Download, Trash2, Loader2 } from "lucide-react";

interface Source {
  id: string;
  name: string;
  baseUrl: string;
  rssUrl: string;
  category: string;
  active: boolean;
  autoMode: boolean;
  createdAt: string;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [fetching, setFetching] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    baseUrl: "",
    rssUrl: "",
    category: "general",
    active: true,
    autoMode: false,
  });

  async function loadSources() {
    const res = await fetch("/api/sources");
    const data = await res.json();
    setSources(data);
    setLoading(false);
  }

  useEffect(() => {
    loadSources();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setModalOpen(false);
      setForm({ name: "", baseUrl: "", rssUrl: "", category: "general", active: true, autoMode: false });
      loadSources();
    }
  }

  async function handleFetch(id: string) {
    setFetching(id);
    try {
      await fetch(`/api/sources/${id}/fetch`, { method: "POST" });
      alert("Știri preluate cu succes!");
    } catch {
      alert("Eroare la preluare");
    } finally {
      setFetching(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Ștergi această sursă?")) return;
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    loadSources();
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
        title="Sources Manager"
        description="Gestionează sursele RSS de știri"
        actions={
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Adaugă sursă
          </button>
        }
      />

      {sources.length === 0 ? (
        <EmptyState
          icon={Rss}
          title="Nicio sursă configurată"
          description="Adaugă primul site de știri pentru a începe preluarea automată."
          action={
            <button onClick={() => setModalOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4" />
              Adaugă sursă
            </button>
          }
        />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nume</th>
                <th>RSS URL</th>
                <th>Categorie</th>
                <th>Status</th>
                <th>Auto</th>
                <th>Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id}>
                  <td className="font-medium text-zinc-100">{source.name}</td>
                  <td className="max-w-xs truncate text-zinc-500">{source.rssUrl}</td>
                  <td>{source.category}</td>
                  <td>
                    <span className={source.active ? "text-emerald-400" : "text-zinc-500"}>
                      {source.active ? "Activ" : "Inactiv"}
                    </span>
                  </td>
                  <td>
                    <span className={source.autoMode ? "text-violet-400" : "text-zinc-500"}>
                      {source.autoMode ? "Da" : "Nu"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFetch(source.id)}
                        disabled={fetching === source.id}
                        className="btn-secondary !px-2 !py-1"
                      >
                        {fetching === source.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        Fetch
                      </button>
                      <button
                        onClick={() => handleDelete(source.id)}
                        className="btn-danger !px-2 !py-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Adaugă sursă RSS">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Nume redacție / sursă</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Base URL</label>
            <input
              className="input-field"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              placeholder="https://example.com"
              required
            />
          </div>
          <div>
            <label className="label">RSS URL</label>
            <input
              className="input-field"
              value={form.rssUrl}
              onChange={(e) => setForm({ ...form, rssUrl: e.target.value })}
              placeholder="https://example.com/feed"
              required
            />
          </div>
          <div>
            <label className="label">Categorie</label>
            <input
              className="input-field"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Activ
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={form.autoMode}
              onChange={(e) => setForm({ ...form, autoMode: e.target.checked })}
            />
            Auto mode (generează automat script după fetch)
          </label>
          <button type="submit" className="btn-primary w-full">
            Salvează
          </button>
        </form>
      </Modal>
    </div>
  );
}
