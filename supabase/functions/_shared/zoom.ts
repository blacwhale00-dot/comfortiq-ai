// Zoom Server-to-Server OAuth client.
//
// Direct integration, no middleware — decision final per the 17-08 brief: an
// extra processor in a seconds-critical path expands the credential blast
// radius and routes homeowner data through a third party for no gain.
//
// Secrets (set by Will via `supabase secrets set`, never VITE_-prefixed):
//   ZOOM_ACCOUNT_ID · ZOOM_CLIENT_ID · ZOOM_CLIENT_SECRET
//
// Token hygiene: S2S access tokens live ~1 hour. They are cached in module
// memory for the life of the isolate and NEVER written to the database.

const ZOOM_OAUTH_URL = "https://zoom.us/oauth/token";
const ZOOM_API_BASE = "https://api.zoom.us/v2";

// Refresh this far before real expiry so a token can't die mid-request.
const EXPIRY_MARGIN_MS = 60_000;

interface CachedToken {
  token: string;
  expiresAtMs: number;
}

// Per-isolate cache. Supabase may recycle isolates at any time; a cold start
// just fetches a fresh token, which is the correct behavior.
let cached: CachedToken | null = null;

export interface ZoomCredentials {
  accountId: string;
  clientId: string;
  clientSecret: string;
}

/** Read the three S2S secrets, or return null naming the ones that are missing. */
export function readZoomCredentials(
  env: (key: string) => string | undefined,
): { creds: ZoomCredentials } | { missing: string[] } {
  const keys = ["ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET"] as const;
  const missing = keys.filter((k) => !env(k));
  if (missing.length) return { missing: [...missing] };
  return {
    creds: {
      accountId: env("ZOOM_ACCOUNT_ID")!,
      clientId: env("ZOOM_CLIENT_ID")!,
      clientSecret: env("ZOOM_CLIENT_SECRET")!,
    },
  };
}

/**
 * Fetch (or reuse) an account_credentials access token.
 * Exported for tests via the injectable `fetchImpl` / `nowMs`.
 */
export async function getZoomAccessToken(
  creds: ZoomCredentials,
  fetchImpl: typeof fetch = fetch,
  nowMs: number = Date.now(),
): Promise<string> {
  if (cached && cached.expiresAtMs - EXPIRY_MARGIN_MS > nowMs) return cached.token;

  const basic = btoa(`${creds.clientId}:${creds.clientSecret}`);
  const url = `${ZOOM_OAUTH_URL}?grant_type=account_credentials&account_id=${encodeURIComponent(creds.accountId)}`;

  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!res.ok) {
    // Never echo the response body — it can carry credential detail.
    throw new Error(`Zoom OAuth failed: ${res.status}`);
  }

  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error("Zoom OAuth returned no access_token");

  cached = {
    token: body.access_token,
    expiresAtMs: nowMs + (body.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

/** Drop the cached token. Used by tests and by any 401 retry path. */
export function resetZoomTokenCache(): void {
  cached = null;
}

export interface InstantMeeting {
  meetingId: string;
  joinUrl: string;
  /** Host link — goes to Will only, never to the homeowner. */
  startUrl: string;
}

/**
 * Create a type-1 (instant) meeting on the account owner's user.
 *
 * waiting_room:true + join_before_host:false are load-bearing: the homeowner
 * lands in a controlled room instead of an empty one, and no two homeowners can
 * ever end up in the same meeting.
 */
export async function createInstantMeeting(
  accessToken: string,
  topic: string,
  fetchImpl: typeof fetch = fetch,
): Promise<InstantMeeting> {
  const res = await fetchImpl(`${ZOOM_API_BASE}/users/me/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: 1,
      topic,
      settings: {
        waiting_room: true,
        join_before_host: false,
      },
    }),
  });

  if (!res.ok) throw new Error(`Zoom meeting creation failed: ${res.status}`);

  const body = (await res.json()) as { id?: number | string; join_url?: string; start_url?: string };
  if (!body.join_url || !body.start_url) throw new Error("Zoom returned no meeting URLs");

  return {
    meetingId: String(body.id ?? ""),
    joinUrl: body.join_url,
    startUrl: body.start_url,
  };
}
