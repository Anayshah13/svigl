"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { colors } from "@/lib/colors";
import { cn } from "@/lib/cn";
import {
  isFeedbackEmailConfigured,
  sendFeedback,
  type FeedbackType,
} from "@/services/feedback";

const FEEDBACK_TYPES: { value: FeedbackType; label: string }[] = [
  { value: "bug", label: "Bug report" },
  { value: "feedback", label: "Feedback" },
  { value: "feature", label: "Feature idea" },
];

const INITIAL_FORM = {
  type: "feedback" as FeedbackType,
  name: "",
  email: "",
  subject: "",
  message: "",
};

function FeedbackBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="absolute -left-24 top-1/4 h-72 w-72 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${colors.plum}12 0%, transparent 70%)` }}
      />
      <div
        className="absolute -right-24 bottom-1/4 h-64 w-64 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${colors.green}0d 0%, transparent 70%)` }}
      />
    </div>
  );
}

export function FeedbackPage() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const emailConfigured = isFeedbackEmailConfigured();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await sendFeedback(form);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setSubmitted(false);
    setError(null);
  };

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-1 sm:min-h-[calc(100dvh-4rem)]">
      <FeedbackBackground />
      <div className="relative z-10 flex w-full items-center justify-center px-4 py-5 sm:px-8 sm:py-6">
        <div className="w-full max-w-7xl">
          <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/96 shadow-[0_28px_56px_-18px_rgba(112,63,147,0.18)] backdrop-blur-md sm:rounded-4xl">
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl"
              style={{ background: `radial-gradient(circle, ${colors.plum}28 0%, transparent 70%)` }}
            />
            <div
              className="pointer-events-none absolute -bottom-16 left-1/4 h-48 w-48 rounded-full blur-3xl"
              style={{ background: `radial-gradient(circle, ${colors.green}22 0%, transparent 70%)` }}
            />

            {submitted ? (
              <div className="relative px-8 py-14 text-center sm:px-12 sm:py-16">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-light text-2xl text-green">
                  ✓
                </div>
                <h1 className="mt-5 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Message sent</h1>
                <p className="mx-auto mt-3 max-w-md text-base text-ink-muted sm:text-lg">
                  Thanks for helping shape Svigl. We&apos;ll reply if you left an email.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
                  <Button variant="green" size="lg" onClick={resetForm}>
                    Send another
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => router.push("/")}>
                    Back to home
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] lg:gap-12 lg:p-10 xl:p-12">
                <div className="flex flex-col justify-center">
                  <Link
                    href="/"
                    className="mb-5 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
                  >
                    <span aria-hidden="true">←</span>
                    Back to home
                  </Link>

                  <span
                    className="inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider sm:text-sm"
                    style={{ background: colors.pinkLight, color: colors.plum }}
                  >
                    Help us improve
                  </span>

                  <h1 className="mt-4 text-[clamp(1.875rem,3.2vw,2.75rem)] font-bold leading-[1.1] tracking-tight text-ink">
                    Report an issue or share feedback
                  </h1>
                  <p className="script-accent mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-none">
                    We read every message.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">
                    Bug, idea, or quick note — send it here. Or open an issue on{" "}
                    <a
                      href="https://github.com/Anayshah13/svigl/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-plum underline decoration-plum/30 underline-offset-2 hover:decoration-plum"
                    >
                      GitHub
                    </a>
                    .
                  </p>
                </div>

                <form className="flex flex-col gap-4 sm:gap-5" onSubmit={handleSubmit}>
                  <fieldset>
                    <legend className="sr-only">Feedback type</legend>
                    <div className="flex flex-wrap gap-2.5">
                      {FEEDBACK_TYPES.map((option) => {
                        const selected = form.type === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, type: option.value }))}
                            className={cn(
                              "rounded-full border px-4 py-2 text-base font-semibold transition-colors sm:px-5 sm:py-2.5",
                              selected
                                ? "border-plum/35 bg-plum-light text-plum"
                                : "border-plum/10 bg-white/80 text-ink-muted hover:border-plum/25 hover:text-ink",
                            )}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted sm:text-sm">
                        Name <span className="font-normal normal-case">(optional)</span>
                      </span>
                      <Input
                        value={form.name}
                        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Your name"
                        autoComplete="name"
                        className="h-12 text-base"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted sm:text-sm">
                        Email <span className="font-normal normal-case">(optional)</span>
                      </span>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="h-12 text-base"
                      />
                    </label>
                    <label className="block sm:col-span-2 lg:col-span-1">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted sm:text-sm">
                        Subject
                      </span>
                      <Input
                        value={form.subject}
                        onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                        placeholder="Short summary"
                        required
                        maxLength={120}
                        className="h-12 text-base"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted sm:text-sm">
                      Message
                    </span>
                    <Textarea
                      value={form.message}
                      onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                      placeholder="Describe the bug, feedback, or idea."
                      required
                      minLength={10}
                      maxLength={4000}
                      rows={4}
                      className="min-h-28 resize-none py-3 text-base sm:min-h-32"
                    />
                  </label>

                  {!emailConfigured ? (
                    <p role="status" className="text-xs leading-relaxed text-plum/75 sm:text-sm">
                      Email delivery not configured yet — add EmailJS keys to{" "}
                      <code className="rounded bg-plum-light/70 px-1.5 py-0.5 text-xs">.env.local</code>.
                    </p>
                  ) : null}

                  {error ? (
                    <p role="alert" className="rounded-xl bg-pink-light px-4 py-2.5 text-sm font-medium text-plum sm:text-base">
                      {error}
                    </p>
                  ) : null}

                  <div className="flex justify-end pt-1">
                    <Button type="submit" variant="green" size="lg" disabled={submitting} className="w-full sm:w-auto">
                      {submitting ? "Sending…" : "Send message"}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
