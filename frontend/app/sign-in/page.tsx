import { Suspense } from "react";
import { SignInPage } from "@/features/auth/SignInPage";

export default function SignInRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-6 py-24">
          <p className="text-sm font-medium text-ink-muted">Loading…</p>
        </div>
      }
    >
      <SignInPage />
    </Suspense>
  );
}
