import { apiFetch } from "@/lib/api";
import type { QuickDrawSample } from "@/features/research/doodles";

export type QuickDrawResponse = {
  source: string;
  dump: string;
  license: string;
  attribution: string;
  classes: string[];
  samples: QuickDrawSample[];
};

export function fetchQuickDrawSamples(words: readonly string[], signal?: AbortSignal) {
  const query = encodeURIComponent(words.join(","));
  return apiFetch<QuickDrawResponse>(`/research/quickdraw?words=${query}`, { signal });
}
