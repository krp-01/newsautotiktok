import clsx from "clsx";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-violet-500",
        className
      )}
    />
  );
}
