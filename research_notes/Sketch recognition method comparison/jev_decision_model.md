# Jev (TypeSafe AI) as a sketch-classification comparison arm

**Research date:** 27 October 2026.  
**Verdict in one line:** The product exists and is a hosted, non-generative **text (and experimental-image) decision model** from TypeSafe AI. It can be *one comparison arm* if you treat it as a general-purpose classifier over caller-supplied labels, but it is **not a sketch specialist**, official sketch numbers do not exist, and the vision path is explicitly non-production. Do not confuse it with JEPA.

## What is the canonical product, company, and URL? When was it announced?

### Takeaway
The matching product is **Jev**, TypeSafe AI’s proprietary “System One” decision model, announced 15 September 2026 at [typesafe.ai](https://typesafe.ai/) with docs at [docs.typesafe.ai](https://docs.typesafe.ai/). Current production IDs are `jev-1.14.0` (alias `jev-latest` as of late October 2026) and `jev-1.13.0`.

### Cited Findings
- TypeSafe’s homepage positions Jev as a “System One Model” that produces typed decisions rather than chat, trained with Reinforcement Learning for Calibrated Decisions (RLCD). — [TypeSafe homepage](https://typesafe.ai/)
- Founder Diogo Almeida’s launch post, dated **Sep 15, 2026**, announces the first public System One model, Jev, in early access after ~two years in stealth. The name is after economist William Stanley Jevons. — [Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- ThoughtWorks independently dates the launch to “the middle of September 2026.” — [Jev and the rise of decision models](https://www.thoughtworks.com/insights/blog/generative-ai/jev-decision-models-what-need-know-why) (12 Oct 2026)
- Wikipedia (citing Forbes and TechCrunch) states: developer TypeSafe AI (San Francisco, founded 2024); limited early access **15 September 2026**; **US$40 million seed** led by DCVC; license proprietary; website typesafe.ai. Wikipedia’s “stable release” field still says `jev-1.13.0` and is therefore behind the docs. — [Wikipedia: Jev (AI model)](https://en.wikipedia.org/wiki/Jev_(AI_model))
- TechCrunch (18 Sep 2026) confirms TypeSafe was founded after Almeida left OpenAI; Jev is described as transformer-based, not an LLM, outputting probabilities / “calibrated decisions”; architecture unpublished; trained on synthetic data with RLCD. — [TechCrunch](https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/)
- Jev 1.14.0 was announced **14 October 2026**; TypeSafe said `jev-latest` would move to 1.14.0 about a week later. — [Jev: For the builders AND dreamers](https://typesafe.ai/blog/jev-1-14)
- Official models page (fetched 27 Oct 2026): `jev-1.14.0` is the newest release, available from 14 Oct 2026; alias `jev-latest` **points to `jev-1.14.0`**; `jev-preview` currently points to the same ID; `jev-1.13.0` remains available. — [Models - TypeSafe](https://docs.typesafe.ai/models)
- An independent catalogue first observed `jev-latest` → `jev-1.14.0` on **24 Oct 2026 05:12 UTC** (still `jev-1.13.0` on 23 Oct). — [Shaduf Jev catalogue](https://shaduf.ai/p/jev-catalog/)
- Canonical URLs: marketing [https://typesafe.ai/](https://typesafe.ai/); docs [https://docs.typesafe.ai/](https://docs.typesafe.ai/); API host `https://api.typesafe.ai`; console `https://console.typesafe.ai` (keys at `/keys`, playground at `/playground`). — [Quick start](https://docs.typesafe.ai/introduction/quickstart); [madewithjev access guide](https://madewithjev.com/jev-access)
- `www.jev.ai` is a **domain parking page**, not the product. — [jev.ai](https://www.jev.ai/)

### Inferences
- For a sketch-comparison paper or blog, cite **TypeSafe AI / Jev** (`jev-1.14.0` or pinned `jev-1.13.0`), not “jev.ai.”
- Wikipedia is useful for the seed-round fact but should not be used as the version pin; pin from [docs.typesafe.ai/models](https://docs.typesafe.ai/models).

### Gaps
- No official technical paper, parameter count, or architecture diagram. TechCrunch and Wikipedia both record that TypeSafe has not published weights or a paper.
- Forbes article title on Wikipedia implies a ~$200M valuation; this research did not fetch the Forbes page itself, so valuation is unverified here. Seed amount ($40M, DCVC) is Wikipedia’s citation of Forbes/TechCrunch, not independently re-read from Forbes.

## What does “non-generative decision model” mean in their own words? What tasks do they advertise?

### Takeaway
In TypeSafe’s words, Jev never generates strings: it evaluates a `state` and returns typed answers (choice / score / noul, plus experimental `box`) with probabilities. Advertised tasks are classify, route, score, verify, guardrail, and map-reduce over text—not drawing recognition.

### Cited Findings
- Docs: “System One models make fast, structured decisions for software… Like an LLM, a System One model understands natural-language input. It returns typed decisions and probabilities rather than generated text.” Primitives: Choice, Score, Noul. Name is from Kahneman’s System 1. — [System One](https://docs.typesafe.ai/concepts/system-one)
- Launch post: “Think of Jev as a frontier-intelligence function call: unstructured state in, typed probabilistic decisions out.” “While Jev gives up string generation, it’s optimized for structured outputs and can’t hallucinate.” Use cases listed: smart if-statements (classify, route, score, extract, branch), map-reduce over big data, real-time apps (~100 ms), verify/judge/guardrail LLM traces. — [Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- Homepage FAQ: “Jev is TypeSafe’s first public System One Model, optimized for automation. Send Jev structured questions and get typed decisions with probabilities and confidence that your software can act on.” — [typesafe.ai](https://typesafe.ai/)
- Enterprise page: “Classify, score, and route quickly, at low cost.” Case-study headlines mention candidate screening and classification cost cuts (88% and 98.7% vs prior LLM spend—vendor marketing, not a public dataset). — [Enterprise](https://typesafe.ai/enterprise)
- LangChain (17 Sep 2026) quotes TypeSafe’s System One definition and lists Choice, Score, Noul. — [Building a Harness with Jev](https://www.langchain.com/blog/building-a-harness-with-jev)
- Braintrust: Jev as a “fast decision step or classifier” for intent, quality rating, document relevance; questions in one request are independent (one answer cannot feed another). — [What is Jev? (Braintrust)](https://www.braintrust.dev/articles/what-is-jev)
- Sanity glossary: “you hand it ‘state’ (text or JSON) plus questions defined in code, and it returns choices, scores, or probabilities, with no prose, no code, and no rationale.” Choice up to 255 options; Score 2–10 ordered levels that can land between rungs; Noul is a single 0–1 probability. — [Sanity glossary](https://www.sanity.io/glossary/jev-typesafe-ai-model)
- Independent arXiv evaluation frames Jev as targeting routing, grounding checks, moderation, rubric rating—not generation. — [Evaluating and Benchmarking the System One Model Jev](https://arxiv.org/html/2609.37647v1)

### Inferences
- “Non-generative” here is a **product interface claim** (closed answer set, no free text), not a proof that the backbone is non-transformer. TechCrunch still calls it transformer-based.
- Sketch *classification* maps naturally onto **Choice** (class names as `criteria`). Sketch *captioning* or free-form labels would fight the product: Jev will not emit a class name you did not list.

### Gaps
- TypeSafe’s public jaggedness / failure-mode page (`docs.typesafe.ai/model-jaggedness/jev-1.13`) is cited by the arXiv paper (accessed 2026-09-29) but was not re-fetched in this pass; the paper lists failure modes including counting/math, date comparison, context rot, adversarial content, first-option Choice bias, and no text generation.

## Can it take an image or a sketch, or is it text-only?

### Takeaway
**Text is the documented production path.** Images are an **opt-in preview** (`TypeSafe-Danger-Zone-Images: true`) on Jev 1.13 and 1.14: PNG/JPEG stills, not sketches-as-strokes. TypeSafe does not call image mode production-ready. There is **no official support for stroke/QuickDraw tensors**. If you send a drawing, you must rasterize it (and usually pad to ≥280 px). Do not imply Jev is a sketch model.

### Cited Findings
- Concept page still says: “Jev currently accepts text input only. It evaluates strings, JSON objects, and arrays of text. **Images, audio, and video are not supported (yet).**” — [System One](https://docs.typesafe.ai/concepts/system-one)
- Models table lists **Input: Text** for both 1.13 and 1.14; “It does not accept audio or video.” Images are not mentioned on that table. — [Models](https://docs.typesafe.ai/models)
- Separate Images docs (Dreamer-ready / not production): send `TypeSafe-Danger-Zone-Images: true`. Images go in an `assets` map (PNG or JPEG) and can be referenced from `state`, `instructions`, or `criteria`. Every question type can use images; **Box** (bounding box) needs Jev 1.14. Limits: 16 MiB/file; **280–1568 px** per side; total pixels 78,400–2,458,624; 32 MiB request; still images only; animated PNGs rejected; API **does not resize**—out-of-range images fail the whole request. Image tokens billed at the same input price. — [Images](https://docs.typesafe.ai/go/images)
- 14 Oct 2026 blog: “all models (Jev included) perform worse on multimodality over pure text”; image and Box features are “danger zone” / “too much jaggedness” for production. Surprise claim: `jev-1.13.0` “was multimodal all along.” — [Jev 1.14 blog](https://typesafe.ai/blog/jev-1-14)
- OpenAPI on the API page documents the Images header and a Box example with base64 PNG. — [API reference](https://docs.typesafe.ai/api)
- Launch Doom demo nuance: “The demo is on structured state as a data structure with text, **not on images (yet…)**.” — [Launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- Independent **Quick, Draw!** study (Bartosz Mikulski; pre-image-API, 19 Sep 2026 per JevDirectory): 400 Google-recognized doodles, 10 classes. Jev on **SVG text** ~35% (31–40%); Jev on **base64 PNG as text** ~9% (chance); Sonnet on SVG ~57%; Sonnet **looking at the image** ~91%. Heavy “airplane” bias (209/400). Author’s conclusion: Jev is not a practical sketch classifier in that setup. — [mikulskibartosz.name](https://mikulskibartosz.name/typesafe-jev-guess-what-i-drew); [JevDirectory summary](https://www.jevdirectory.org/resources/mikulski-jev-sketch-benchmark)
- A 20 Oct 2026 gist (11 hand-chosen SOS Draw cases, not a public dataset) reports live-API **canvas PNG** completed-drawing accuracy 83.3% vs 100% on stroke *text descriptions*, ~111 ms image RTT. This is a tiny, non-preregistered sample and should not be treated as a QuickDraw result. — [gist:ajitomatix](https://gist.github.com/ajitomatix/584a2809f9137fa659e91ae60d2dd9ef)

### Inferences
- For a Gemini vs classical-sketch vs Jev bake-off, **fair protocols** are: (1) rasterize sketches to JPEG/PNG, pad to ≥280 px, send with Choice over class names + danger-zone header on `jev-1.14.0`; or (2) send SVG/stroke JSON as **text state** (what Mikulski measured, and where Jev was weak). Mixing these without labeling the modality will mislead.
- Tiny QuickDraw rasters (often ~256 px) **must be padded or upscaled by the caller**; TypeSafe will reject rather than resize.
- Official concept-page “images not supported” is **stale relative to** `/go/images`. Treat `/go/images` + the 1.14 blog as the current vision policy, and the System One note as a production disclaimer that text is the supported product.

### Gaps
- No TypeSafe-published accuracy on sketches, doodles, QuickDraw, TU-Berlin, or Sketchy.
- No independent large-N eval of **jev-1.14 image** mode on doodles (Mikulski predates the public image header; the gist is n=11).
- Audio/video remain unsupported; no stroke-protocol or `.ndjson` QuickDraw input type.

## API shape: auth, endpoints, limits, regions, output types

### Takeaway
Call `POST https://api.typesafe.ai/v1/systemone` with `Authorization: Bearer <API_KEY>`. Outputs are structured labels/scores/probabilities (and experimental boxes), **not free text**. Same weights for every account; no fine-tune API. Default context 64k/32k; long-context and images are header-gated.

### Cited Findings
- Quick start and API: `POST https://api.typesafe.ai/v1/systemone`; `Authorization: Bearer <API_KEY>`; `Content-Type: application/json`. SDKs: Python `typesafe-sdk`, JS `@typesafe-ai/sdk`; env `TYPESAFE_API_KEY`. Also `GET /v1/models`. Playground in the console. — [Quick start](https://docs.typesafe.ai/introduction/quickstart); [API](https://docs.typesafe.ai/api)
- OpenAPI servers url: `https://api.typesafe.ai`. Headers: `TypeSafe-Danger-Zone-Images: true`, `TypeSafe-Danger-Zone-Long-Context: true`. Multipart recommended for images (`request` JSON part + file parts). — [API](https://docs.typesafe.ai/api)
- Request fields: `model`, `state` (string | object | array of text), `questions` (map of Choice / Score / Noul / Box). Response: `model`, `answers` keyed like questions, `usage.input_tokens` / `output_tokens`. Example Choice fields: `choice`, `confidence`, `probabilities`. Score: `score` (can be between levels), `legend`, `probabilities`. Noul: `noul` in [0,1] (no separate confidence). — [Quick start raw response](https://docs.typesafe.ai/introduction/quickstart); [Sanity glossary](https://www.sanity.io/glossary/jev-typesafe-ai-model)
- Errors: 400, 401, 413 (body > 32 MiB), 415, 422, 429, 529 Overloaded. SDKs retry 429/529. — [API](https://docs.typesafe.ai/api); [Models](https://docs.typesafe.ai/models)
- Context: 64k per-request / 32k per-question by default; with long-context header both become **262k** at the same $/token, “slower and less accurate.” No separate cap on number of questions except those token limits. Choice cardinality up to **255**; launch post says higher cardinality uses a two-stage score-then-choose. — [Models](https://docs.typesafe.ai/models); [Launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- “Jev is not fine-tuned or LoRA-adapted with customer data… the same weights serve every account.” Domain adaptation is via `state` / `instructions` / `criteria`. — [Models](https://docs.typesafe.ai/models)
- English is the primary training language; other languages including CJK “handled but not equally well.” — [Models](https://docs.typesafe.ai/models)
- Latency (vendor): **70–500 ms** end-to-end; published evals “generally run from our laptops on the West Coast (this is where our service is currently based).” — [Launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- Status-site reporting (third party): an elevated-latency incident on **`api.us-east-1.typesafe.ai`** 14 Oct 2026; main `api.typesafe.ai` last listed incident 28 Sep; “All services online” as of 24 Oct 2026. — [Shaduf catalogue](https://shaduf.ai/p/jev-catalog/)
- Gateways (not TypeSafe-owned): OpenRouter `typesafe/jev-1.13` / `typesafe/jev-latest`; Vercel AI Gateway `typesafe-ai/jev`; Cloudflare Workers AI `typesafe/jev`; LiteLLM `POST /v1/systemone` and `POST /v1/decisions`. — [madewithjev](https://madewithjev.com/jev-access); [LiteLLM Jev 1.14](https://docs.litellm.ai/blog/typesafe_jev_images)
- No local TypeSafe weights. MCA licenses “TypeSafe-hosted” web interface and API only; restriction against distillation and reverse engineering. — [Master Customer Agreement](https://typesafe.ai/legal/mca); [jevai.fyi open-source note](https://www.jevai.fyi/open-source/)

### Inferences
- For a side project, implement against **TypeSafe’s `/v1/systemone`**, pin `jev-1.14.0` (or 1.13.0 if you need to match Mikulski), and log `response.model` plus `usage`.
- Output for sketch labels would be `answers.<id>.choice` plus a probability vector—clean to score against a closed class set, unlike Gemini free text.

### Gaps
- TypeSafe does not publish a public region matrix (EU residency, etc.). Privacy policy says services are **hosted in the United States**. — [Privacy policy](https://typesafe.ai/legal/privacy)
- Official docs no longer print default numeric rate limits (see next section); per-org values live in the console.
- Whether `POST /v1/decisions` exists on TypeSafe’s own host (vs LiteLLM’s adapter) was not confirmed on docs.typesafe.ai; only `/v1/systemone` and `/v1/models` appear in the fetched OpenAPI.

## Pricing and free tier as of October 2026; published benchmarks; sketches vs other tasks

### Takeaway
List price is **$0.042 per million input tokens**; **output is free**. New TypeSafe accounts **do not get free credits** (since 27 Sep 2026). Vendor speed/cost claims and independent NLP benchmarks are on **text decision tasks**, not sketches. The only sketch-like public study (SVG-as-text) is unfavorable to Jev.

### Cited Findings
- Docs: Jev 1.14 and 1.13 both **$42 / BTok = $0.042 / MTok** input; “Output tokens are free.” — [Models](https://docs.typesafe.ai/models)
- Launch: same $0.042/MTok; “238x cheaper on input than Claude Fable 5.1”; homepage “193.6x Faster, 444.6x Cheaper” on vendor workflow evals; latency 70–500 ms vs 3–329 s for frontier LLMs in their table. TypeSafe is explicit it **cannot prove the price is not subsidized**. Workflow evals were built by TypeSafe’s capabilities team; “some bias could exist.” — [Launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev); [Homepage](https://typesafe.ai/)
- Access: waitlist at launch (15 Sep); “no waitlist” 20 Sep; signups paused 22–27 Sep; reopen 27 Sep **without free credits** for new signups. Console keys at `console.typesafe.ai/keys`. Independent login on 6–8 Oct 2026 saw **$0.00** credits and an “Add funds” billing screen. Catalogue checked **24 Oct 2026**: signups open, no free credit restored. — [madewithjev](https://madewithjev.com/jev-access); [jevainews](https://jevainews.com/news/typesafe-signups-paused/); [Shaduf](https://shaduf.ai/p/jev-catalog/)
- MCA: usage consumes TypeSafe **Credits** (purchased or discretionary promotional); purchased credits expire at term end or 12 months. — [MCA §8](https://typesafe.ai/legal/mca)
- Default rate limits: a 9 Oct 2026 secondary guide still quoted **100,000 tokens/second and 80 requests/second**. After 14 Oct the official models page says only “set per organization” and shown in the console; Shaduf notes the public numbers were removed. — [Developers Digest](https://www.developersdigest.tech/blog/typesafe-jev-system-one-models-release-guide-2026); [Models](https://docs.typesafe.ai/models); [Shaduf](https://shaduf.ai/p/jev-catalog/)
- Independent NLP eval (jev-1.13.0, zero-shot, 37 datasets, 346,009 requests, **under US$10**): IMDB 96.5%, SST-2 96.4%, HellaSwag 95.5%, ARC-Easy 99.3%, ARC-Challenge 97.7%, Belebele 86.7% (122 languages). Beats Qwen3.8-27B on 27/37 and Gemma-4-E4B on 37/37 in that harness. **No sketch or vision datasets.** Choice ECE 0.028 pooled. — [arXiv 2609.37647](https://arxiv.org/html/2609.37647v1)
- Limits paper (jev-1.13.0): ~0.2 s/call; strong on single-record lookup; accuracy falls when the answer needs multi-step state updates (53–80% at sixteen updates); 97.5% on items a reference LLM solves in one forward pass vs 74% otherwise. — [arXiv 2610.24929](https://arxiv.org/html/2610.24929)
- Sketch numbers: Mikulski QuickDraw-as-SVG ~35% vs Sonnet-vision ~91% (see previous section). Not a TypeSafe number.

### Inferences
- Dollar cost of a sketch bake-off is likely **small** if you send compact rasters (independent NLP eval ran 346k text calls for <$10). Image tokens are larger; TypeSafe has not yet published an image-token estimator.
- Do **not** recycle IMDB/SST-2/HellaSwag scores as evidence Jev can label drawings.

### Gaps
- No official free tier amount, student plan, or academic program found on docs/pricing as of this research.
- Homepage proof video / workflow-eval site was not fully scraped; vendor 193.6× / 444.6× figures should be attributed as TypeSafe’s own workflow harness, not an external leaderboard.
- Cloudflare/Vercel gateway pages listing 32k context vs TypeSafe’s 64k/32k split were not re-fetched; treat first-party docs as canonical.

## Practical blockers for a side project

### Takeaway
A student project can get a console API key without a waitlist, but must **pay from the first call**, send data to **US-hosted** servers with **non-zero default retention**, keep images within preview limits, and warrant IP rights in the input. There are **no local TypeSafe weights**. Distilling Jev into your own sketch model is contractually forbidden.

### Cited Findings
- **Key / waitlist:** Signups open as of 27 Sep 2026; no waitlist. New accounts: **no free credits**. Create key in console; Playground needs login but no code. Alternative: OpenRouter / Vercel / Cloudflare / Netlify keys (billed by those providers). — [madewithjev](https://madewithjev.com/jev-access); [Shaduf](https://shaduf.ai/p/jev-catalog/)
- **Retention / training:** Privacy policy (last updated Nov 19, 2025): TypeSafe collects Input (prompts/data); **will not train or fine-tune on Input**; will not disclose Input except to service providers; retains personal data “as long as reasonably necessary”; services **hosted in the U.S.** (EEA/UK users transfer data to the U.S.). — [Privacy policy](https://typesafe.ai/legal/privacy)
- Docs: “Jev is not trained on customer requests or responses.” **Zero data retention (ZDR) is an enterprise add-on.** — [Models](https://docs.typesafe.ai/models); [Enterprise](https://typesafe.ai/enterprise)
- MCA §4.1: TypeSafe may use/store Input to provide the service; may keep Telemetry in perpetuity; **will not put Customer Data in a training dataset without consent**; TypeSafe “under no obligation to store or retain Customer Data and may delete… at any time” after termination—this is **not** a promise of zero-retention during the term. — [MCA](https://typesafe.ai/legal/mca)
- **Third-party dataset images:** AUP §1.1 forbids using the service to “infringe, misappropriate, or violate another person’s intellectual property.” MCA §5: customer **warrants it has all rights/consents** for Input. No clause names “academic datasets,” so legality follows the dataset license (e.g. Quick, Draw! CC-BY-4.0 would typically allow research use if attribution is kept) plus that warranty. — [AUP](https://typesafe.ai/legal/acceptable-use) (page title Acceptable Use Policy, last updated 23 Sep 2026); [MCA §5](https://typesafe.ai/legal/mca)
- **Distillation / competing models:** MCA §2.3(b) forbids using Services or Output to “perform model distillation, train a model to imitate the output of the Services, or develop… a similar or competing product.” Hugging Face `autotrust/JEV` is an independent student of Jev outputs and is **not** TypeSafe. — [MCA](https://typesafe.ai/legal/mca); [autotrust/JEV](https://huggingface.co/autotrust/JEV)
- **Rate limits:** 429 if exceeded; higher limits via sales@typesafe.ai. Public default numbers were withdrawn from docs after mid-October. — [Models](https://docs.typesafe.ai/models)
- **Image preview instability:** request format, answers, and limits “can change between releases.” Min 280 px; no resize. — [Images](https://docs.typesafe.ai/go/images)
- **Capacity history:** TechCrunch reported TypeSafe “briefly lost the ability to serve users” from demand at launch; signups were paused 22–27 Sep. — [TechCrunch](https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/); [madewithjev timeline](https://madewithjev.com/jev-access)
- **Self-host:** no on-prem Jev. Open Jev-*style* local models (Laya, Kev, OpenJev, Ollama `nimble`) are **not** TypeSafe Jev and would confound a “Jev vs Gemini” comparison if substituted. — [jevai.fyi](https://www.jevai.fyi/open-source/); [jev-ai.org download note](https://jev-ai.org/blog/jev-ai-download/)

### Inferences
- Blockers that actually matter for a sketch side project: (1) paid account, (2) US processing of every doodle, (3) experimental vision header and 280 px floor, (4) no ZDR on the hobby tier, (5) pin a model ID because aliases moved in the last week of October.
- Sending CC-licensed QuickDraw rasters for a comparison study is not specifically banned; sending a dataset whose license forbids cloud processing, or scraping Google assets, would collide with AUP/MCA.

### Gaps
- Typical hours-to-key for a brand-new email was not measured in this research (secondary sources describe immediate console signup, not a human review queue).
- Exact hobby-tier TPS/RPS after Oct 14 is only visible inside a logged-in console.
- DPA at typesafe.ai/data-processing was not fetched; ZDR mechanics (hash-and-drop vs no-log) are unspecified in the public models/enterprise blurbs.

## If several products match “Jev”: disambiguation

### Takeaway
The plausible “non-generative decision model” is **TypeSafe AI’s Jev**. Other hits are wrappers, distillations, a parked domain, or unrelated names. **JEPA is not Jev** and no fetched TypeSafe source connects them.

### Cited Findings
| Name | Distinction | Source |
| --- | --- | --- |
| **Jev (TypeSafe AI)** | Canonical System One decision model; `typesafe.ai` / `api.typesafe.ai` | [typesafe.ai](https://typesafe.ai/) |
| **thejevai.com / jev-ai/jev-api** | Independent playground that calls TypeSafe Jev (OpenRouter); **not** the official site; their README still says images unsupported | [GitHub jev-ai/jev-api](https://github.com/jev-ai/jev-api) |
| **jev.ai** | Domain parking / brokerage page | [jev.ai](https://www.jev.ai/) |
| **autotrust/JEV** (Hugging Face) | Unofficial distilled student of TypeSafe Jev 1.13 on Qwen; authors disclaim affiliation | [Hugging Face card](https://huggingface.co/autotrust/JEV) |
| **OpenJev, Kev, Laya, Ollama nimble** | Open-weight *Jev-style* APIs, not TypeSafe weights | [jevai.fyi](https://www.jevai.fyi/open-source/) |
| **JEPA** | Yann LeCun joint-embedding architecture; **no connection found** in TypeSafe, TechCrunch, or Wikipedia Jev pages | (negative: not mentioned in [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev) or [Wikipedia Jev](https://en.wikipedia.org/wiki/Jev_(AI_model))) |

### Inferences
- Comparison writeups should say **“TypeSafe Jev (`jev-1.14.0`)”** once, then “Jev.”
- Using OpenJev/Kev/Laya as a stand-in would answer a different question (open decision-model vs Gemini), not “can Jev be an arm.”

### Gaps
- People/companies named Jev in unrelated industries were not exhaustively catalogued; none of the AI-decision-model searches surfaced a second *decision model* of similar prominence besides TypeSafe and its clones.

## Recommendation for the sketch-classification comparison

### Takeaway
**Include Jev only as a general decision-model baseline, with an explicit modality caveat—not as a peer of classical sketch CNNs or of Gemini vision.** If vision is in-scope, use the danger-zone image API and report it as preview. If you only send stroke text/SVG, prior independent evidence says Jev is a weak doodle classifier.

### Cited Findings
- Choice primitive is exactly closed-set classification with caller-defined labels. — [System One](https://docs.typesafe.ai/concepts/system-one)
- Production docs still center **text**; images are Dreamer-ready and worse than text according to TypeSafe. — [Images](https://docs.typesafe.ai/go/images); [1.14 blog](https://typesafe.ai/blog/jev-1-14)
- Independent QuickDraw-as-text result ~35% vs ~91% vision LLM. — [Mikulski](https://mikulskibartosz.name/typesafe-jev-guess-what-i-drew)
- Strong published numbers are NLP classification/routing, not drawings. — [arXiv 2609.37647](https://arxiv.org/html/2609.37647v1)

### Inferences
- A fair three-way design: **classical sketch model (pixels/strokes) vs Gemini (image) vs Jev Choice**. Run **two Jev conditions** if budget allows: (A) SVG/stroke JSON as `state`; (B) padded PNG + `TypeSafe-Danger-Zone-Images`. Condition A tests “decision model on symbolic strokes”; B tests “preview multimodal Jev.” Do not average them.
- If the comparison’s claim is “modern vision LMs vs sketch specialists,” Jev is optional. If the claim is “do we still need a generative LM to pick a class?,” Jev is on-topic.

### Gaps
- No head-to-head of jev-1.14 **image** Choice vs Gemini vs a Sketch-a-Net/QuickDraw CNN on the same split exists in the sources reviewed.

## Search queries used

- `Jev AI non-generative decision model`
- `Jev AI jev.ai decision model 2025 2026`
- `"Jev" "decision model" artificial intelligence`
- `Jev TypeSafe AI image vision multimodal sketch`
- `TypeSafe AI Jev pricing API key waitlist data retention docs`
- `jev.ai JEV AI company product not TypeSafe`
- `TypeSafe AI Jev waitlist console API key free credits October 2026`
- `Jev TypeSafe sketch recognition QuickDraw image classification benchmark`
- `TypeSafe Jev open weights download local model proprietary`

---

Sources:
- [TypeSafe homepage](https://typesafe.ai/) (2026)
- [Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev) (15 Sep 2026)
- [Jev 1.14 blog](https://typesafe.ai/blog/jev-1-14) (14 Oct 2026)
- [System One docs](https://docs.typesafe.ai/concepts/system-one)
- [Models](https://docs.typesafe.ai/models)
- [Quick start](https://docs.typesafe.ai/introduction/quickstart)
- [API reference](https://docs.typesafe.ai/api)
- [Images](https://docs.typesafe.ai/go/images)
- [Enterprise](https://typesafe.ai/enterprise)
- [Privacy policy](https://typesafe.ai/legal/privacy) (19 Nov 2025)
- [Acceptable Use Policy](https://typesafe.ai/legal/acceptable-use) (23 Sep 2026)
- [Terms of use](https://typesafe.ai/legal/terms) (19 Sep 2026)
- [Master Customer Agreement](https://typesafe.ai/legal/mca)
- [TechCrunch](https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/) (18 Sep 2026)
- [ThoughtWorks](https://www.thoughtworks.com/insights/blog/generative-ai/jev-decision-models-what-need-know-why) (12 Oct 2026)
- [Wikipedia: Jev (AI model)](https://en.wikipedia.org/wiki/Jev_(AI_model))
- [arXiv 2609.37647](https://arxiv.org/html/2609.37647v1)
- [arXiv 2610.24929](https://arxiv.org/html/2610.24929)
- [LangChain](https://www.langchain.com/blog/building-a-harness-with-jev) (17 Sep 2026)
- [Braintrust](https://www.braintrust.dev/articles/what-is-jev)
- [Sanity glossary](https://www.sanity.io/glossary/jev-typesafe-ai-model)
- [Mikulski sketch study](https://mikulskibartosz.name/typesafe-jev-guess-what-i-drew)
- [JevDirectory Mikulski](https://www.jevdirectory.org/resources/mikulski-jev-sketch-benchmark)
- [madewithjev access](https://madewithjev.com/jev-access)
- [Shaduf catalogue](https://shaduf.ai/p/jev-catalog/) (checked 24 Oct 2026)
- [Developers Digest pricing guide](https://www.developersdigest.tech/blog/typesafe-jev-system-one-models-release-guide-2026)
- [jevainews signups](https://jevainews.com/news/typesafe-signups-paused/)
- [LiteLLM Jev 1.14](https://docs.litellm.ai/blog/typesafe_jev_images)
- [jev.ai parking](https://www.jev.ai/)
- [github.com/jev-ai/jev-api](https://github.com/jev-ai/jev-api)
- [jevai.fyi open source](https://www.jevai.fyi/open-source/)
- [Hugging Face autotrust/JEV](https://huggingface.co/autotrust/JEV)
- [gist image vs text (n=11)](https://gist.github.com/ajitomatix/584a2809f9137fa659e91ae60d2dd9ef) (20 Oct 2026)
