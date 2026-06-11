import { LucideIcon } from "lucide-react";
import clsx from "clsx";

export function StatsCard({
  title,
  value,
  icon: Icon,
  color = "violet",
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: "violet" | "blue" | "emerald" | "amber" | "red";
}) {
  const colors = {
    violet: "from-violet-500/20 to-violet-600/5 text-violet-400",
    blue: "from-blue-500/20 to-blue-600/5 text-blue-400",
    emerald: "from-emerald-500/20 to-emerald-600/5 text-emerald-400",
    amber: "from-amber-500/20 to-amber-600/5 text-amber-400",
    red: "from-red-500/20 to-red-600/5 text-red-400",
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-gradient-to-br p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-zinc-100">{value}</p>
        </div>
        <div
          className={clsx(
            "flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br",
            colors[color]
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
