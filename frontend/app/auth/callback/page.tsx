import { Suspense } from "react";
import { AuthCallbackPage } from "@/features/auth/AuthCallbackPage";
import { LoaderScreen } from "@/features/loaders";

export default function AuthCallbackRoute() {
  return (
    <Suspense fallback={<LoaderScreen kind="bars" label="Signing you in…" />}>
      <AuthCallbackPage />
    </Suspense>
  );
}
