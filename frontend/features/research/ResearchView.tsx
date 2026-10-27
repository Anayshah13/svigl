"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { answersMatch } from "@/features/ai-guesser/words";
import { isAbortError } from "@/lib/api";
import { fetchAiGuesserConfig, requestAiGuess } from "@/services/ai-guesser";
import { fetchQuickDrawSamples } from "@/services/research";
import { DoodleThumb } from "./DoodleThumb";
import { METHODS, PROTOCOL, type MethodRow } from "./data";
import {
  CORPUS_WORDS,
  DATASET_REPO,
  LIVE_WORDS,
  rasterizeStrokes,
  type QuickDrawSample,
} from "./doodles";

type TrialStatus = "idle" | "queued" | "calling" | "hit" | "miss" | "error";

type Trial = {
  word: string;
  status: TrialStatus;
  guesses: { answer: string; confidence: number }[];
  latencyMs: number | null;
  detail: string;
};

function emptyTrials(): Trial[] {
  return LIVE_WORDS.map((word) => ({
    word,
    status: "idle",
    guesses: [],
    latencyMs: null,
    detail: "",
  }));
}

function pct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function evidenceLabel(kind: MethodRow["evidence"]) {
  if (kind === "live") return "Live";
  if (kind === "literature") return "Published";
  return "Out of task";
}

