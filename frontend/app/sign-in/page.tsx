import { Suspense } from "react";
import { SignInPage } from "@/features/auth/SignInPage";
import { LoaderScreen } from "@/features/loaders";

export default function SignInRoute() {
  return (
    <Suspense fallback={<LoaderScreen kind="bars" label="Loading…" />}>
      <SignInPage />
    </Suspense>
  );
}
