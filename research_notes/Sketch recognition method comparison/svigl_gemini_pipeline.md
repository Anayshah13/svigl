# Svigl Gemini-based drawing guess pipeline (codebase, 27 October 2026)

Notes from the local Svigl repository only. No production metrics, accuracy, or dollar costs appear in this tree; those are gaps, not estimates. File links are workspace paths.

## Where is the Gemini (or other model) call that interprets a drawing? File paths and function names.

### Takeaway
There is one vision-guess HTTP call: FastAPI `generate_guess` POSTs raster PNG to Google `generateContent`. Two product surfaces share it: `/ai-guesser` (browser) and the multiplayer AnAI bot (server-side). Humans in rooms do not use vision; they type chat guesses.

### Cited Findings
- Module docstring states the guesser is Gemini-backed for experimental `/ai-guesser` demo mode; the API key never leaves the server. — [backend/app/services/ai_guesser.py](../../backend/app/services/ai_guesser.py)
- `generate_guess` builds `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` and `httpx.AsyncClient.post`s JSON with header `x-goog-api-key`. — [backend/app/services/ai_guesser.py](../../backend/app/services/ai_guesser.py)
- REST entry: `POST /ai-guesser/guess` in `post_ai_guess` (`backend/app/api/ai_guesser.py`), which calls `generate_guess(body)` then optionally `apply_guesses` if `run_id` is set. Router prefix is `/ai-guesser`. — [backend/app/api/ai_guesser.py](../../backend/app/api/ai_guesser.py)
- Router is mounted in FastAPI `main.py` via `app.include_router(ai_guesser_router)`. — [backend/app/main.py](../../backend/app/main.py)
- Browser never talks to Google: `requestAiGuess` POSTs to `/ai-guesser/guess` through `apiFetch`. Comment: “The browser never sees a model API key.” — [frontend/services/ai-guesser.ts](../../frontend/services/ai-guesser.ts)
- Client orchestration: `useAiGuesser` constructs `AiGuesserEngine` with `renderDrawingSnapshot` and `analyzeWithTimeout` → `requestAiGuess`. — [frontend/features/ai-guesser/useAiGuesser.ts](../../frontend/features/ai-guesser/useAiGuesser.ts)
- Engine `run()` rasterizes then calls `deps.analyze`. — [frontend/features/ai-guesser/engine.ts](../../frontend/features/ai-guesser/engine.ts)
- Multiplayer bot: `BotCoordinator._guess_once` renders persisted canvas PNG via `render_shapes_png`, builds `AiGuessRequest(mode="game")`, and awaits `self._guess_fn` (default `generate_guess`). — [backend/app/services/bot_coordinator.py](../../backend/app/services/bot_coordinator.py)
- Config comment: bot settings are for “Multiplayer system bot (regular rooms, not /ai-guesser)”. — [backend/app/config.py](../../backend/app/config.py)
- Human room guesses: `submit_chat` / `words_match(secret, cleaned)` on typed text; no image or Gemini in that path. — [backend/app/services/game.py](../../backend/app/services/game.py); [backend/app/services/words.py](../../backend/app/services/words.py)
- Separate Gemini call exists for TTS (`ai_tts.py` / `POST /ai-guesser/speak`), not for drawing interpretation. — [backend/app/api/ai_guesser.py](../../backend/app/api/ai_guesser.py); [backend/app/services/ai_tts.py](../../backend/app/services/ai_tts.py)

### Inferences
- Sketch recognition in this product is a single shared `generate_guess` function, not two models. Product differences are when the call fires and how answers are scored or shouted, not a second vision stack.
- Searching for another `generateContent` / vision classifier for the main Pictionary loop did not yield a second drawing interpreter.

### Gaps
- No other provider (OpenAI, local CNN, etc.) is wired as an alternate drawing guesser in this tree.
- No measured end-to-end latency distributions or production error rates in code (only a per-call `latency_ms` field on the response schema).

