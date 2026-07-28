import { getApiUrl, withAuthHeaders } from "@/lib/api";
import type { LabLeaderboardSummary, LeaderboardEntry } from "@/features/labs/types";

interface LabLeaderboardEntryApi {
  rank: number;
  user_id: string;
  player: string;
  score: number;
  updated_at: string;
}

interface LabLeaderboardApi {
  lab_slug: string;
  entries: LabLeaderboardEntryApi[];
  total: number;
  my_best: number | null;
  my_rank: number | null;
}

interface LabSummaryApi {
  lab_slug: string;
  top_score: number | null;
  entry_count: number;
  top_player: string | null;
}

interface LabSummariesApi {
  items: LabSummaryApi[];
}

interface LabScoreSubmitApi {
  lab_slug: string;
  score: number;
  is_personal_best: boolean;
  updated_at: string;
  rank: number | null;
}

export type LabLeaderboardPage = {
  slug: string;
  entries: LeaderboardEntry[];
  total: number;
  myBest: number | null;
  myRank: number | null;
};

function mapEntry(item: LabLeaderboardEntryApi): LeaderboardEntry {
  return {
    rank: item.rank,
    player: item.player,
    score: item.score,
    date: item.updated_at.slice(0, 10),
    userId: item.user_id,
  };
}

export async function fetchLabLeaderboard(
  slug: string,
  opts?: { limit?: number },
): Promise<LabLeaderboardPage> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const response = await fetch(
    `${getApiUrl()}/labs/${encodeURIComponent(slug)}/leaderboard${qs ? `?${qs}` : ""}`,
    {
      credentials: "include",
      headers: withAuthHeaders(),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to load leaderboard (${response.status})`);
  }
  const data = (await response.json()) as LabLeaderboardApi;
  return {
    slug: data.lab_slug,
    entries: data.entries.map(mapEntry),
    total: data.total,
    myBest: data.my_best,
    myRank: data.my_rank,
  };
}

export async function fetchLabLeaderboardSummaries(): Promise<LabLeaderboardSummary[]> {
  const response = await fetch(`${getApiUrl()}/labs/leaderboards`, {
    credentials: "include",
    headers: withAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to load leaderboard summaries (${response.status})`);
  }
  const data = (await response.json()) as LabSummariesApi;
  return data.items.map((item) => ({
    slug: item.lab_slug,
    topScore: item.top_score,
    entryCount: item.entry_count,
    topPlayer: item.top_player,
  }));
}

export async function submitLabScore(
  slug: string,
  score: number,
): Promise<LabScoreSubmitApi> {
  const response = await fetch(
    `${getApiUrl()}/labs/${encodeURIComponent(slug)}/scores`,
    {
      method: "POST",
      credentials: "include",
      headers: withAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ score }),
    },
  );
  if (!response.ok) {
    let detail = `Failed to submit score (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return (await response.json()) as LabScoreSubmitApi;
}
