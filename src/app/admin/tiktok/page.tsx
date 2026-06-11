"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Share2, Link2, Plus } from "lucide-react";

interface TikTokAccount {
  id: string;
  displayName: string;
  username: string;
  openId: string;
  status: string;
  createdAt: string;
  _count: { posts: number };
}

export default function TikTokPage() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<TikTokAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState({
    displayName: "",
    username: "",
    openId: "",
    accessToken: "",
    refreshToken: "",
  });

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success) setMessage("Cont TikTok conectat cu succes!");
    if (error) setMessage(`Eroare: ${error}`);
  }, [searchParams]);

  async function loadAccounts() {
    const res = await fetch("/api/tiktok/accounts");
    const data = await res.json();
    setAccounts(data);
    setLoading(false);
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function handleOAuthConnect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/tiktok/auth/start");
      const data = await res.json();
      if (res.ok && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setMessage(data.error || "TikTok API not configured");
      }
    } catch {
      setMessage("Eroare la conectare");
    } finally {
      setConnecting(false);
    }
  }

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/tiktok/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(manualForm),
    });
    if (res.ok) {
      setModalOpen(false);
      loadAccounts();
    } else {
      const data = await res.json();
      setMessage(data.error);
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
        title="TikTok Accounts"
        description="Conturi oficiale conectate prin OAuth / Content Posting API"
        actions={
          <div className="flex gap-2">
            <button onClick={handleOAuthConnect} disabled={connecting} className="btn-primary">
              <Link2 className="h-4 w-4" />
              {connecting ? "Se conectează..." : "Conectează OAuth"}
            </button>
            <button onClick={() => setModalOpen(true)} className="btn-secondary">
              <Plus className="h-4 w-4" />
              Adaugă manual
            </button>
          </div>
        }
      />

      {message && (
        <div className="mb-6 rounded-lg bg-violet-500/10 px-4 py-3 text-sm text-violet-300">
          {message}
        </div>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="Niciun cont TikTok"
          description="Conectează un cont oficial TikTok prin OAuth pentru publicare automată."
          action={
            <button onClick={handleOAuthConnect} className="btn-primary">
              <Link2 className="h-4 w-4" />
              Conectează OAuth
            </button>
          }
        />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Display Name</th>
                <th>Username</th>
                <th>Open ID</th>
                <th>Status</th>
                <th>Postări</th>
                <th>Conectat</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="font-medium text-zinc-100">{account.displayName}</td>
                  <td>@{account.username}</td>
                  <td className="max-w-xs truncate text-zinc-500">{account.openId}</td>
                  <td><StatusBadge status={account.status} /></td>
                  <td>{account._count.posts}</td>
                  <td className="text-zinc-500">
                    {new Date(account.createdAt).toLocaleDateString("ro-RO")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Adaugă cont manual">
        <p className="mb-4 text-xs text-zinc-500">
          Token-urile sunt criptate în baza de date. Folosește doar conturi oficiale autorizate.
        </p>
        <form onSubmit={handleManualAdd} className="space-y-3">
          <input className="input-field" placeholder="Display Name" value={manualForm.displayName}
            onChange={(e) => setManualForm({ ...manualForm, displayName: e.target.value })} required />
          <input className="input-field" placeholder="Username" value={manualForm.username}
            onChange={(e) => setManualForm({ ...manualForm, username: e.target.value })} required />
          <input className="input-field" placeholder="Open ID" value={manualForm.openId}
            onChange={(e) => setManualForm({ ...manualForm, openId: e.target.value })} required />
          <input className="input-field" placeholder="Access Token" value={manualForm.accessToken}
            onChange={(e) => setManualForm({ ...manualForm, accessToken: e.target.value })} required />
          <input className="input-field" placeholder="Refresh Token (opțional)" value={manualForm.refreshToken}
            onChange={(e) => setManualForm({ ...manualForm, refreshToken: e.target.value })} />
          <button type="submit" className="btn-primary w-full">Salvează</button>
        </form>
      </Modal>
    </div>
  );
}