## What is sent to the model: stroke/vector data, a raster image, a word list, a system prompt?

### Takeaway
The model receives a **raster image** (PNG inlineData) plus short **system + user text**. It does **not** receive stroke JSON, SVG markup, the secret word, or a candidate word list. Scoring vocabularies exist only after the call.

### Cited Findings
- Request body: `systemInstruction` with `SYSTEM_INSTRUCTION`; user `contents` parts are `inlineData` (`mimeType` + base64) then `_build_user_text`. — [backend/app/services/ai_guesser.py](../../backend/app/services/ai_guesser.py)
- System instruction (full, short): guess Pictionary from unfinished messy sketches; shoutable everyday word not breed/scientific/brand/subtype (“dog, not golden retriever”); previous guesses are context and may be wrong; “Return structured JSON only.” — [backend/app/services/ai_guesser.py](../../backend/app/services/ai_guesser.py)
- User text constraints (paraphrase of the short template): “Guess freely from the sketch”; everyday spelling; optional previous guesses joined by comma; at most `MAX_GUESSES` ranked guesses with confidence 0–1; a short spoken `line` (one visual aside then top guess); no markdown, no long explanation. — [backend/app/services/ai_guesser.py](../../backend/app/services/ai_guesser.py)
- `AiGuessRequest.candidates` is accepted “for older clients; never forwarded to the model.” — [backend/app/schemas/ai_guesser.py](../../backend/app/schemas/ai_guesser.py)
- Test `test_image_is_sent_and_candidate_list_is_not` asserts image inlineData, prompt contains “Guess freely”, leftover candidates (“star wars”, “spaceship”) and “candidate list” are absent from the prompt. — [backend/tests/test_ai_guesser.py](../../backend/tests/test_ai_guesser.py)
- Frontend snapshot: SVG markup from `shapesToSvgMarkup` rasterized to a square canvas, white `#ffffff` background (no transparency), `canvas.toDataURL("image/png")`, base64 without data-URL prefix. Comment: snapshot is the drawing itself, never a page screenshot or UI chrome. — [frontend/features/ai-guesser/snapshot.ts](../../frontend/features/ai-guesser/snapshot.ts)
- Bot path: persisted whiteboard shapes → `render_shapes_png` (256×256 RGB PNG, white fill, board mapped from 800×800). Vectors are not POSTed. — [backend/app/services/bot_canvas_image.py](../../backend/app/services/bot_canvas_image.py); [backend/app/services/bot_coordinator.py](../../backend/app/services/bot_coordinator.py)
- Live client POST body: `image_base64`, `mime_type`, `drawing_version`, `mode`, `previous_guesses`, optional `run_id` / `prompt_index`. No `candidates` field. — [frontend/services/ai-guesser.ts](../../frontend/services/ai-guesser.ts)
- Engine previous guesses: answers already shouted, **sorted** (alphabetical), not recency-ordered. — [frontend/features/ai-guesser/engine.ts](../../frontend/features/ai-guesser/engine.ts)
- Secret-word lists (`AI_GUESSER_WORDS`, weekly packs) are for the player/secret and for post-hoc `answersMatch`; comment: “Gemini guesses freely from the drawing — this list is never sent to the model.” — [frontend/features/ai-guesser/words.ts](../../frontend/features/ai-guesser/words.ts); [backend/app/services/ai_guesser_week.py](../../backend/app/services/ai_guesser_week.py)
- Leftover `buildAiCandidateList` still has a comment “Vocabulary sent to Gemini… Capped so each request does not ship the entire word list”; decoy comment immediately above says the live game no longer sends a vocabulary. Function is used in tests/exports, not in `requestAiGuess`. — [frontend/features/ai-guesser/words.ts](../../frontend/features/ai-guesser/words.ts)
- Stroke simplification happens **before** rasterization as part of the whiteboard pencil pipeline (RDP), not as a Gemini-specific encoder: `PENCIL_MIN_SAMPLE_DISTANCE = 1.5`; `PENCIL_BASE_SIMPLIFY_TOLERANCE = 0.6`; `finalizePencilPath` uses `max(0.6, strokeWidth * 0.35 + 0.6)`. — [frontend/features/whiteboard/pencilStroke.ts](../../frontend/features/whiteboard/pencilStroke.ts)

