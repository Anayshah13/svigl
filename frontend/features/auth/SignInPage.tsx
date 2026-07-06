"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { startGoogleSignIn, startGuestSignIn } from "@/services/auth";
import { useSessionStore } from "@/stores/session";
import { colors } from "@/lib/colors";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authUser = useSessionStore((s) => s.authUser);
  const authReady = useSessionStore((s) => s.authReady);
  const error = searchParams.get("error");
  const [redirecting, setRedirecting] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  useEffect(() => {
    if (authReady && authUser) {
      router.replace("/");
    }
  }, [authReady, authUser, router]);

  const handleGuestSignIn = async () => {
    setRedirecting(true);
    setGuestError(null);
    try {
      const user = await startGuestSignIn();
      useSessionStore.getState().setAuth(user);
      useSessionStore.getState().setAuthReady(true);
      router.replace("/");
    } catch {
      setGuestError("Could not sign in as guest. Please try again.");
      setRedirecting(false);
    }
  };

  if (!authReady || authUser) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <p className="text-sm font-medium text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <Card
        className="w-full max-w-md rounded-3xl p-6 text-center sm:p-8"
        style={{
          boxShadow: `0 24px 48px -16px ${colors.plum}18, 0 0 0 1px rgba(255,255,255,0.85)`,
        }}
      >
        <p className="script-accent text-3xl font-semibold text-plum">Svigl</p>

        <h1 className="mt-5 text-xl font-bold tracking-tight text-ink sm:mt-6 sm:text-2xl">Welcome to Svigl</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Sign in with Google or play as a guest to enter the drawing gallery and play with friends.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-pink-light px-4 py-3 text-sm font-medium text-plum"
          >
            {error}
          </p>
        ) : null}

        {guestError ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-pink-light px-4 py-3 text-sm font-medium text-plum"
          >
            {guestError}
          </p>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-6 w-full gap-3 bg-white"
          disabled={redirecting}
          onClick={() => {
            setRedirecting(true);
            startGoogleSignIn();
          }}
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="mt-3 w-full"
          disabled={redirecting}
          onClick={() => void handleGuestSignIn()}
        >
          Play as Guest
        </Button>

        <p className="mt-6 text-xs text-ink-muted">
          By continuing, you agree to our terms for this demo environment.
        </p>

        <Link
          href="/gallery"
          className="mt-4 inline-block text-sm font-medium text-plum transition-colors hover:text-ink"
        >
          Browse gallery without signing in
        </Link>
      </Card>
    </div>
  );
}
