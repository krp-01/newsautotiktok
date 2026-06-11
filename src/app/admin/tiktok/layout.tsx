import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function TikTokLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="flex h-64 items-center justify-center"><LoadingSpinner /></div>}>{children}</Suspense>;
}
