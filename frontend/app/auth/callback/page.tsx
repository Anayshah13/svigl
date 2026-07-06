import { Suspense } from "react";
import { AuthCallbackPage } from "@/features/auth/AuthCallbackPage";

export default function AuthCallbackRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-6 py-24">
          <p className="text-sm font-medium text-ink-muted">Signing you in…</p>
        </div>
      }
    >
      <AuthCallbackPage />
    </Suspense>
  );
}
