import { getGuestDeviceId } from "@/lib/guest";
import { getApiUrl } from "@/lib/api";
import { formatDisplayName } from "@/lib/names";
import { sanitizePostAuthRedirect, storePostAuthRedirect } from "@/lib/post-auth-redirect";

export type AuthProvider = "google" | "guest";

export interface AuthUser {
  id: string;
  email: string | null;
  username: string;
  avatarUrl: string | null;
  provider: AuthProvider;
}

interface MeResponse {
  id: string;
  provider: AuthProvider;
  email: string | null;
  name: string;
  avatar_url: string | null;
}

export interface UpdateProfileInput {
  name?: string;
  avatarUrl?: string | null;
  removeAvatar?: boolean;
}

let sessionRequest: Promise<AuthUser | null> | null = null;

/** Temporary audit logging — remove after auth stability is confirmed. */
function authLog(event: string, detail?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "production") return;
  console.log(`[auth] ${event}`, detail ?? "");
}

function mapMeResponse(data: MeResponse): AuthUser {
  return {
    id: data.id,
    email: data.email,
    username: formatDisplayName(data.name),
    avatarUrl: data.avatar_url,
    provider: data.provider,
  };
}

export function startGoogleSignIn(returnPath?: string | null): void {
  authLog("loginGoogle called");
  sessionRequest = null;
  sessionStorage.removeItem("svigl:auth-callback-processing");

  const safeNext = sanitizePostAuthRedirect(returnPath);
  if (safeNext) {
    storePostAuthRedirect(safeNext);
  }

  const params = new URLSearchParams();
  if (safeNext) {
    params.set("next", safeNext);
  }

  const query = params.toString();
  window.location.href = query
    ? `${getApiUrl()}/auth/google?${query}`
    : `${getApiUrl()}/auth/google`;
}

export async function startGuestSignIn(): Promise<AuthUser> {
  authLog("loginGuest called");
  sessionRequest = null;
  const guestDeviceId = getGuestDeviceId();

  authLog("/auth/guest request started", { guestDeviceId });
  const response = await fetch(`${getApiUrl()}/auth/guest`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guest_device_id: guestDeviceId }),
  });

  if (!response.ok) {
    throw new Error("Failed to sign in as guest.");
  }

  const data = (await response.json()) as MeResponse;
  const user = mapMeResponse(data);
  authLog("/auth/guest response", { userId: user.id, provider: user.provider });
  return user;
}

export async function fetchAuthSession(): Promise<AuthUser | null> {
  authLog("fetchAuthSession called", { deduped: Boolean(sessionRequest) });

  if (!sessionRequest) {
    authLog("/me request started");
    sessionRequest = fetch(`${getApiUrl()}/me`, {
      credentials: "include",
    })
      .then(async (response) => {
        authLog("/me response", { status: response.status });
        if (response.status === 401) {
          return null;
        }

        if (!response.ok) {
          throw new Error("Failed to load auth session.");
        }

        const data = (await response.json()) as MeResponse;
        const user = mapMeResponse(data);
        authLog("/me response body", { userId: user.id, provider: user.provider });
        return user;
      })
      .finally(() => {
        sessionRequest = null;
      });
  }

  return sessionRequest;
}

export async function updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
  sessionRequest = null;

  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.removeAvatar) body.remove_avatar = true;
  else if (input.avatarUrl !== undefined) body.avatar_url = input.avatarUrl;

  const response = await fetch(`${getApiUrl()}/me`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? "Failed to update profile.");
  }

  const data = (await response.json()) as MeResponse;
  return mapMeResponse(data);
}

export async function signOut(): Promise<void> {
  authLog("logout called");
  sessionRequest = null;

  await fetch(`${getApiUrl()}/logout`, {
    method: "POST",
    credentials: "include",
  });

  window.location.href = "/sign-in";
}
