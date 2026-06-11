import clsx from "clsx";

const statusColors: Record<string, string> = {
  NEW: "bg-blue-500/20 text-blue-400",
  SCRIPT_GENERATED: "bg-purple-500/20 text-purple-400",
  VIDEO_GENERATED: "bg-indigo-500/20 text-indigo-400",
  READY_TO_POST: "bg-amber-500/20 text-amber-400",
  POSTED: "bg-emerald-500/20 text-emerald-400",
  FAILED: "bg-red-500/20 text-red-400",
  PENDING: "bg-yellow-500/20 text-yellow-400",
  RUNNING: "bg-cyan-500/20 text-cyan-400",
  DONE: "bg-emerald-500/20 text-emerald-400",
  ACTIVE: "bg-emerald-500/20 text-emerald-400",
  INACTIVE: "bg-zinc-500/20 text-zinc-400",
  EXPIRED: "bg-red-500/20 text-red-400",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusColors[status] || "bg-zinc-500/20 text-zinc-400"
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
