import { clearAccessToken, setAccessToken } from "@/lib/access-token";
import { getGuestDeviceId } from "@/lib/guest";
import { getApiUrl, withAuthHeaders } from "@/lib/api";
import { formatDisplayName } from "@/lib/names";
import { sanitizePostAuthRedirect, storePostAuthRedirect } from "@/lib/post-auth-redirect";

export type AuthProvider = "google" | "guest";

export interface AuthUser {
  id: string;
  email: string | null;
  username: string;
  avatarUrl: string | null;
  provider: AuthProvider;
  drawingsDone: number;
  likesReceived: number;
  dislikesReceived: number;
}

interface MeResponse {
  id: string;
  provider: AuthProvider;
  email: string | null;
  name: string;
  avatar_url: string | null;
  drawings_done?: number;
  likes_received?: number;
  dislikes_received?: number;
  access_token?: string;
}

export interface UpdateProfileInput {
  name?: string;
  avatarUrl?: string | null;
  removeAvatar?: boolean;
}

let sessionRequest: Promise<AuthUser | null> | null = null;

function mapMeResponse(data: MeResponse): AuthUser {
  return {
    id: data.id,
    email: data.email,
    username: formatDisplayName(data.name),
    avatarUrl: data.avatar_url,
    provider: data.provider,
    drawingsDone: data.drawings_done ?? 0,
    likesReceived: data.likes_received ?? 0,
    dislikesReceived: data.dislikes_received ?? 0,
  };
}

export function startGoogleSignIn(returnPath?: string | null): void {
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
  sessionRequest = null;
  const guestDeviceId = getGuestDeviceId();

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
  if (data.access_token) {
    setAccessToken(data.access_token);
  }
  return mapMeResponse(data);
}

export async function fetchAuthSession(): Promise<AuthUser | null> {
  if (!sessionRequest) {
    sessionRequest = fetch(`${getApiUrl()}/me`, {
      credentials: "include",
      headers: withAuthHeaders(),
    })
      .then(async (response) => {
        if (response.status === 401) {
          clearAccessToken();
          return null;
        }

        if (!response.ok) {
          throw new Error("Failed to load auth session.");
        }

        const data = (await response.json()) as MeResponse;
        return mapMeResponse(data);
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
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
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
  sessionRequest = null;

  await fetch(`${getApiUrl()}/logout`, {
    method: "POST",
    credentials: "include",
    headers: withAuthHeaders(),
  });

  clearAccessToken();
  window.location.href = "/sign-in";
}
