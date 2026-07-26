"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FadeIn } from "@/components/motion/FadeIn";
import { LoaderScreen } from "@/features/loaders";
import { profilePath } from "@/lib/names";
import { useSessionStore } from "@/stores/session";

export default function ProfileRedirectPage() {
  const router = useRouter();
  const authUser = useSessionStore((s) => s.authUser);
  const authReady = useSessionStore((s) => s.authReady);

  useEffect(() => {
    if (!authReady || !authUser?.username) return;
    router.replace(profilePath(authUser.username));
  }, [authReady, authUser?.username, router]);

  if (!authReady || authUser?.username) {
    return <LoaderScreen kind="dots" label="Opening profile…" />;
  }

  return (
    <div className="page-shell page-shell-narrow flex flex-col items-center justify-center gap-5 text-center sm:gap-6">
      <FadeIn>
        <h1 className="text-2xl font-bold text-ink">Your profile</h1>
        <p className="mt-2 text-ink-muted">
          Sign in to open your profile and visit other players&apos; pages.
        </p>
        <Link href="/sign-in" className="mt-4 inline-block text-sm text-plum hover:underline">
          Sign in
        </Link>
        <Link href="/" className="mt-2 inline-block text-sm text-plum hover:underline">
          Back to home
        </Link>
      </FadeIn>
    </div>
  );
}