### Inferences
- Closed-set classification is not implemented at the model boundary even though `mode` and `candidates` remain on the public schema.
- Previous guesses give the model a short memory of shouted words, not the secret.

### Gaps
- Exact PNG encoder quality/compression for `canvas.toDataURL` is browser-default; the repo does not set a quality argument (PNG ignores the quality param anyway).
- Whether Gemini receives EXIF or extra metadata: not specified; payload is raw base64 of PNG bytes after optional data-URL strip.

## What model id, temperature, and response schema are used?

### Takeaway
Default upstream model is `gemini-3.5-flash-lite`, temperature `0.2`, JSON schema with `guesses[{answer, confidence}]` and optional `line`. Clients see the public label `AnAI 1.3 Pro`, not the Gemini id.

### Cited Findings
- `gemini_ai_guesser_model: str = "gemini-3.5-flash-lite"` with comment: keep a low-cost multimodal Flash/Lite tier; never hardcode the model name at call sites. — [backend/app/config.py](../../backend/app/config.py)
- `generationConfig`: `responseMimeType` `application/json`, `responseSchema` `RESPONSE_SCHEMA`, `temperature` `0.2`, `maxOutputTokens` `224`, `candidateCount` `1`, `mediaResolution` `MEDIA_RESOLUTION_LOW` (comment: line drawings do not need high-res tiles). — [backend/app/services/ai_guesser.py](../../backend/app/services/ai_guesser.py)
- `RESPONSE_SCHEMA`: object with `guesses` array of `{answer: STRING, confidence: NUMBER}` required per item; `line` STRING; required top-level `["guesses"]` only. — [backend/app/services/ai_guesser.py](../../backend/app/services/ai_guesser.py)
- Thinking: `_thinking_config` prefers `thinkingLevel` from `gemini_thinking_level` (default `"minimal"`); omit/none/off skip level; if level blank and `gemini_thinking_budget >= 0`, send `thinkingBudget`. Default budget `-1` omits the legacy knob. — [backend/app/config.py](../../backend/app/config.py); [backend/app/services/ai_guesser.py](../../backend/app/services/ai_guesser.py)
- Tests assert default `thinkingConfig == {thinkingLevel: minimal}`, `MEDIA_RESOLUTION_LOW`, `maxOutputTokens == 224`. — [backend/tests/test_ai_guesser.py](../../backend/tests/test_ai_guesser.py)
- `PUBLIC_MODEL_NAME = "AnAI 1.3 Pro"`; comment: upstream provider id never goes to the client. `AiGuessResponse.model` is set to this label. — [backend/app/schemas/ai_guesser.py](../../backend/app/schemas/ai_guesser.py); [backend/app/services/ai_guesser.py](../../backend/app/services/ai_guesser.py)
- Untrusted parse: `GeminiGuessPayload` / `GeminiGuess` (answer 1–80 chars; unconstrained confidence; extra fields ignored). Then `normalize_guesses` drops non-finite confidence, empty answers, rescales if max > 1.0 (0–100 heuristic), casefold-dedupes keeping highest confidence, sorts by confidence desc, truncates to `MAX_GUESSES`. — [backend/app/schemas/ai_guesser.py](../../backend/app/schemas/ai_guesser.py); [backend/app/services/ai_guesser.py](../../backend/app/services/ai_guesser.py)
- Usage metadata optionally mapped from Gemini `usageMetadata` (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`). — [backend/app/services/ai_guesser.py](../../backend/app/services/ai_guesser.py)
- TTS is a different default: `gemini-3.1-flash-tts-preview`, voice `Puck`. — [backend/app/config.py](../../backend/app/config.py)

### Inferences
- Structured output is the control mechanism, not free-form parsing of “I think it’s a dog.”
- Temperature 0.2 is a code constant, not an env setting.

### Gaps
- Repo does not record which Gemini API version beyond `v1beta` in `GEMINI_BASE_URL`.
- No comment stating why 224 tokens specifically, beyond “Enough for 3 short guesses plus one spoken sentence.”

## Is the task open-vocabulary guessing, closed-set classification, or both (main game vs AI guesser)?

### Takeaway
**Open-vocabulary guessing at the model**; **closed secret-word scoring after the fact** for AI Guesser and rooms. `mode` `"game" | "open"` is echoed, not used to constrain Gemini. Residual candidate-list machinery is dead for live calls.

### Cited Findings
- `_build_user_text` always says “Guess freely”; it does not branch on `payload.mode` or `payload.candidates`. — [backend/app/services/ai_guesser.py](../../backend/app/services/ai_guesser.py)
- `test_game_mode_keeps_off_list_answers`: mode `"game"` still returns off-list answer `"anything"`. — [backend/tests/test_ai_guesser.py](../../backend/tests/test_ai_guesser.py)
- Weekly secrets: `PROMPTS_PER_GAME = 5`, five themed packs; `answers_match` after normalize (case, non-alnum, leading a/an/the). Words chosen to be easy to sketch and named the way a vision model typically labels them. — [backend/app/services/ai_guesser_week.py](../../backend/app/services/ai_guesser_week.py)
- `apply_guesses` scores **all** `result.guesses` from the model against the secret (`any(answers_match(...))`), not only the UI-shouted guess. — [backend/app/services/ai_guesser_match.py](../../backend/app/services/ai_guesser_match.py); [backend/app/api/ai_guesser.py](../../backend/app/api/ai_guesser.py)
- UI shout: `pickCommittedGuess` walks ranked list, skips blanks/repeats, requires `MIN_CONFIDENCE` (frontend default **0.3**). One shout per call. — [frontend/features/ai-guesser/commit.ts](../../frontend/features/ai-guesser/commit.ts); [frontend/features/ai-guesser/config.ts](../../frontend/features/ai-guesser/config.ts)
- Room bot shout: `bot_guess_min_confidence` default **0.5**; first passing guess submitted via `submit_chat`; one public chat line per AI call. — [backend/app/config.py](../../backend/app/config.py); [backend/app/services/bot_coordinator.py](../../backend/app/services/bot_coordinator.py)
- `useAiGuesser` default `initialMode = "game"`; production views (`AiGuesserView`, `AiGuesserFreePlay`) do not pass `initialMode`. `"open"` appears in engine tests, not in those views. — [frontend/features/ai-guesser/useAiGuesser.ts](../../frontend/features/ai-guesser/useAiGuesser.ts); [frontend/features/ai-guesser/AiGuesserView.tsx](../../frontend/features/ai-guesser/AiGuesserView.tsx)
- Main multiplayer: drawer gets a secret from the game word system; guessers type chat; matching is `words_match`. Bot uses the same open Gemini guesses then the same chat matcher. — [backend/app/services/game.py](../../backend/app/services/game.py); [backend/app/services/bot_coordinator.py](../../backend/app/services/bot_coordinator.py)

### Inferences
- Comparison label for this method: **open-vocab VLM guess + lexical exact-match scoring against a hidden closed set**.
- Frontend 0.3 vs bot 0.5 confidence floors mean the same model output can shout in `/ai-guesser` but stay silent in a room.

### Gaps
- No code path that enumerates a closed class list to Gemini in production.
- No documented mapping from Gemini answers to WordNet/synonyms beyond article stripping and punctuation normalize.

## What limits exist (timeouts, call caps, image size, stroke simplification)?

### Takeaway
Limits stack at image size, tokens, thinking, HTTP timeout, IP/global RPM and daily caps, per-drawing call caps, debounce, and match clock. Stroke simplification is whiteboard RDP, not a dedicated guesser preprocessor.

### Cited Findings
- Image: `ai_guesser_max_image_bytes: int = 200_000`; `_decode_image` rejects empty/invalid base64 (422) and oversize (413 `image_too_large`) **before** the paid call. Allowed MIME: png/jpeg/webp; client always sends png. — [backend/app/config.py](../../backend/app/config.py); [backend/app/schemas/ai_guesser.py](../../backend/app/schemas/ai_guesser.py); [backend/app/services/ai_guesser.py](../../backend/app/services/ai_guesser.py)
- Snapshot edge: `SNAPSHOT_SIZE: 256` (client); bot `WIDTH = HEIGHT = 256`. — [frontend/features/ai-guesser/config.ts](../../frontend/features/ai-guesser/config.ts); [backend/app/services/bot_canvas_image.py](../../backend/app/services/bot_canvas_image.py)
- `gemini_timeout_seconds: float = 18.0` on httpx client; `REQUEST_TIMEOUT_MS: 18000` on the browser analyze wrapper; bot `bot_guess_timeout_seconds: float = 18.0` plus `asyncio.timeout`. — [backend/app/config.py](../../backend/app/config.py); [frontend/features/ai-guesser/config.ts](../../frontend/features/ai-guesser/config.ts); [backend/app/services/bot_coordinator.py](../../backend/app/services/bot_coordinator.py)
- Rate limits (defaults): 15/min/IP, 150/day/IP, 800/day global; `MIN_CALL_INTERVAL_MS = 4000` on config probe (“mirrors the client’s MIN_CALL_INTERVAL_MS so one player stays ≤15 RPM”). Comment: Flash-Lite is often ~15 RPM. Forwarded-for ignored unless `ai_guesser_trust_forwarded_for`. — [backend/app/config.py](../../backend/app/config.py); [backend/app/api/ai_guesser.py](../../backend/app/api/ai_guesser.py)
- Per drawing/turn: frontend `MAX_CALLS_PER_TURN: 12`; weekly match `MAX_CALLS_PER_PROMPT = 12`; bot `bot_max_guess_calls_per_turn: int = 12`. Weekly prompt clock `PROMPT_LIMIT_MS = 70_000`. — [frontend/features/ai-guesser/config.ts](../../frontend/features/ai-guesser/config.ts); [backend/app/services/ai_guesser_week.py](../../backend/app/services/ai_guesser_week.py); [backend/app/config.py](../../backend/app/config.py)
- Cadence: debounce 4000 ms after first ink; tick 400 ms; after first look, only dirty canvas (fingerprint change via `summarizeShapes`). Engine comment: smoothing/change-score gating “intentionally gone”; `changeScore` still exists in `changeDetector.ts` and tests but `decideCall` is dirty/debounce/max-calls only. — [frontend/features/ai-guesser/scheduler.ts](../../frontend/features/ai-guesser/scheduler.ts); [frontend/features/ai-guesser/engine.ts](../../frontend/features/ai-guesser/engine.ts); [frontend/features/ai-guesser/changeDetector.ts](../../frontend/features/ai-guesser/changeDetector.ts)
- Bot cadence: `bot_guess_debounce_seconds = 4.0`, `bot_guess_interval_seconds = 5.0`, `bot_global_ai_concurrency = 4`. Dirty-canvas only. — [backend/app/config.py](../../backend/app/config.py); [backend/app/services/bot_coordinator.py](../../backend/app/services/bot_coordinator.py)
- Output caps: `MAX_GUESSES = 3`, `MAX_PREVIOUS_GUESSES = 3`, `MAX_LINE_LENGTH = 140`, `MAX_OUTPUT_TOKENS = 224`. — [backend/app/schemas/ai_guesser.py](../../backend/app/schemas/ai_guesser.py); [backend/app/services/ai_guesser.py](../../backend/app/services/ai_guesser.py)
- Client error backoff: 4000 ms × consecutive errors, cap 16000; UI “unavailable” after 2 consecutive errors. — [frontend/features/ai-guesser/config.ts](../../frontend/features/ai-guesser/config.ts)
- Feature off if `gemini_api_key` unset: `is_enabled()` false, `generate_guess` raises 503 `missing_api_key`; config endpoint still reports `enabled: false` so the demo page can keep drawing. — [backend/app/config.py](../../backend/app/config.py); [backend/app/services/ai_guesser.py](../../backend/app/services/ai_guesser.py)
- Upstream 429 mapped to `upstream_rate_limited`; may email via `send_limit_alert`. — [backend/app/api/ai_guesser.py](../../backend/app/api/ai_guesser.py)
- Pencil RDP as above; flood-fill has a separate `simplifyContour` unused by the guesser snapshot path except insofar as filled shapes exist on the board. — [frontend/features/whiteboard/floodFill.ts](../../frontend/features/whiteboard/floodFill.ts)

### Inferences
- Cost controls are: small 256 px PNG, `MEDIA_RESOLUTION_LOW`, tiny output budget, minimal thinking, 4 s debounce, 12 looks/turn, and sliding-window quotas — not a cheaper local classifier.
- A research page that reused `POST /ai-guesser/guess` would share the same global 800/day and per-IP budgets as the live game.

### Gaps
- No dollar-per-call or token-price constants in code.
- `changeScore` saturations (`NEW_SHAPE_SATURATION` etc.) are unused by the live scheduler; treating them as current latency controls would be incorrect.

## How are frontend routes organized (App Router), and is there already a /research route or a labs/experiments area?

### Takeaway
Next.js App Router lives under `frontend/app`. There is **no `/research` route** (repo-wide search for `research` in ts/tsx/py/md under product code returned no app route). Closest experiment surfaces: `/ai-guesser/*`, `/labs/*` (precision drawing, not recognition), `/demo`, `/whiteboard`, `/svg`, internal `/ai`.

### Cited Findings
- App Router pages present: `/`, `/ai-guesser`, `/ai-guesser/[game]`, `/ai-guesser/[game]/leaderboard`, `/ai`, `/blog`, `/demo`, `/gallery`, `/labs`, `/labs/[lab]`, `/labs/leaderboard`, `/labs/leaderboard/[lab]`, `/feedback`, `/sign-in`, `/settings`, `/profile`, `/profile/[username]`, `/policies`, `/termsandconditions`, `/svg`, `/loaders`, `/whiteboard`, `/auth/callback`, `/room/[code]`. — glob of `frontend/app/**/page.tsx`
- AI Guesser hub: `frontend/app/ai-guesser/page.tsx` → `AiGuesserHub`. Game segment: weekly slugs `sports|places|motion|pop-culture|wild-card` plus `free-play`. — [frontend/app/ai-guesser/page.tsx](../../frontend/app/ai-guesser/page.tsx); [frontend/app/ai-guesser/[game]/page.tsx](../../frontend/app/ai-guesser/[game]/page.tsx); [frontend/features/ai-guesser/week.ts](../../frontend/features/ai-guesser/week.ts)
- Labs: skill challenges Perfect Circle / Square / Triangle / Infinity Loop; comments say adding a lab is a config slug, not a new page file. Description is drawing precision, not guessing. — [frontend/features/labs/config.ts](../../frontend/features/labs/config.ts); [frontend/app/labs/page.tsx](../../frontend/app/labs/page.tsx)
- `/ai` is an internal AnAI mascot gallery, `index: false`. — [frontend/app/ai/page.tsx](../../frontend/app/ai/page.tsx)
- `/demo` is an offline demo of the multiplayer drawing/guessing game. — [frontend/app/demo/page.tsx](../../frontend/app/demo/page.tsx)
- Frontend API base is `NEXT_PUBLIC_API_URL` (`getApiUrl`); production must set it at build. FastAPI is a separate process, not Next route handlers for Gemini. — [frontend/lib/api.ts](../../frontend/lib/api.ts)
- Workspace grep for `research` as a product path: no matches in `*.{ts,tsx,py,md}` for a research route (this notes folder is the first `research_notes` artifact requested).

### Inferences
- A `/research` page would be a new `frontend/app/research/page.tsx` (and optional `layout.tsx`), following the same pattern as `/labs` or `/demo`: thin page file + feature component.
- Putting recognition experiments under `/labs/[lab]` would collide with the existing precision-geometry meaning of Labs unless the labs registry is extended on purpose.

### Gaps
- No `middleware.ts` inspected for path allowlists; if one exists, a new route’s auth/SEO behavior was not verified here.
- Duplicate glob hits for some page files (OneDrive/tooling) do not change the route set.

## What would have to stay unchanged if a side project page only reads drawings and reports scores?

### Takeaway
The whiteboard shape model, SVG snapshotter, and FastAPI Gemini stack can stay as-is. Weekly match (`run_id`, leaderboards, 70 s clock, secrets) and TTS are optional. A page that only scores drawings locally would not need `POST /ai-guesser/guess` at all; if it did reuse Gemini, quotas and image contract must remain.

### Cited Findings
- Drawing source of truth is `WhiteboardShape[]` fed through `onShapesChange` → engine; snapshot explicitly reuses `shapesToSvgMarkup` from the whiteboard. — [frontend/features/ai-guesser/useAiGuesser.ts](../../frontend/features/ai-guesser/useAiGuesser.ts); [frontend/features/ai-guesser/snapshot.ts](../../frontend/features/ai-guesser/snapshot.ts)
- `POST /ai-guesser/guess` without `run_id` returns `AiGuessResponse` only (no match mutation). Auth required only when `run_id` is set. — [backend/app/api/ai_guesser.py](../../backend/app/api/ai_guesser.py)
- Weekly scoring (`apply_guesses`, `start_run`, leaderboard tables `ai_guesser_runs` / `ai_guesser_scores`) is gated on `run_id`. Free Play uses `/free-play/word` + client `guessesMatchSecret`, not the weekly score tables. — [backend/app/api/ai_guesser.py](../../backend/app/api/ai_guesser.py); [frontend/features/ai-guesser/AiGuesserFreePlay.tsx](../../frontend/features/ai-guesser/AiGuesserFreePlay.tsx)
- Config probe `GET /ai-guesser/config` exposes enabled/model/min interval/tts, never the key. — [backend/app/api/ai_guesser.py](../../backend/app/api/ai_guesser.py)
- Rate limiters wrap **all** `/guess` calls, including free-play and unauthenticated. — [backend/app/api/ai_guesser.py](../../backend/app/api/ai_guesser.py)
- Human room game, chat matching, canvas persistence, and labs geometry metrics are separate modules (`game.py`, `canvas`, `features/labs`).

### Inferences
- Unchanged for a read-only research UI: `Whiteboard` component, shape types, `shapesToSvgMarkup` / 800×800 board, FastAPI `generate_guess` contract (PNG base64, schema, 200 KB cap), env `GEMINI_API_KEY` / `gemini_ai_guesser_model`.
- Can be omitted: `run_id`, weekly packs, TTS `/speak`, AnAI shout UI, room bot, Next routes other than a new page.
- If the side page implements another recognizer, it can read the same raster or the vector shapes without touching Gemini; that would avoid shared 800/day quota. The existing snapshot function already isolates “drawing pixels only.”

### Gaps
- No existing plugin hook or strategy interface for swapping recognizers; a second method would be new code, not a config flag (implementation is out of scope for these notes).
- Auth/cookie requirements for a public research page were not fully traced beyond optional user on `/guess` without `run_id`.