export function ResearchView() {
  const [trials, setTrials] = useState<Trial[]>(emptyTrials);
  const [running, setRunning] = useState(false);
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [samples, setSamples] = useState<Record<string, QuickDrawSample>>({});
  const [datasetReady, setDatasetReady] = useState(false);
  const lastCallAt = useRef(0);
  const drawingVersion = useRef(1);
  const samplesRef = useRef(samples);
  samplesRef.current = samples;

  useEffect(() => {
    let cancelled = false;

    function mergeSamples(list: QuickDrawSample[]) {
      setSamples((prev) => {
        const next = { ...prev };
        for (const sample of list) next[sample.word] = sample;
        return next;
      });
    }

    async function load(words: readonly string[], markReady: boolean) {
      try {
        const data = await fetchQuickDrawSamples(words);
        if (cancelled) return;
        mergeSamples(data.samples);
        if (markReady) {
          setDatasetReady(true);
          setBanner(null);
        }
      } catch (error) {
        if (cancelled || isAbortError(error)) return;
        if (markReady) {
          setBanner(
            "Could not load Quick, Draw! samples. Keep the backend running — it streams googlecreativelab/quickdraw-dataset.",
          );
        }
      }
    }

    void load(LIVE_WORDS, true).then(() => {
      if (!cancelled) return load(CORPUS_WORDS, false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const scored = trials.filter((t) => t.status === "hit" || t.status === "miss");
  const hits = scored.filter((t) => t.status === "hit").length;
  const liveAcc = scored.length ? hits / scored.length : null;
  const liveTop3 =
    scored.length === 0
      ? null
      : scored.filter((t) => t.guesses.some((g) => answersMatch(g.answer, t.word))).length /
        scored.length;
  const liveMs =
    scored.length === 0
      ? null
      : Math.round(
          scored.reduce((sum, t) => sum + (t.latencyMs ?? 0), 0) / scored.length,
        );

  const ranked = useMemo(() => {
    return METHODS.filter((m) => m.evidence !== "out-of-task").map((m) => {
      if (m.id !== "gemini") return m;
      return { ...m, acc1: liveAcc, acc3: liveTop3, ms: liveMs };
    });
  }, [liveAcc, liveTop3, liveMs]);

  async function waitForCadence(minInterval: number) {
    const wait = minInterval - (Date.now() - lastCallAt.current);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }

  async function guessOne(word: string, minInterval: number) {
    setActiveWord(word);
    setTrials((prev) =>
      prev.map((t) => (t.word === word ? { ...t, status: "calling", detail: "" } : t)),
    );
    const sample = samplesRef.current[word];
    if (!sample) {
      throw new Error(`No Quick, Draw! sample for ${word}.`);
    }
    await waitForCadence(minInterval);
    const image = rasterizeStrokes(sample.drawing);
    const started = Date.now();
    lastCallAt.current = started;
    const version = drawingVersion.current++;
    const controller = new AbortController();
    const kill = window.setTimeout(() => controller.abort(), 18000);
    try {
      const result = await requestAiGuess(
        {
          imageBase64: image,
          mimeType: "image/png",
          drawingVersion: version,
          mode: "open",
          previousGuesses: [],
        },
        controller.signal,
      );
      window.clearTimeout(kill);
      const top = result.guesses[0];
      const hit = Boolean(top && answersMatch(top.answer, word));
      setTrials((prev) =>
        prev.map((t) =>
          t.word === word
            ? {
                ...t,
                status: hit ? "hit" : "miss",
                guesses: result.guesses.slice(0, 3),
                latencyMs: result.latencyMs,
                detail: result.model,
              }
            : t,
        ),
      );
    } catch (error) {
      window.clearTimeout(kill);
      const message =
        error instanceof Error ? error.message : "The guesser could not be reached.";
      setTrials((prev) =>
        prev.map((t) =>
          t.word === word
            ? { ...t, status: "error", guesses: [], latencyMs: null, detail: message }
            : t,
        ),
      );
      throw error;
    } finally {
      setActiveWord(null);
    }
  }

  async function runTrial() {
    if (running) return;
    setRunning(true);
    setBanner(null);
    setTrials(
      LIVE_WORDS.map((word) => ({
        word,
        status: "queued",
        guesses: [],
        latencyMs: null,
        detail: "",
      })),
    );
    try {
      const config = await fetchAiGuesserConfig();
      if (!config.enabled) {
        setBanner("Gemini is not enabled on this API — check GEMINI_API_KEY on the backend.");
        return;
      }
      const gap = Math.max(config.minCallIntervalMs, 4000);
      for (const word of LIVE_WORDS) {
        try {
          await guessOne(word, gap);
        } catch {
          setBanner("Stopped the live trial — the guesser endpoint failed. Other rows still show published figures.");
          break;
        }
      }
    } catch {
      setBanner("Could not reach the Svigl API. Start the backend, then run the live trial.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="research-sheet page-shell gap-10 sm:gap-12">
      <header className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-white/80 px-5 py-8 sm:px-10 sm:py-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-plum">
            Sketch recognition · comparative study
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-[clamp(2.1rem,6vw,4.2rem)] leading-[0.95] text-ink">
            What actually reads the drawing
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
            Drawings are streamed from Google’s{" "}
            <a
              href={DATASET_REPO}
              className="font-medium text-plum underline decoration-plum/30 underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              Quick, Draw! dataset
            </a>{" "}
            (simplified ndjson, CC BY 4.0). Gemini then sees a 256px PNG of that ink — the same
            path Svigl uses in the game.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button onClick={runTrial} disabled={running || !datasetReady} size="lg">
              {running
                ? "Running live trial…"
                : !datasetReady
                  ? "Loading Quick, Draw!…"
                  : scored.length
                    ? "Run live trial again"
                    : "Run live Gemini trial"}
            </Button>
            <p className="max-w-sm text-xs leading-relaxed text-ink-muted">
              Six later / often-unrecognized doodles from the official dump — not the first easy
              hits. Exact-match scoring, ~4s between calls.
            </p>
          </div>
          {banner ? (
            <p className="mt-4 rounded-2xl bg-pink-light px-4 py-3 text-sm text-ink">{banner}</p>
          ) : null}
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Live Gemini top-1"
          value={liveAcc == null ? "—" : pct(liveAcc)}
          hint={`${hits} / ${scored.length || LIVE_WORDS.length} on this sheet`}
        />
        <Stat
          label="Live Gemini top-3"
          value={liveTop3 == null ? "—" : pct(liveTop3)}
          hint="Any of three ranked guesses"
        />
        <Stat
          label="Mean latency"
          value={liveMs == null ? "—" : `${liveMs} ms`}
          hint="Raster + Gemini round trip"
        />
      </section>

      <section>
        <SectionKicker n="01" title="How we score" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROTOCOL.map((step) => (
            <article
              key={step.n}
              className="rounded-3xl border border-ink/8 bg-white/85 p-4 sm:p-5"
            >
              <p className="font-mono text-[11px] text-plum">{step.n}</p>
              <h2 className="mt-2 font-display text-xl text-ink">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <SectionKicker n="02" title="Live Gemini trial" />
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Each card is a real Quick, Draw! stroke record from later in that class file, preferring
          doodles the original game classifier missed. Rasterized, then posted to{" "}
          <code className="rounded bg-plum-light px-1.5 py-0.5 font-mono text-[12px] text-plum">
            POST /ai-guesser/guess
          </code>
          , and compared to the prompt. Click the button above and watch the guesses land.
        </p>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {trials.map((trial) => (
            <li key={trial.word}>
              <TrialCard
                trial={trial}
                drawing={samples[trial.word]?.drawing}
                keyId={samples[trial.word]?.key_id}
                recognized={samples[trial.word]?.recognized}
                active={activeWord === trial.word}
              />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionKicker n="03" title="Five methods, two kinds of evidence" />
        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          {METHODS.map((method) => (
            <MethodCard
              key={method.id}
              method={
                method.id === "gemini"
                  ? { ...method, acc1: liveAcc, acc3: liveTop3, ms: liveMs }
                  : method
              }
            />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-ink/10 bg-white/90">
        <div className="border-b border-ink/8 px-5 py-4 sm:px-6">
          <SectionKicker n="04" title="Paired comparison" />
          <p className="mt-1 text-sm text-ink-muted">
            Gemini accuracy updates with the live trial. Other top-1 figures stay published so a
            teacher can see the scale of each family without mixing train and test.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Method</th>
                <th className="px-3 py-3 font-medium">Evidence</th>
                <th className="px-3 py-3 font-medium">Top-1</th>
                <th className="px-3 py-3 font-medium">Top-3</th>
                <th className="px-3 py-3 font-medium">Latency</th>
              </tr>
            </thead>
            <tbody>
              {ranked
                .slice()
                .sort((a, b) => (b.acc1 ?? -1) - (a.acc1 ?? -1))
                .map((row) => (
                  <tr key={row.id} className="border-t border-ink/6">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-ink">{row.name}</span>
                      <span className="mt-0.5 block text-xs text-ink-muted">{row.input}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <EvidencePill kind={row.evidence} />
                    </td>
                    <td className="px-3 py-3.5 font-mono">{pct(row.acc1)}</td>
                    <td className="px-3 py-3.5 font-mono">{pct(row.acc3)}</td>
                    <td className="px-3 py-3.5 font-mono">
                      {row.ms == null ? "—" : `${row.ms} ms`}
                    </td>
                  </tr>
                ))}
              <tr className="border-t border-ink/6 bg-bg-base/70">
                <td className="px-5 py-3.5 font-medium text-ink">Sketch-RNN</td>
                <td className="px-3 py-3.5">
                  <EvidencePill kind="out-of-task" />
                </td>
                <td colSpan={3} className="px-3 py-3.5 text-ink-muted">
                  Next-stroke generator. No class label, so no rank.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[2rem] border border-ink/10 bg-white/85 p-5 sm:p-7">
          <SectionKicker n="05" title="Prompt corpus" />
          <p className="mt-2 text-sm text-ink-muted">
            Twenty-four classes from the official 345-way dump. Highlighted tiles are in the live
            trial. Ink is a later drawing, preferring{" "}
            <code className="font-mono text-[11px]">recognized=false</code>.
          </p>
          <ul className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {CORPUS_WORDS.map((word) => {
              const live = (LIVE_WORDS as readonly string[]).includes(word);
              return (
                <li
                  key={word}
                  className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2 ${
                    live ? "bg-chartreuse/35 ring-1 ring-ink/10" : "bg-bg-base/90"
                  }`}
                >
                  <DoodleThumb
                    drawing={samples[word]?.drawing}
                    className="h-11 w-11 text-ink"
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                    {word}
                  </span>
                </li>
              )}
            )}
          </ul>
        </article>

        <article className="flex flex-col rounded-[2rem] border border-ink/10 bg-ink px-5 py-6 text-[var(--bg-base)] sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-chartreuse">
            Sketch-RNN reminder
          </p>
          <h2 className="mt-3 font-display text-3xl leading-tight">It draws. It does not guess.</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Magenta Sketch-RNN is a VAE over pen strokes. Ranking it as a classifier would invent
            a peer that the paper never claimed.
          </p>
          <div className="mt-6 flex flex-1 items-center justify-center rounded-2xl bg-white/8">
            <DoodleThumb
              drawing={samples.cat?.drawing}
              className="h-28 w-28 text-chartreuse"
              animate
            />
          </div>
        </article>
      </section>

      <p className="pb-4 text-center text-xs text-ink-muted">
        {`Quick, Draw! dataset © Google, Inc. `}
        <a
          href={DATASET_REPO}
          className="text-plum underline decoration-plum/30 underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          github.com/googlecreativelab/quickdraw-dataset
        </a>
        {` · CC BY 4.0`}
      </p>
    </div>
  );
}

function SectionKicker({ n, title }: { n: string; title: string }) {
  return (
    <div>
      <p className="font-mono text-[11px] tracking-widest text-plum">{n}</p>
      <h2 className="font-display text-2xl text-ink sm:text-3xl">{title}</h2>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[1.75rem] border border-ink/10 bg-white/85 px-5 py-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-plum">{label}</p>
      <p className="mt-2 font-mono text-4xl tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </div>
  );
}

function EvidencePill({ kind }: { kind: MethodRow["evidence"] }) {
  const styles =
    kind === "live"
      ? "bg-chartreuse text-ink"
      : kind === "literature"
        ? "bg-plum-light text-plum"
        : "bg-ink/8 text-ink-muted";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles}`}
    >
      {evidenceLabel(kind)}
    </span>
  );
}

function MethodCard({ method }: { method: MethodRow }) {
  return (
    <article className="flex flex-col rounded-[1.75rem] border border-ink/8 bg-white/90 p-4">
      <div className="flex items-center justify-between gap-2">
        <EvidencePill kind={method.evidence} />
      </div>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-plum">
        {method.family}
      </p>
      <h3 className="mt-1 font-display text-lg leading-tight text-ink">{method.name}</h3>
      <p className="mt-1 text-xs text-ink-muted">{method.input}</p>
      <div className="mt-4 min-h-[4.25rem]">
        {method.evidence === "out-of-task" ? (
          <p className="text-sm text-ink-muted">No top-1 — generation only.</p>
        ) : (
          <>
            <p className="font-mono text-3xl text-ink">{pct(method.acc1)}</p>
            <p className="text-xs text-ink-muted">top-3 {pct(method.acc3)}</p>
          </>
        )}
      </div>
      {method.acc1 != null ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-plum-light">
          <motion.div
            className="h-full rounded-full bg-plum"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, method.acc1 * 100)}%` }}
            transition={{ duration: 0.45 }}
          />
        </div>
      ) : null}
      <p className="mt-3 text-[12px] leading-snug text-ink-muted">{method.note}</p>
      <p className="mt-auto pt-3 font-mono text-[10px] text-plum">{method.cite}</p>
    </article>
  );
}

function TrialCard({
  trial,
  drawing,
  keyId,
  recognized,
  active,
}: {
  trial: Trial;
  drawing: QuickDrawSample["drawing"] | undefined;
  keyId?: string;
  recognized?: boolean;
  active: boolean;
}) {
  const top = trial.guesses[0];
  return (
    <article
      className={`flex h-full flex-col rounded-3xl border bg-white/90 p-3 ${
        trial.status === "hit"
          ? "border-green/40"
          : trial.status === "miss"
            ? "border-pink/50"
            : active
              ? "border-plum"
              : "border-ink/8"
      }`}
    >
      <DoodleThumb drawing={drawing} className="mx-auto h-16 w-16 text-ink" />
      <p className="mt-1 text-center text-[11px] font-bold uppercase tracking-wide text-ink">
        {trial.word}
      </p>
      {keyId ? (
        <p className="truncate text-center font-mono text-[9px] text-ink-muted">
          {keyId}
          {recognized === false ? " · missed in-game" : recognized ? " · recognized" : ""}
        </p>
      ) : null}
      <p className="mt-2 min-h-[2.5rem] text-center text-sm text-ink">
        {trial.status === "calling" && "Looking…"}
        {trial.status === "queued" && "Queued"}
        {trial.status === "idle" && "Waiting"}
        {trial.status === "error" && (trial.detail || "Failed")}
        {(trial.status === "hit" || trial.status === "miss") && top
          ? `${top.answer}`
          : null}
        {(trial.status === "hit" || trial.status === "miss") && !top ? "No guess" : null}
      </p>
      {trial.status === "hit" || trial.status === "miss" ? (
        <p
          className={`text-center text-[10px] font-bold uppercase tracking-widest ${
            trial.status === "hit" ? "text-green" : "text-pink"
          }`}
        >
          {trial.status === "hit" ? "Match" : "Miss"}
          {trial.latencyMs != null ? ` · ${trial.latencyMs} ms` : ""}
        </p>
      ) : null}
    </article>
  );
}
